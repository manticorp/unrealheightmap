/**
 * Elevation profile along a line drawn on the map: where to sample, which
 * elevation tiles those samples need, and summary numbers for the chart.
 */

export type LatLngPoint = {lat: number, lng: number};

export type ProfileSample = LatLngPoint & {
  /** Distance from the start along the path, metres. */
  distance: number;
};

export type ProfileStats = {
  length: number;
  min: number;
  max: number;
  start: number;
  end: number;
  /** Total climb and descent, ignoring wiggles smaller than the threshold. */
  gain: number;
  loss: number;
  /** Steepest gradient between neighbouring samples, as a percentage. */
  maxGradePercent: number;
};

const R = 6371008.8;
const rad = (d: number) => d * Math.PI / 180;

export const haversine = (a: LatLngPoint, b: LatLngPoint, radius: number = R): number => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * `count` points evenly spaced by distance along the polyline (including both
 * ends). Positions are interpolated linearly in lat/lng within each leg, which
 * is what the straight line drawn on a web map shows for short legs.
 */
export const samplePath = (points: LatLngPoint[], count: number, radius: number = R): ProfileSample[] => {
  if (points.length === 0) return [];
  if (points.length === 1) return [{...points[0], distance: 0}];
  const legs: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1], points[i], radius);
    legs.push(d);
    total += d;
  }
  const n = Math.max(2, Math.floor(count));
  const samples: ProfileSample[] = [];
  let leg = 0;
  let legStart = 0;
  for (let s = 0; s < n; s++) {
    const target = total * s / (n - 1);
    while (leg < legs.length - 1 && legStart + legs[leg] < target) {
      legStart += legs[leg];
      leg++;
    }
    const f = legs[leg] > 0 ? Math.min(1, Math.max(0, (target - legStart) / legs[leg])) : 0;
    const a = points[leg];
    const b = points[leg + 1];
    samples.push({lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, distance: target});
  }
  return samples;
};

/** Fractional slippy tile position (256 px tiles) of a point. */
export const tilePosition = (lat: number, lng: number, zoom: number) => {
  const n = Math.pow(2, zoom);
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const x = ((lng + 180) / 360) * n;
  const y = (1 - Math.log(Math.tan(rad(clampedLat)) + 1 / Math.cos(rad(clampedLat))) / Math.PI) / 2 * n;
  return {x: ((x % n) + n) % n, y: Math.max(0, Math.min(n - 1e-9, y))};
};

/** Group samples by the elevation tile they fall in, so each tile is fetched once. */
export const tilesForSamples = (samples: LatLngPoint[], zoom: number) => {
  const tiles = new Map<string, {x: number, y: number, z: number, indices: number[]}>();
  samples.forEach((s, i) => {
    const p = tilePosition(s.lat, s.lng, zoom);
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    const key = `${x}/${y}`;
    let tile = tiles.get(key);
    if (!tile) {
      tile = {x, y, z: zoom, indices: []};
      tiles.set(key, tile);
    }
    tile.indices.push(i);
  });
  return Array.from(tiles.values());
};

/** Bilinear height at a point inside a 256 × 256 tile of heights. */
export const sampleTile = (heights: Float32Array, tileX: number, tileY: number, lat: number, lng: number, zoom: number, size = 256): number => {
  const p = tilePosition(lat, lng, zoom);
  const fx = Math.min(size - 1, Math.max(0, (p.x - tileX) * size - 0.5));
  const fy = Math.min(size - 1, Math.max(0, (p.y - tileY) * size - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const h = (x: number, y: number) => heights[y * size + x];
  return (h(x0, y0) * (1 - tx) + h(x1, y0) * tx) * (1 - ty) + (h(x0, y1) * (1 - tx) + h(x1, y1) * tx) * ty;
};

/** Zoom whose pixels are about as big as the gap between samples (never finer than maxZoom). */
export const profileZoom = (lengthMetres: number, sampleCount: number, latitude: number, maxZoom: number, radius: number = 6378137) => {
  const spacing = lengthMetres / Math.max(1, sampleCount - 1);
  const atZoom0 = 2 * Math.PI * radius / 256 * Math.cos(rad(latitude));
  const z = Math.ceil(Math.log2(atZoom0 / Math.max(0.5, spacing)));
  return Math.max(1, Math.min(maxZoom, z));
};

export const profileStats = (samples: ProfileSample[], heights: ArrayLike<number>, threshold = 2, minRun = 50): ProfileStats => {
  let min = Infinity, max = -Infinity, gain = 0, loss = 0, maxGrade = 0;
  // Hysteresis: only count a climb/descent once it exceeds the threshold, so DEM noise doesn't inflate totals
  let anchor = heights.length ? heights[0] : 0;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    if (h < min) min = h;
    if (h > max) max = h;
    if (h - anchor >= threshold) { gain += h - anchor; anchor = h; }
    else if (anchor - h >= threshold) { loss += anchor - h; anchor = h; }
    // Measure steepness over at least `minRun` metres, so single noisy samples don't dominate
    let j = i - 1;
    while (j > 0 && samples[i].distance - samples[j].distance < minRun) j--;
    if (j >= 0 && i > 0) {
      const run = samples[i].distance - samples[j].distance;
      if (run > 0) maxGrade = Math.max(maxGrade, Math.abs(h - heights[j]) / run * 100);
    }
  }
  return {
    length: samples.length ? samples[samples.length - 1].distance : 0,
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
    start: heights.length ? heights[0] : 0,
    end: heights.length ? heights[heights.length - 1] : 0,
    gain,
    loss,
    maxGradePercent: maxGrade,
  };
};

/** Round step for axis ticks: 1, 2 or 5 × 10^n, giving about `target` ticks. */
export const niceStep = (range: number, target = 5): number => {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
};

/** CSV text of the profile, for spreadsheets. */
export const profileCsv = (samples: ProfileSample[], heights: ArrayLike<number>): string => {
  const rows = ['distance_m,latitude,longitude,elevation_m'];
  samples.forEach((s, i) => {
    rows.push(`${s.distance.toFixed(1)},${s.lat.toFixed(6)},${s.lng.toFixed(6)},${Number(heights[i]).toFixed(2)}`);
  });
  return rows.join('\n') + '\n';
};
