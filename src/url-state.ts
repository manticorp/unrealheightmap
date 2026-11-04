/**
 * Shareable URL state.
 *
 * Settings live in the URL hash as a short, readable query string, e.g.
 *   #lat=27.98791&lng=86.92529&z=13&oz=12&w=1009&h=1009&norm=smart
 *
 * Location and size are always written; everything else only when it differs
 * from its default, so links stay short. The older "#latitude/27.9/longitude/86.9"
 * slash format is still read so existing bookmarks keep working.
 */

export type SettingKey =
  | 'latitude' | 'longitude' | 'zoom' | 'outputzoom'
  | 'width' | 'height' | 'outputformat' | 'maptype'
  | 'normmode' | 'normfrom' | 'normto'
  | 'tilemode' | 'tilewidth' | 'tileheight' | 'tilecountx' | 'tilecounty'
  | 'tilezip' | 'tilepad' | 'tileunrealname'
  | 'waterlevel' | 'flattenwater' | 'watermask'
  | 'normalmap' | 'slopemap' | 'curvaturemap' | 'heightbands';

type SettingDef = {
  /** Short name used in the URL. */
  param: string;
  /** Value that is left out of the URL. `null` means always write it. */
  default: string | null;
};

export const SETTINGS: Record<SettingKey, SettingDef> = {
  latitude:       {param: 'lat',   default: null},
  longitude:      {param: 'lng',   default: null},
  zoom:           {param: 'z',     default: null},
  outputzoom:     {param: 'oz',    default: null},
  width:          {param: 'w',     default: null},
  height:         {param: 'h',     default: null},
  outputformat:   {param: 'fmt',   default: 'png16'},
  maptype:        {param: 'map',   default: 'topo'},
  normmode:       {param: 'norm',  default: '3'}, // internal value; written as "smart"
  normfrom:       {param: 'nfrom', default: ''},
  normto:         {param: 'nto',   default: ''},
  tilemode:       {param: 'tiles', default: 'off'},
  tilewidth:      {param: 'tw',    default: '1024'},
  tileheight:     {param: 'th',    default: '1024'},
  tilecountx:     {param: 'tx',    default: '1'},
  tilecounty:     {param: 'ty',    default: '1'},
  tilezip:        {param: 'zip',   default: '0'},
  tilepad:        {param: 'pad',   default: '0'},
  tileunrealname: {param: 'ue',    default: '0'},
  waterlevel:     {param: 'water', default: '0'},
  flattenwater:   {param: 'flat',  default: '0'},
  watermask:      {param: 'wmask', default: '0'},
  normalmap:      {param: 'nmap',  default: 'off'},
  slopemap:       {param: 'slope', default: '0'},
  curvaturemap:   {param: 'curv',  default: '0'},
  heightbands:    {param: 'bands', default: ''},
};

const PARAM_TO_KEY: Record<string, SettingKey> = Object.fromEntries(
  (Object.entries(SETTINGS) as [SettingKey, SettingDef][]).map(([key, def]) => [def.param, key])
) as Record<string, SettingKey>;

/** Normalisation mode is a numeric <select> value internally, but a word in the URL. */
const NORM_TO_URL: Record<string, string> = {'0': 'off', '1': 'regular', '3': 'smart'};
const NORM_FROM_URL: Record<string, string> = {off: '0', regular: '1', smart: '3'};

/** Decimal places kept for coordinates: 5 is ~1 m, plenty for a share link. */
const COORD_DECIMALS = 5;

export type SettingValues = Partial<Record<SettingKey, string>>;

const isSettingKey = (key: string): key is SettingKey => Object.prototype.hasOwnProperty.call(SETTINGS, key);

const toUrlValue = (key: SettingKey, value: string): string => {
  if (key === 'latitude' || key === 'longitude') {
    const num = parseFloat(value);
    // Trim trailing zeros so 27.50000 becomes 27.5
    return Number.isFinite(num) ? parseFloat(num.toFixed(COORD_DECIMALS)).toString() : value;
  }
  if (key === 'normmode') {
    return NORM_TO_URL[value] ?? value;
  }
  return value;
};

const fromUrlValue = (key: SettingKey, value: string): string => {
  if (key === 'normmode') {
    return NORM_FROM_URL[value] ?? value;
  }
  return value;
};

/** Build the hash (including the leading "#") for a set of settings. */
export const buildHash = (values: SettingValues): string => {
  const params = new URLSearchParams();
  for (const key of Object.keys(SETTINGS) as SettingKey[]) {
    const value = values[key];
    if (value === undefined || value === null) {
      continue;
    }
    const def = SETTINGS[key];
    if (def.default !== null && value === def.default) {
      continue;
    }
    params.set(def.param, toUrlValue(key, value));
  }
  // URLSearchParams encodes commas; they are safe in a fragment and read better unencoded.
  return '#' + params.toString().replace(/%2C/gi, ',');
};

/** Read settings from a hash. Unknown parameters are ignored. */
export const parseHash = (hash: string): SettingValues => {
  const raw = hash.replace(/^#\/?/, '');
  if (raw === '') {
    return {};
  }
  return raw.includes('=') ? parseQueryHash(raw) : parseLegacyHash(raw);
};

const parseQueryHash = (raw: string): SettingValues => {
  const out: SettingValues = {};
  new URLSearchParams(raw).forEach((value, param) => {
    const key = PARAM_TO_KEY[param] ?? (isSettingKey(param) ? param : undefined);
    if (key) {
      out[key] = fromUrlValue(key, value);
    }
  });
  return out;
};

/** The original format: "latitude/27.9/longitude/86.9/zoom/13/..." */
const parseLegacyHash = (raw: string): SettingValues => {
  const out: SettingValues = {};
  const parts = raw.split('/');
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const key = parts[i];
    if (isSettingKey(key) && parts[i + 1] !== '') {
      out[key] = decodeURIComponent(parts[i + 1]);
    }
  }
  return out;
};
