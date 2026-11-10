/**
 * Human- and machine-readable description of every shareable URL setting.
 *
 * `url-params.json` (served at the site root for agents and developers) is generated from this
 * file plus `SETTINGS` in url-state.ts. Run `npm run docs:agents` after changing either, and
 * `npm test` fails if the two drift apart.
 */
import {SETTINGS, SettingKey} from './url-state';

export type ParamType = 'number' | 'integer' | 'boolean' | 'enum' | 'string';

export type ParamMeta = {
  group: string;
  type: ParamType;
  description: string;
  /** Allowed values, for `enum` types. */
  values?: string[];
  min?: number;
  max?: number;
  unit?: string;
};

const ZERO_ONE = 'Boolean written as 1 (on) or 0 (off).';

const MAP_TYPES = [
  'topo', 'imagery', 'relief', 'natgeo', 'osm', 'osmhot', 'otm', 'opnvkarte', 'usgsusimagery',
  'watercolor', 'nextzen', 'stadiaalidadesatellite', 'stadiasmooth', 'stadiasmoothdark',
  'stadiastamentoner', 'stadiastamentonerbg', 'stadiastamentonerlite',
];

const OSM_LAYER_IDS = [
  'roads', 'paths', 'railways', 'rivers', 'water', 'forest', 'grass', 'farmland', 'scrub',
  'rock', 'glacier', 'sand', 'wetland', 'urban', 'buildings',
];

export const PARAM_META: Record<SettingKey, ParamMeta> = {
  // Location
  latitude:  {group: 'location', type: 'number', min: -90, max: 90, unit: 'degrees', description: 'Centre latitude of the export area, in decimal degrees (WGS84). Written with up to 5 decimals (about 1 m).'},
  longitude: {group: 'location', type: 'number', min: -180, max: 180, unit: 'degrees', description: 'Centre longitude of the export area, in decimal degrees (WGS84).'},
  zoom:      {group: 'location', type: 'integer', min: 0, description: 'Zoom level of the map preview only. It does not change the export.'},
  outputzoom: {group: 'location', type: 'integer', min: 0, max: 18, description: 'Web-map zoom level the heightmap is generated at. Together with width and height it sets the real-world size of the export. Maximum depends on the elevation source: 15 for aws, 18 for mapterhorn, 12 for etopo.'},
  maptype:   {group: 'location', type: 'enum', values: MAP_TYPES, description: 'Map preview style. It is also the imagery used for the albedo export and for textured 3D models.'},
  elevsource: {group: 'elevation', type: 'enum', values: ['aws', 'mapterhorn', 'etopo', 'landsea', 'upload', 'mars', 'gale', 'moon', 'mercury'], description: 'Elevation dataset. aws = AWS Terrain Tiles (Mapzen); mapterhorn = Copernicus 30 m plus lidar where available; etopo = NOAA ETOPO 2022 land and sea floor (~450 m); landsea = Mapterhorn land with ETOPO sea floor; upload = a GeoTIFF or SRTM .hgt file the user supplies in the browser (cannot be set from a link); mars, gale, moon, mercury = planetary data.'},
  width:     {group: 'size', type: 'integer', min: 1, max: 8129, unit: 'pixels', description: 'Output width in pixels.'},
  height:    {group: 'size', type: 'integer', min: 1, max: 8129, unit: 'pixels', description: 'Output height in pixels.'},

  // Heightmap output
  outputformat: {group: 'heightmap', type: 'enum', values: ['png16', 'exr16', 'exr32', 'geotiff'], description: 'Heightmap file format: 16-bit PNG, 16-bit or 32-bit OpenEXR, or 32-bit float GeoTIFF in metres.'},
  normmode:  {group: 'heightmap', type: 'enum', values: ['off', 'regular', 'smart'], description: 'Height normalisation. off keeps raw values, regular stretches min to max to the full range, smart ignores outliers when stretching.'},
  normfrom:  {group: 'heightmap', type: 'number', unit: 'metres', description: 'Optional manual minimum height for normalisation. Empty means automatic.'},
  normto:    {group: 'heightmap', type: 'number', unit: 'metres', description: 'Optional manual maximum height for normalisation. Empty means automatic.'},
  rotation:  {group: 'area', type: 'number', min: -180, max: 360, unit: 'degrees', description: 'Rotate the export area around its centre.'},
  shape:     {group: 'area', type: 'string', description: 'Custom export outline as "lat,lng;lat,lng;..." with at least 3 points. Empty means a plain rectangle.'},

  // Tiles
  tilemode:  {group: 'tiles', type: 'enum', values: ['off', 'dimensions', 'count'], description: 'Split the export into tiles. off = single file, dimensions = tile by pixel size, count = tile by number of tiles.'},
  tilewidth: {group: 'tiles', type: 'integer', unit: 'pixels', description: 'Tile width when tilemode=dimensions.'},
  tileheight: {group: 'tiles', type: 'integer', unit: 'pixels', description: 'Tile height when tilemode=dimensions.'},
  tilecountx: {group: 'tiles', type: 'integer', min: 1, max: 64, description: 'Number of tile columns when tilemode=count.'},
  tilecounty: {group: 'tiles', type: 'integer', min: 1, max: 64, description: 'Number of tile rows when tilemode=count.'},
  tilezip:   {group: 'tiles', type: 'boolean', description: `Bundle tiles into a zip. ${ZERO_ONE}`},
  tilepad:   {group: 'tiles', type: 'boolean', description: `Pad tile edges. ${ZERO_ONE}`},
  tileunrealname: {group: 'tiles', type: 'boolean', description: `Name tiles with the Unreal Engine 5.7+ _x00_y00 convention. ${ZERO_ONE}`},

  // Water
  waterlevel: {group: 'water', type: 'number', unit: 'metres', description: 'Water level in metres. Used by flattenwater and watermask.'},
  flattenwater: {group: 'water', type: 'boolean', description: `Flatten everything below the water level. ${ZERO_ONE}`},
  watermask: {group: 'water', type: 'boolean', description: `Also export a water mask. ${ZERO_ONE}`},
  sealevel:  {group: 'water', type: 'number', unit: 'metres', description: 'Sea-level change to simulate (for example -120 for the last glacial maximum, 70 for all ice melted). 0 is today.'},

  // Texture maps
  normalmap: {group: 'maps', type: 'enum', values: ['off', 'directx', 'opengl'], description: 'Export a normal map. directx for Unreal, opengl for Godot, Blender and Unity.'},
  slopemap:  {group: 'maps', type: 'boolean', description: `Export a slope mask. ${ZERO_ONE}`},
  curvaturemap: {group: 'maps', type: 'boolean', description: `Export a curvature mask. ${ZERO_ONE}`},
  heightbands: {group: 'maps', type: 'string', unit: 'metres', description: 'Comma-separated heights that split the terrain into layer masks, e.g. "500,1500" gives below 500 m, 500 to 1500 m and above 1500 m.'},
  aomap:     {group: 'maps', type: 'boolean', description: `Export an ambient occlusion map. ${ZERO_ONE}`},
  flowmap:   {group: 'maps', type: 'boolean', description: `Export a water flow map. ${ZERO_ONE}`},
  aspectmap: {group: 'maps', type: 'boolean', description: `Export aspect and northness maps. ${ZERO_ONE}`},
  sunmap:    {group: 'maps', type: 'boolean', description: `Export a yearly sunlight map (greyscale, brightest = sunniest) with the heightmap. ${ZERO_ONE}`},
  colorbands: {group: 'maps', type: 'enum', values: ['0', '2', '3', '4', '5', '6'], description: 'Number of colours for banded colour output. 0 means one colour.'},
  bandlevels: {group: 'maps', type: 'string', description: 'Comma-separated heights for colour band edges.'},
  bandcolors: {group: 'maps', type: 'string', description: 'Comma-separated colours for colour bands.'},
  viewheight: {group: 'maps', type: 'number', unit: 'metres', description: 'Observer eye height in metres for the visibility mask.'},

  // OpenStreetMap
  osmlayers: {group: 'openstreetmap', type: 'string', description: `Comma-separated OpenStreetMap mask layers to export. Known ids: ${OSM_LAYER_IDS.join(', ')}.`},
  osmweights: {group: 'openstreetmap', type: 'boolean', description: `Write OSM masks as weightmaps that sum to full white at every pixel plus a base layer, instead of independent masks. ${ZERO_ONE}`},
  carveroads: {group: 'openstreetmap', type: 'boolean', description: `Give roads a flat bed that blends into the hillside. ${ZERO_ONE}`},
  carverail: {group: 'openstreetmap', type: 'boolean', description: `Carve railways into the terrain. ${ZERO_ONE}`},
  carverivers: {group: 'openstreetmap', type: 'boolean', description: `Carve rivers into the terrain. ${ZERO_ONE}`},
  carvelakes: {group: 'openstreetmap', type: 'boolean', description: `Level each lake to a single surface height. ${ZERO_ONE}`},
  carveshoulder: {group: 'openstreetmap', type: 'number', unit: 'metres', description: 'Shoulder width over which a carved feature blends back into the terrain.'},
  carvedepth: {group: 'openstreetmap', type: 'number', min: 0, max: 5, description: 'Carve depth setting, 0 to 5.'},
  buildings: {group: 'openstreetmap', type: 'boolean', description: `Extrude OpenStreetMap building footprints onto the terrain and 3D model (Earth only). ${ZERO_ONE}`},
  buildingheight: {group: 'openstreetmap', type: 'number', unit: 'metres', description: 'Default building height in metres when OSM has no height or level tags.'},
  importscripts: {group: 'engine', type: 'boolean', description: `Include Blender and Unreal import scripts in the export. ${ZERO_ONE}`},
  paint:     {group: 'engine', type: 'string', description: 'Landscape paint rules, encoded by the app. Configure in the UI and copy the link rather than writing by hand.'},
  scatter:   {group: 'engine', type: 'string', description: 'Scatter sets (trees, rocks, bushes), encoded by the app. Configure in the UI and copy the link.'},
  splines:   {group: 'engine', type: 'string', description: 'Road and river spline export options, encoded by the app. Configure in the UI and copy the link.'},
  contourinterval: {group: 'contours', type: 'number', unit: 'metres', description: 'Contour line spacing. Empty disables contour export.'},
  contourmode: {group: 'contours', type: 'enum', values: ['lines', 'layers', 'sheets'], description: 'lines = topo map lines, layers = laser-cut layers in one file, sheets = one SVG per layer in a zip.'},
  contourformat: {group: 'contours', type: 'enum', values: ['svg', 'dxf'], description: 'Contour file format.'},
  contourwidth: {group: 'contours', type: 'number', unit: 'millimetres', description: 'Printed width of the contour SVG in millimetres.'},
  contoursmooth: {group: 'contours', type: 'enum', values: ['0', '1', '2', '4'], description: 'Blur applied before contouring: 0 none, 1 light, 2 medium, 4 strong.'},

  // Seamless
  seammode:  {group: 'seamless', type: 'enum', values: ['off', 'seamcut', 'smooth', 'mirror'], description: 'Make the heightmap tile seamlessly. seamcut is recommended; mirror makes a 2 x 2 mirrored tile.'},
  seamperiod: {group: 'seamless', type: 'enum', values: ['texture', 'landscape'], description: 'texture repeats every N pixels; landscape makes the last row equal the first.'},
  seamoverlap: {group: 'seamless', type: 'number', min: 3, max: 30, description: 'Overlap used by seam cutting, 3 to 30.'},

  // 3D models
  meshformat: {group: 'model', type: 'enum', values: ['stl', 'obj', 'glb', '3mf'], description: '3D model format.'},
  meshres:   {group: 'model', type: 'enum', values: ['128', '256', '512', '1024', '2048'], description: 'Grid resolution of the 3D model.'},
  meshsolid: {group: 'model', type: 'boolean', description: 'Solid with a flat base (1) or top surface only (0).'},
  basethickness: {group: 'model', type: 'number', unit: 'millimetres', description: 'Base thickness for solid models.'},
  meshscale: {group: 'model', type: 'enum', values: ['print', 'real'], description: 'print sizes the model in millimetres using printwidth; real uses real-world metres.'},
  printwidth: {group: 'model', type: 'number', unit: 'millimetres', description: 'Model width when meshscale=print.'},
  exaggeration: {group: 'model', type: 'number', min: 0, description: 'Vertical exaggeration multiplier.'},
  meshsimplify: {group: 'model', type: 'enum', values: ['off', 'low', 'medium', 'high'], description: 'Mesh simplification level. Higher gives smaller files.'},
  meshtexture: {group: 'model', type: 'enum', values: ['none', 'map'], description: 'Drape the maptype imagery over the model (GLB and OBJ).'},
  texturesize: {group: 'model', type: 'enum', values: ['1024', '2048', '4096', '8192'], description: 'Texture size in pixels when meshtexture=map.'},
  label:     {group: 'model', type: 'boolean', description: `Add a raised label (place name and coordinates) on a plinth along the front edge. Solid STL or 3MF models only. ${ZERO_ONE}`},
  labeltext: {group: 'model', type: 'string', description: 'Label text.'},
  lithophane: {group: 'model', type: 'boolean', description: `Export a thin lithophane plate whose thickness follows the hillshade instead of a relief model. ${ZERO_ONE}`},
  lithomin:  {group: 'model', type: 'number', min: 0.4, unit: 'millimetres', description: 'Thinnest lithophane thickness.'},
  lithomax:  {group: 'model', type: 'number', min: 1, unit: 'millimetres', description: 'Thickest lithophane thickness.'},

  // Trees
  treemap:   {group: 'trees', type: 'boolean', description: `Export a treemap showing where real trees are (Swiss 1 m canopy heights, else ESA WorldCover 10 m). ${ZERO_ONE}`},
  treemin:   {group: 'trees', type: 'number', unit: 'metres', description: 'Minimum tree height to include.'},
  treedensity: {group: 'trees', type: 'number', description: 'Tree density setting for treemap placement.'},
  treespacing: {group: 'trees', type: 'number', unit: 'metres', description: 'Minimum spacing between trees.'},
  treeleaf:  {group: 'trees', type: 'enum', values: ['conifer', 'broadleaf', 'mixed'], description: 'Leaf type assumed for the treemap.'},
  treeswiss: {group: 'trees', type: 'boolean', description: `Use Swiss 1 m canopy heights where available. ${ZERO_ONE}`},

  // Posters
  posterstyle: {group: 'poster', type: 'enum', values: ['classic', 'swiss', 'dark', 'blueprint', 'vintage', 'mars'], description: 'Poster colour theme.'},
  posterpaper: {group: 'poster', type: 'enum', values: ['a4', 'a3', 'a2', 'a1', 'square', 'screen', 'custom'], description: 'Poster paper size. custom uses posterwidth, posterheight and posterunit.'},
  posterdpi: {group: 'poster', type: 'enum', values: ['100', '150', '200', '300'], description: 'Poster resolution in dots per inch.'},
  postertitle: {group: 'poster', type: 'string', description: 'Poster title text.'},
  postercontours: {group: 'poster', type: 'enum', values: ['auto', '0', '10', '20', '50', '100', '200', '500', '1000'], description: 'Poster contour spacing in metres. auto picks one; 0 means none.'},
  posterz:   {group: 'poster', type: 'number', min: 0.5, max: 10, description: 'Poster relief exaggeration.'},
  posterwidth: {group: 'poster', type: 'number', description: 'Custom poster width in posterunit when posterpaper=custom.'},
  posterheight: {group: 'poster', type: 'number', description: 'Custom poster height in posterunit when posterpaper=custom.'},
  posterunit: {group: 'poster', type: 'enum', values: ['mm', 'cm', 'in'], description: 'Unit for custom poster size.'},
  postercredit: {group: 'poster', type: 'boolean', description: `Include a small credit line in the bottom margin. ${ZERO_ONE}`},
  posterqr:  {group: 'poster', type: 'boolean', description: `Include a QR code that reopens this area and these settings. ${ZERO_ONE}`},
};

/** The public spec written to `url-params.json`. */
export const buildUrlParamsSpec = (): object => ({
  $comment: 'Generated by `npm run docs:agents` from src/url-state.ts and src/url-params-meta.ts. Do not edit by hand.',
  title: '16/32 Bit Heightmap Generator: URL settings',
  description: 'Every setting lives in the URL hash as key=value pairs, e.g. https://manticorp.github.io/unrealheightmap/#lat=36.18&lng=-112.02&z=10&oz=14&w=8129&h=8129&norm=smart. Opening the link loads the settings; the user then clicks the Generate button. Settings equal to their default may be left out. Unknown parameters are ignored.',
  baseUrl: 'https://manticorp.github.io/unrealheightmap/',
  parameters: (Object.keys(SETTINGS) as SettingKey[]).map(key => {
    const def = SETTINGS[key];
    const meta = PARAM_META[key];
    return {
      param: def.param,
      legacyName: key,
      group: meta.group,
      type: meta.type,
      required: def.default === null,
      default: def.default === null ? null : defaultForSpec(key, def.default),
      ...(meta.values ? {values: meta.values} : {}),
      ...(meta.min !== undefined ? {min: meta.min} : {}),
      ...(meta.max !== undefined ? {max: meta.max} : {}),
      ...(meta.unit ? {unit: meta.unit} : {}),
      description: meta.description,
    };
  }),
});

/** normmode is stored as a number internally but the URL uses words. */
const defaultForSpec = (key: SettingKey, value: string): string =>
  key === 'normmode' ? ({'0': 'off', '1': 'regular', '3': 'smart'}[value] ?? value) : value;
