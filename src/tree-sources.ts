/**
 * Real tree data for the treemap, read straight from cloud-optimised GeoTIFFs:
 *
 * - ESA WorldCover 2021 (10 m, worldwide): the "tree cover" class, via
 *   Microsoft's Planetary Computer (free, needs a short-lived read token).
 * - Swiss National Forest Inventory vegetation height model (1 m, Switzerland):
 *   real canopy heights from swisstopo's yearly aerial surveys. Each year's
 *   file only covers the strips flown that year (other tiles are empty), so
 *   the newest data is taken tile by tile, falling back to older years.
 *
 * Tiles are fetched and decoded here rather than with geotiff's readRasters,
 * which fails on the empty ("sparse") tiles the Swiss files rely on.
 */

import {Limiter} from './elevation';
import {TreeRaster, lv95ToWgs84, wgs84ToLv95} from './trees';

type BBox = {south: number, north: number, west: number, east: number};

type CogLevel = {
  fd: any;
  width: number;
  height: number;
  tileW: number;
  tileH: number;
  across: number;
  resX: number;
  resY: number;
};

type Cog = {url: string, query: string, levels: CogLevel[], originX: number, originY: number, noData: number | null, float: boolean};

/** Progress for the slow downloads: a message and how far along (0–1). */
export type TreeProgress = (message: string, fraction: number) => void;

/** Most pixels a single tree raster may have (about 64 MB of floats). */
export const TREE_RASTER_MAX_PIXELS = 4096 * 4096;

const limiter = new Limiter(8);
const cogs = new Map<string, Promise<Cog | null>>();

const openCog = (url: string, query = ''): Promise<Cog | null> => {
  const key = url;
  let open = cogs.get(key);
  if (!open) {
    open = (async () => {
      const {fromUrl} = await import(/* webpackChunkName: "geotiff" */ 'geotiff');
      let tiff;
      try {
        tiff = await fromUrl(query ? `${url}?${query}` : url);
      } catch (e) {
        // Missing tiles (open sea for WorldCover) simply have no trees
        return null;
      }
      const count = await tiff.getImageCount();
      const main = await tiff.getImage(0);
      const [resX, resY] = main.getResolution();
      const [originX, originY] = main.getOrigin();
      const levels: CogLevel[] = [];
      for (let i = 0; i < count; i++) {
        const image = i === 0 ? main : await tiff.getImage(i);
        const width = image.getWidth(), height = image.getHeight();
        const tileW = image.getTileWidth(), tileH = image.getTileHeight();
        levels.push({
          fd: image.fileDirectory, width, height, tileW, tileH, across: Math.ceil(width / tileW),
          resX: resX * main.getWidth() / width, resY: Math.abs(resY) * main.getHeight() / height,
        });
      }
      const fd = main.fileDirectory;
      return {url, query, levels, originX, originY, noData: main.getGDALNoData(), float: fd.SampleFormat?.[0] === 3 || fd.SampleFormat === 3};
    })();
    open.catch(() => cogs.delete(key));
    cogs.set(key, open);
  }
  return open;
};

/** Coarsest level still at least as detailed as `target` (in the file's units), within the pixel budget. */
const pickLevel = (cog: Cog, target: number, spanX: number, spanY: number): number => {
  let index = 0;
  cog.levels.forEach((l, i) => { if (l.resX <= target * 1.001) index = i; });
  while (index < cog.levels.length - 1) {
    const l = cog.levels[index];
    if ((spanX / l.resX) * (spanY / l.resY) <= TREE_RASTER_MAX_PIXELS) break;
    index++;
  }
  return index;
};

/**
 * Read a window of one level into `out` (row-major, `w` wide), only filling
 * pixels that are still NaN, so older data can fill gaps left by newer data.
 */
const readWindow = async (cog: Cog, levelIndex: number, col0: number, row0: number, w: number, h: number, out: Float32Array, signal?: AbortSignal, onTile?: (done: number, total: number) => void) => {
  const {getDecoder} = await import(/* webpackChunkName: "geotiff" */ 'geotiff');
  const level = cog.levels[levelIndex];
  const fd = level.fd;
  const offsets: ArrayLike<number> = fd.TileOffsets;
  const counts: ArrayLike<number> = fd.TileByteCounts;
  const decoder = await getDecoder(fd);
  const bits : number = fd.BitsPerSample?.[0] ?? 8;
  const tx0 = Math.max(0, Math.floor(col0 / level.tileW)), tx1 = Math.min(level.across - 1, Math.floor((col0 + w - 1) / level.tileW));
  const ty0 = Math.max(0, Math.floor(row0 / level.tileH)), ty1 = Math.min(Math.ceil(level.height / level.tileH) - 1, Math.floor((row0 + h - 1) / level.tileH));
  const url = cog.query ? `${cog.url}?${cog.query}` : cog.url;
  const jobs: Promise<void>[] = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const index = ty * level.across + tx;
      const offset = offsets[index], length = counts[index];
      if (!length) continue;
      jobs.push(limiter.run(async () => {
        const res = await fetch(url, {headers: {Range: `bytes=${offset}-${offset + length - 1}`}, signal});
        if (!res.ok) throw new Error(`Tree data tile failed: ${res.status}`);
        const raw = await decoder.decode(fd, await res.arrayBuffer());
        const tile = cog.float ? new Float32Array(raw) : bits === 16 ? new Uint16Array(raw) : new Uint8Array(raw);
        const left = tx * level.tileW, top = ty * level.tileH;
        for (let y = 0; y < level.tileH; y++) {
          const oy = top + y - row0;
          if (oy < 0 || oy >= h) continue;
          for (let x = 0; x < level.tileW; x++) {
            const ox = left + x - col0;
            if (ox < 0 || ox >= w) continue;
            const o = oy * w + ox;
            if (!Number.isNaN(out[o])) continue;
            const v = tile[y * level.tileW + x];
            if (cog.noData !== null && (v === cog.noData || (cog.float && v < -1e30))) continue;
            out[o] = v;
          }
        }
        onTile?.(++done, jobs.length);
      }));
    }
  }
  let done = 0;
  onTile?.(0, jobs.length);
  await Promise.all(jobs);
};

/* ------------------------------ ESA WorldCover ------------------------------ */

let worldCoverToken: {token: string, expires: number} | null = null;

const worldCoverQuery = async (): Promise<string> => {
  if (worldCoverToken && worldCoverToken.expires > Date.now() + 60000) return worldCoverToken.token;
  const res = await fetch('https://planetarycomputer.microsoft.com/api/sas/v1/token/esa-worldcover');
  if (!res.ok) throw new Error('Could not get access to ESA WorldCover.');
  const json = await res.json();
  const expiry = Date.parse(json['msft:expiry'] ?? '') || Date.now() + 30 * 60000;
  worldCoverToken = {token: json.token, expires: Math.min(expiry, Date.now() + 30 * 60000)};
  return worldCoverToken.token;
};

const worldCoverTileName = (lat: number, lng: number) => {
  const la = Math.floor(lat / 3) * 3, lo = Math.floor(lng / 3) * 3;
  const ns = la >= 0 ? `N${String(la).padStart(2, '0')}` : `S${String(-la).padStart(2, '0')}`;
  const ew = lo >= 0 ? `E${String(lo).padStart(3, '0')}` : `W${String(-lo).padStart(3, '0')}`;
  return {la, lo, url: `https://ai4edataeuwest.blob.core.windows.net/esa-worldcover/v200/2021/map/ESA_WorldCover_10m_2021_v200_${ns}${ew}_Map.tif`};
};

/** WorldCover land-cover classes over the box, at about `metresPerPixel` (never finer than 10 m). */
export const fetchWorldCover = async (box: BBox, metresPerPixel: number, signal?: AbortSignal, progress?: TreeProgress): Promise<TreeRaster | null> => {
  progress?.('Connecting to ESA WorldCover…', 0);
  const query = await worldCoverQuery();
  const latMid = (box.south + box.north) / 2;
  const targetDeg = Math.max(1 / 12000, metresPerPixel / (111320 * Math.cos(latMid * Math.PI / 180)));
  const spanX = box.east - box.west, spanY = box.north - box.south;
  // All 3° tiles share a grid, so pick the level from the first one
  const tiles: {la: number, lo: number, url: string}[] = [];
  for (let la = Math.floor(box.south / 3) * 3; la < box.north; la += 3) {
    for (let lo = Math.floor(box.west / 3) * 3; lo < box.east; lo += 3) tiles.push(worldCoverTileName(la + 0.5, lo + 0.5));
  }
  progress?.('Opening ESA WorldCover tree cover…', 0.05);
  const opened = await Promise.all(tiles.map(t => openCog(t.url, query)));
  const first = opened.find(Boolean);
  if (!first) return null;
  const levelIndex = pickLevel(first, targetDeg, spanX, spanY);
  const res = first.levels[levelIndex].resX;
  const west = Math.floor(box.west / res) * res, north = Math.ceil(box.north / res) * res;
  const width = Math.max(1, Math.ceil((box.east - west) / res)), height = Math.max(1, Math.ceil((north - box.south) / res));
  const data = new Float32Array(width * height).fill(NaN);
  const tileCounts = opened.map(() => ({done: 0, total: 0}));
  const report = () => {
    const done = tileCounts.reduce((a, t) => a + t.done, 0), total = tileCounts.reduce((a, t) => a + t.total, 0);
    if (total) progress?.(`Reading tree cover: ${done} of ${total} tiles`, 0.1 + 0.9 * done / total);
  };
  await Promise.all(opened.map(async (cog, k) => {
    if (!cog || cog.levels.length <= levelIndex) return;
    const l = cog.levels[levelIndex];
    const col0 = Math.round((west - cog.originX) / l.resX), row0 = Math.round((cog.originY - north) / l.resY);
    const sub = new Float32Array(width * height).fill(NaN);
    await readWindow(cog, levelIndex, col0, row0, width, height, sub, signal, (done, total) => { tileCounts[k] = {done, total}; report(); });
    for (let i = 0; i < sub.length; i++) if (Number.isNaN(data[i]) && !Number.isNaN(sub[i])) data[i] = sub[i];
  }));
  return {kind: 'cover', crs: '4326', data, width, height, originX: west, originY: north, resX: res, resY: res, label: `ESA WorldCover 2021 (${Math.max(10, Math.round(res * 111320 / 10) * 10)} m)`};
};

/* -------------------------- Swiss vegetation height -------------------------- */

/** Rough outline of Switzerland, to skip the Swiss data elsewhere. */
export const SWISS_BOUNDS = {south: 45.8, north: 47.83, west: 5.94, east: 10.5};

export const VHM_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];

const vhmUrl = (year: number) =>
  `https://data.geo.admin.ch/ch.bafu.landesforstinventar-vegetationshoehenmodell/landesforstinventar-vegetationshoehenmodell_${year}/landesforstinventar-vegetationshoehenmodell_${year}_stereo_2056.tif`;

export const overlapsSwitzerland = (box: BBox) =>
  box.east > SWISS_BOUNDS.west && box.west < SWISS_BOUNDS.east && box.north > SWISS_BOUNDS.south && box.south < SWISS_BOUNDS.north;

/** Canopy heights (m) over the box, newest survey first, at about `metresPerPixel` (never finer than 1 m). */
export const fetchSwissCanopy = async (box: BBox, metresPerPixel: number, signal?: AbortSignal, progress?: TreeProgress): Promise<TreeRaster | null> => {
  if (!overlapsSwitzerland(box)) return null;
  const corners = [[box.south, box.west], [box.south, box.east], [box.north, box.west], [box.north, box.east]].map(([la, lo]) => wgs84ToLv95(la, lo));
  const minE = Math.min(...corners.map(c => c[0])) - 20, maxE = Math.max(...corners.map(c => c[0])) + 20;
  const minN = Math.min(...corners.map(c => c[1])) - 20, maxN = Math.max(...corners.map(c => c[1])) + 20;
  let openedCount = 0;
  progress?.(`Opening Swiss canopy surveys: 0 of ${VHM_YEARS.length}`, 0);
  const surveys = (await Promise.all(VHM_YEARS.map(year => openCog(vhmUrl(year)).catch(() => null).then(cog => {
    openedCount++;
    progress?.(`Opening Swiss canopy surveys: ${openedCount} of ${VHM_YEARS.length}`, 0.25 * openedCount / VHM_YEARS.length);
    return {year, cog};
  })))).filter((s): s is {year: number, cog: Cog} => !!s.cog);
  if (!surveys.length) return null;
  const levelIndex = pickLevel(surveys[0].cog, Math.max(1, metresPerPixel), maxE - minE, maxN - minN);
  const l0 = surveys[0].cog.levels[levelIndex];
  const res = l0.resX;
  const west = Math.floor(minE / res) * res, north = Math.ceil(maxN / res) * res;
  const width = Math.ceil((maxE - west) / res), height = Math.ceil((north - minN) / res);
  const data = new Float32Array(width * height).fill(NaN);
  let used = 0;
  for (let k = 0; k < surveys.length; k++) {
    const {year, cog} = surveys[k];
    const l = cog.levels[levelIndex];
    if (!l) continue;
    const before = countNaN(data);
    const base = 0.25 + 0.75 * k / surveys.length, span = 0.75 / surveys.length;
    progress?.(`Reading canopy heights from the ${year} survey (${res} m)…`, base);
    await readWindow(cog, levelIndex, Math.round((west - cog.originX) / l.resX), Math.round((cog.originY - north) / l.resY), width, height, data, signal,
      (done, total) => { if (total) progress?.(`Reading canopy heights from the ${year} survey: ${done} of ${total} tiles`, base + span * done / total); });
    if (countNaN(data) < before) used++;
    if (countNaN(data) === 0) break;
  }
  progress?.('Canopy heights read', 1);
  if (countNaN(data) === data.length) return null;
  return {kind: 'height', crs: '2056', data, width, height, originX: west, originY: north, resX: res, resY: res, label: `Swiss NFI vegetation height (${res} m${used > 1 ? `, ${used} survey years` : ''})`};
};

const countNaN = (a: Float32Array) => {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (Number.isNaN(a[i])) n++;
  return n;
};

/**
 * Everything available for the box: Swiss canopy heights where they exist, WorldCover everywhere.
 * `singleTrees` reads the canopy at full 1 m detail (as far as the size limit allows), which
 * picking out single trees needs; otherwise it is read at about the output's detail.
 */
export const fetchTreeRasters = async (box: BBox, metresPerPixel: number, options: {swiss: boolean, singleTrees?: boolean}, signal?: AbortSignal, progress?: TreeProgress): Promise<TreeRaster[]> => {
  // Both downloads run at once; report the slower one's message with their combined progress
  const useSwiss = options.swiss && overlapsSwitzerland(box);
  const parts = {swiss: useSwiss ? 0 : 1, cover: 0};
  const messages = {swiss: '', cover: ''};
  const report = (part: 'swiss' | 'cover') => (message: string, fraction: number) => {
    parts[part] = fraction;
    messages[part] = message;
    const total = useSwiss ? parts.swiss * 0.75 + parts.cover * 0.25 : parts.cover;
    const shown = useSwiss && parts.swiss < 1 ? messages.swiss : parts.cover < 1 ? messages.cover : message;
    progress?.(shown, total);
  };
  const [swiss, cover] = await Promise.all([
    useSwiss ? fetchSwissCanopy(box, options.singleTrees ? 1 : metresPerPixel, signal, report('swiss')).catch(e => { console.warn('Swiss canopy failed', e); return null; }) : Promise.resolve(null),
    fetchWorldCover(box, metresPerPixel, signal, report('cover')),
  ]);
  return [swiss, cover].filter((r): r is TreeRaster => !!r);
};

export {lv95ToWgs84};
