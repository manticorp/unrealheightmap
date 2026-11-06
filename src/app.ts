import PNG from "./png";
import NextZen from "./nextzen";
import UPNG from "./UPNG";
import { encodeExr, ExrPixelType } from "./exr";
import { mapHeightSamplesToExr } from "./exr-conversion";
import { encodeGeoTiff } from "./tiff";
import { UploadedDemSource, loadDemFile } from "./dem-import";
import { BODY_HOME, BODY_RADIUS, Body, EtopoSource, PLANETS, PlanetSource } from "./extra-sources";
import $ from "jquery";
import { throttle, debounce } from 'throttle-debounce';
import * as  L from "leaflet";
import "leaflet-providers";
import {format, promiseAllInBatches} from "./helpers";
import {trackEvent, trackControl, trackDebounced} from "./analytics";
import {countDonatePrompt} from "./donate-prompt";
import tippy from 'tippy.js';
import JSZip from 'jszip';
import {SETTINGS, SettingKey, SettingValues, buildHash, parseHash} from "./url-state";
import {DerivedMap, DerivedMapOptions, NormalMapConvention, ProcessOptions, parseHeightBands, wantsDerivedMaps} from "./derived-maps";
import {PlaceSearch} from "./place-search";
import {MeshFormat, MeshOptions, MeshScale, MeshInput, SimplifyPreset, defaultMeshOptions, estimateFileBytes, estimateSimplifiedTriangles, meshGridSize, triangleCount} from "./mesh";
import type {TerrainPreview, PreviewMeshData} from "./preview3d";
import {AwsTerrainSource, ElevationSource, ElevationSourceId, MapterhornSource, metresPerPixel} from "./elevation";
import {ProfileTool} from "./profile-ui";
import {sunDirectionZUp, sunPosition, sunTimes} from "./sun";
import {ScriptTile, buildImportScripts} from "./import-scripts";
import {OSM_LAYERS, OSM_MAX_AREA_KM2, OsmFeature, OsmGrid, bboxAreaKm2, fetchOsmLayers, gridBBox, osmAttribution} from "./osm-layers";
import {Tabs, section, sectionStatus, field, grid, selectInput, selectControl, numberInput, textInput, checkbox, button, note, info, tippyDefaults} from "./ui";
import {PainterEditor, ScatterEditor} from "./painter-ui";
import {PaintSettings, decodePaint, encodePaint, paintOsmLayers} from "./painter";
import {ScatterSet, decodeScatter, encodeScatter} from "./scatter";
import {LeafType, TreeRaster, TreeSettings, defaultTreeSettings} from "./trees";
import {fetchTreeRasters, overlapsSwitzerland} from "./tree-sources";
import {SeamlessOptions, SEAMLESS_MAX_PIXELS, seamlessMargin, seamScore} from "./seamless";
import {CarveOptions, carveLayers, wantsCarve} from "./carve";
import {SPLINE_LAYERS} from "./splines";
import {ResampleSpec, decodeShape, encodeShape, normaliseAngle, resampleRotatedRgba, rotateOut, rotatedBounds, rotatedCorners} from "./area";
import {LengthUnit, MM_PER_UNIT, POSTER_MAX_PIXELS, POSTER_MAX_SIDE, POSTER_THEMES, PaperSize, PosterStyle, niceDistance, pagePixels, posterQrUrl, qrColours, qrModules} from "./poster";
import {AreaPlan, ExtendedProcessOptions, MeshExtras, PipelineExtras, TerrainOps, TextFile} from "./processor";
import {LandSeaSource, SOURCE_HOME} from "./extra-sources";
import {HillshadeLayer} from "./hillshade-layer";

import * as Comlink from 'comlink';
import {
  NormaliseResult,
  NormRange,
  normDefaults,
  normMaxRange,
  ProcessorWorker,
  ProcessorProgressUpdate,
  ContourJob,
  ContourResult,
} from './processor';

const worker = new Worker("public/dist/js/processor.js");
const processor = Comlink.wrap<ProcessorWorker>(worker);

import {
  TypedArray,
  TileCoords,
  LatLng,
  LatLngZoom,
  ConfigState,
  TileLoadState,
  NormaliseMode,
  roll,
  roundDigits,
  localFormatNumber,
  clamp
} from "./helpers";

type AppArgs = {
  container: HTMLElement
};

type Tab = any;
type Del = any;

interface Dictionary<T> {
  [key: string]: T;
}

type AppEls = Dictionary<JQuery<HTMLElement>>;

type AppInputs = Dictionary<JQuery<HTMLInputElement>|JQuery<HTMLSelectElement>>;

type StoredItemValue = {
  key: string,
  data: string,
  expires: number
}

type ImageLocation = TileCoords;

type TileExportMode = 'off' | 'dimensions' | 'count';

type TileExportConfig = {
  enabled: boolean;
  mode: TileExportMode;
  tileWidth: number;
  tileHeight: number;
  tilesX: number;
  tilesY: number;
};

type TileSliceInfo = {
  width: number;
  height: number;
  startX: number;
  startY: number;
  row: number;
  column: number;
  totalRows: number;
  totalColumns: number;
};

type TileSlice = TileSliceInfo & {
  data: Float32Array;
};

type StreamingSummary = {
  count: number;
  minBefore: number;
  maxBefore: number;
  minAfter: number;
  maxAfter: number;
};

let currentRequests: XMLHttpRequest[] = [];

const TABS = [
  {id: 'area', label: 'Area', icon: '◱'},
  {id: 'terrain', label: 'Terrain', icon: '⛰'},
  {id: 'layers', label: 'Layers', icon: '◩'},
  {id: 'analysis', label: 'Analysis', icon: '◔'},
  {id: 'model', label: '3D & Print', icon: '⬢'},
  {id: 'export', label: 'Export', icon: '⤓'},
  {id: 'results', label: 'Results', icon: '✓'},
];

/** Summary of Mapterhorn's sources (https://download.mapterhorn.com/attribution.json). */
const MAPTERHORN_COVERAGE_HTML = `<details class="coverage-details">
<summary>Where is Mapterhorn detailed?</summary>
<p>Everywhere has <b>Copernicus GLO-30</b> (30 m). On top of that, Mapterhorn adds national lidar and terrain models:</p>
<ul>
<li><b>0.25 to 0.5 m</b>: Switzerland, Zürich (0.25 m), Baden-Württemberg (0.25 m), Denmark (0.4 m), France (LiDAR HD, where flown), Wallonia, Luxembourg, mainland Portugal, Romania, parts of Spain, Saba, St Eustatius and Bonaire.</li>
<li><b>1 m</b>: most of the USA (USGS 3DEP), England, Scotland, Wales, all of Germany, Austria (1 m in Salzburg, Upper Austria and Carinthia), Flanders, Norway, Sweden, Estonia, Poland, Slovenia, Slovakia, Cyprus, New Zealand, metropolitan France and its overseas regions, parts of Japan and Sardinia.</li>
<li><b>2 to 5 m</b>: Canada, Finland, Spain, Czechia, Greenland, Australia (5 m lidar areas), Tasmania, Aosta Valley, South Tyrol, Lombardy, Piedmont, Trentino, Sicily, Burgenland, the Netherlands (5 m), and much of Japan.</li>
<li><b>10 to 20 m</b>: the rest of the USA (10 m), the rest of Italy (TINITALY), Iceland, Israel, Madeira, the Faroe Islands, Rwanda, Taiwan, Latvia and Svalbard.</li>
</ul>
<p>Elsewhere (most of Africa, Asia, South America and the oceans' islands) it is the 30 m Copernicus model, which is a surface model, so forests and buildings show as bumps. Higher output zooms there are upscaled, not more detailed. After each export, the result shows how detailed the source really was.</p>
<p>Full list: <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">mapterhorn.com/attribution</a>.</p>
</details>`;

const deafultTippyOptions = tippyDefaults;

export default class App {
  static cache : Record<string, any> = {};
  container: HTMLElement;
  els: AppEls = {};
  inputs: AppInputs = {};
  imagesLoaded : ImageLocation[] = []
  defaultSizes : string[] = [
    '8129 x 8129',
    '4033 x 4033',
    '2017 x 2017',
    '1009 x 1009',
    '505 x 505',
    '253 x 253',
    '127 x 127',
  ];
  powerOfTwoSizes : string[] = [
    '32 x 32',
    '64 x 64',
    '128 x 128',
    '256 x 256',
    '512 x 512',
    '1024 x 1024',
    '2048 x 2048',
    '4096 x 4096',
    '8192 x 8192',
    '16384 x 16384',
  ];
  meterFormatter : Intl.NumberFormat;
  map : L.Map;
  mapMarker : L.Marker;
  zoom: {in: L.Marker, out: L.Marker} = {in: null, out: null};
  arrows : L.Marker[] = [];
  shiftHeld: boolean = false;
  boundingRect : L.Polygon;
  layers: Record<string, {layer:L.GridLayer, label:string}> = {};
  layer: string  = 'topo';
  lastWrittenHash: string = '';
  doHeightsDebounced: () => void;
  lastUiYieldTimestamp: number = 0;
  tileZipEl: JQuery<HTMLLabelElement>;
  tilePadEl: JQuery<HTMLLabelElement>;
  tileUnrealNameEl: JQuery<HTMLLabelElement>;
  placeSearch: PlaceSearch;
  profileTool: ProfileTool | null = null;
  /** Heightmap files written by the current export, for the import scripts. */
  exportedHeightmaps: ScriptTile[] = [];
  exportedMapFiles: string[] = [];
  /** OSM features being downloaded for the current heightmap export. */
  pendingOsm: Promise<OsmFeature[] | null> = Promise.resolve(null);
  preview: TerrainPreview | null = null;
  previewCache: {key: string, input: MeshInput} | null = null;
  previewBusy: boolean = false;
  elevationSources: Partial<Record<ElevationSourceId, ElevationSource>> = {
    aws: new AwsTerrainSource((z, x, y) => App.getImageAsBuffer(NextZen.getUrl({x, y, z})).then(buffer => PNG.fromBuffer(buffer).terrariumToGrayscale())),
    mapterhorn: new MapterhornSource(),
    etopo: new EtopoSource(),
    mars: new PlanetSource(PLANETS[0]),
    moon: new PlanetSource(PLANETS[1]),
    mercury: new PlanetSource(PLANETS[2]),
  };
  /** Which world the map is currently showing. */
  currentBody : Body = 'earth';
  tabs : Tabs;
  sections : Record<string, JQuery<HTMLElement>> = {};
  painter : PainterEditor;
  scatterEditor : ScatterEditor;
  /** OpenStreetMap downloads by area and layers, so previews and exports share them. */
  osmCache = new Map<string, Promise<OsmFeature[] | null>>();
  /** Map overlays (sea level, painted layers, sunlight, viewshed). */
  overlays : Record<string, L.ImageOverlay> = {};
  /** Contour lines drawn on the map as vectors. */
  contourLayer : L.LayerGroup | null = null;
  areaPolygon : L.Polygon | null = null;
  shapeLayer : L.Polygon | null = null;
  shapeDrawing : {points: L.LatLng[], line: L.Polyline} | null = null;
  viewshedMode = false;
  viewshedMarker : L.Marker | null = null;
  previewView : 'map' | '3d' | 'split' = 'map';
  lastExtras : PipelineExtras | null = null;
  constructor({container} : AppArgs) {
    this.container = container;
    this.elevationSources.gale = new PlanetSource(PLANETS[3], this.elevationSources.mars);
    this.elevationSources.landsea = new LandSeaSource(this.elevationSources.mapterhorn, this.elevationSources.etopo);
    this.meterFormatter = new Intl.NumberFormat(undefined, {style:'unit', unit: 'meter'});
    this.createMapLayers();
    this.createAppElements();
    this.insertSavedValues();
    this.createMap();
    this.hookControls();
    this.writeHash();
  }
  createAppElements() {
    this.els.container = $(this.container);
    this.els.main = this.els.container.find('.app-main');
    this.els.mapWrap = this.els.main.find('.map-wrap');
    this.els.sidebar = $('<aside class="app-sidebar" aria-label="Heightmap settings">');
    this.els.sidebarHead = $('<div class="sidebar-head">');
    this.tabs = new Tabs(TABS);
    this.els.sidebarFoot = $('<div class="sidebar-foot">');
    this.els.sidebar.append(this.els.sidebarHead, this.tabs.nav, this.tabs.panels, this.els.sidebarFoot);
    this.els.container.append(this.els.sidebar);
    this.els.inputContainer = this.tabs.panels;
    const p = (id : string) => this.tabs.panel(id);
    this.sections = {
      location: section(p('area'), 'location', 'Location & size'),
      shape: section(p('area'), 'shape', 'Rotation & custom shape', {open: false}),
      seamless: section(p('area'), 'seamless', 'Seamless tiling', {open: false}),
      elevation: section(p('terrain'), 'elevation', 'Elevation data'),
      sealevel: section(p('terrain'), 'sealevel', 'Sea level', {open: false}),
      water: section(p('terrain'), 'water', 'Water'),
      carve: section(p('terrain'), 'carve', 'Carve roads, rivers & lakes', {open: false}),
      osm: section(p('layers'), 'osm', 'OpenStreetMap masks'),
      painter: section(p('layers'), 'painter', 'Material painter', {open: false}),
      trees: section(p('layers'), 'trees', 'Real trees (treemap)', {open: false}),
      scatter: section(p('layers'), 'scatter', 'Scatter: trees, rocks, bushes', {open: false}),
      maps: section(p('layers'), 'maps', 'Texture maps', {open: false}),
      profile: section(p('analysis'), 'profile', 'Elevation profile'),
      viewshed: section(p('analysis'), 'viewshed', 'Viewshed: what can be seen', {open: false}),
      sunlight: section(p('analysis'), 'sunlight', 'Sunlight over a year', {open: false}),
      contours: section(p('analysis'), 'contours', 'Contour lines & laser cutting', {open: false}),
      model: section(p('model'), 'model', '3D model'),
      print: section(p('model'), 'print', '3D printing extras', {open: false}),
      heightmap: section(p('export'), 'heightmapfile', 'Heightmap file'),
      tiles: section(p('export'), 'tiles', 'Tiles (World Partition)', {open: false}),
      splines: section(p('export'), 'splines', 'Road & river splines', {open: false}),
      scripts: section(p('export'), 'scripts', 'Import helpers', {open: false}),
      poster: section(p('export'), 'poster', 'Poster print', {open: false}),
    };
    this.els.resultsPanel = p('results');

    this.createSubmitButton();
    this.createSearchBar();
    this.createInputOptions();
    this.createOutputOptions();
    this.createExtraOutputOptions();
    this.createOsmOptions();
    this.createMeshOptions();
    this.createContourOptions();
    this.createAreaOptions();
    this.createTerrainOptions();
    this.createLayerEditors();
    this.createTreeOptions();
    this.createAnalysisOptions();
    this.createPrintOptions();
    this.createSplineOptions();
    this.createPosterOptions();
    this.tabs.onChange = (id) => { if (id === 'export') this.refreshPosterPreview(); };
    this.createViewSwitch();
    this.resetOutput();
  }
  createSearchBar() {
    this.els.searchRow = $('<div class="columns search-row">');
    const searchColumn = $('<div class="column field">')
      .append(App.createLabel('Search for a place', {for: 'place-search'}));
    this.placeSearch = new PlaceSearch({
      onSelect: (place) => {
        trackEvent('search/select');
        this.lastPlaceName = place.label === 'Go to coordinates' ? '' : place.label;
        if (place.bounds) {
          this.map.fitBounds(place.bounds, {maxZoom: 14});
        } else {
          this.map.setView(place.center, Math.max(this.map.getZoom(), 11));
        }
        this.setPositionTo(this.map.getCenter());
      },
      onNoResults: () => trackDebounced('search/no-results', 'search/no-results'),
      onError: () => trackEvent('search/unavailable'),
      parseCoordinates: (text) => {
        const latLng = this.getLatLngFromText(text);
        return latLng ? {lat: latLng.latitude, lng: latLng.longitude} : null;
      },
    });
    searchColumn.append(this.placeSearch.el);

    this.els.copyLink = $('<button class="button is-small" type="button">Copy link</button>');
    tippy(this.els.copyLink[0], {
      ...deafultTippyOptions,
      content: 'Copies a link to this exact location and export settings. The address bar also stays up to date, so you can bookmark it.',
    });
    this.els.copyLink.on('click', () => this.copyShareLink());
    const copyColumn = $('<div class="column is-narrow field">')
      .append($('<label class="label">&nbsp;</label>'))
      .append($('<div class="control">').append(this.els.copyLink));

    this.els.searchRow.append(searchColumn).append(copyColumn);
    this.els.sidebarHead.append(this.els.searchRow);
  }
  async copyShareLink() {
    this.writeHash();
    trackEvent('share/copy-link');
    const url = location.href;
    const original = 'Copy link';
    try {
      await navigator.clipboard.writeText(url);
      this.els.copyLink.text('Link copied!');
    } catch (e) {
      // Clipboard can be blocked (e.g. non-secure context): fall back to a prompt
      window.prompt('Copy this link:', url);
    }
    setTimeout(() => this.els.copyLink.text(original), 2000);
  }
  /** The map layer on screen (and used for albedo/textures): the chosen one on Earth, the world's basemap elsewhere. */
  activeLayerKey() : string {
    const body = this.getBody();
    if (this.getElevationSource().id === 'gale') return 'gale';
    return body === 'earth' ? this.inputs.maptype.val().toString() : body;
  }
  getBody() : Body {
    return (this.getElevationSource().body ?? 'earth') as Body;
  }
  /** Sphere radius for ground distances on the current world. */
  bodyRadius() : number {
    return this.getElevationSource().radius ?? BODY_RADIUS.earth;
  }
  /** Switch the map (and things that only make sense on Earth) when the elevation source moves to another world. */
  currentSourceId : string = '';
  updateBody(keepView : boolean = false) {
    const body = this.getBody();
    const sourceId = this.getElevationSource().id;
    const sourceChanged = sourceId !== this.currentSourceId;
    const previousSource = this.currentSourceId;
    this.currentSourceId = sourceId;
    if (sourceChanged && this.map) this.showHideCurrentLayer();
    // Regional sources (Gale crater) jump to their area
    const home = SOURCE_HOME[sourceId];
    if (home && sourceChanged && this.map && !keepView && previousSource) {
      this.map.setView([home.lat, home.lng], home.zoom);
      this.setPositionTo({lat: home.lat, lng: home.lng});
      const z = Math.min(16, home.zoom + 2);
      this.inputs.outputzoom.val(z);
      this.storeValue('outputzoom', `${z}`);
      this.updatePhysicalDimensions();
    }
    const earth = body === 'earth';
    for (const key of ['carve', 'osm', 'splines', 'trees'] as const) this.sections[key]?.closest('.ui-section').toggleClass('is-disabled', !earth);
    this.inputs.buildings?.prop('disabled', !earth);
    this.inputs.sunMap?.prop('disabled', !earth);
    if (body === this.currentBody) return;
    const previous = this.currentBody;
    this.currentBody = body;
    this.showHideCurrentLayer();
    this.inputs.maptype.prop('disabled', body !== 'earth');
    this.els.columnsOsm?.toggleClass('is-disabled', body !== 'earth');
    if (this.inputs.previewSun) {
      if (body !== 'earth') this.inputs.previewSun.prop('checked', false);
      this.inputs.previewSun.prop('disabled', body !== 'earth');
      this.updatePreviewSun();
    }
    if (this.map && !keepView && !SOURCE_HOME[sourceId] && (body !== 'earth' || previous !== 'earth')) {
      const home = BODY_HOME[body];
      this.map.setView([home.lat, home.lng], home.zoom);
      this.setPositionTo({lat: home.lat, lng: home.lng});
      // A sensible output zoom for the new world (each one has its own limit)
      const oz = clamp(home.zoom + 2, 1, this.getMaxOutputZoom());
      this.inputs.outputzoom.val(oz);
      this.storeValue('outputzoom', `${oz}`);
      this.doDisEnableControls();
    }
    this.updatePhysicalDimensions();
    this.updateMeshEstimate();
  }
  showHideCurrentLayer() {
    this.layer = this.activeLayerKey();
    for (let [key, layer] of Object.entries(this.layers)) {
      if (key == this.layer) {
        layer.layer.addTo(this.map);
      } else {
        layer.layer.removeFrom(this.map);
      }
    }
    const mz = this.map.getMaxZoom();
    this.inputs.zoom.prop('max', mz);
    this.inputs.outputzoom.prop('max', mz);
    this.inputs.zoom.val(Math.min(parseInt(this.inputs.zoom.val().toString()), mz));
    this.inputs.outputzoom.val(Math.min(parseInt(this.inputs.outputzoom.val().toString()), mz));
  }
  createMapLayers() {
    this.layers.topo = {
      layer: L.tileLayer.provider('Esri.WorldTopoMap'),
      label: 'Esri World Topo Map'
    };
    this.layers.imagery = {
      layer: L.tileLayer.provider('Esri.WorldImagery'),
      label: 'Esri World Imagery'
    };
    this.layers.relief = {
      layer: L.tileLayer.provider('Esri.WorldShadedRelief'),
      label: 'Esri World Shaded Relief'
    };
    this.layers.natgeo = {
      layer: L.tileLayer.provider('Esri.NatGeoWorldMap'),
      label: 'Esri Nat Geo World Map'
    };
    this.layers.osm = {
      layer: L.tileLayer.provider('OpenStreetMap.Mapnik'),
      label: 'Open Street Map'
    };
    this.layers.osmhot = {
      layer: L.tileLayer.provider('OpenStreetMap.HOT'),
      label: 'Open Street Map HOT'
    };
    this.layers.otm = {
      layer: L.tileLayer.provider('OpenTopoMap'),
      label: 'Open Topo Map'
    };
    this.layers.opnvkarte = {
      layer: L.tileLayer.provider('OPNVKarte'),
      label: 'OPNVKarte'
    };
    this.layers.usgsusimagery = {
      layer: L.tileLayer.provider('USGS.USImagery'),
      label: 'USGS US Imagery'
    };
    this.layers.watercolor = {
      layer: L.tileLayer.provider('Stadia.StamenWatercolor'),
      label: 'Watercolor'
    };
    this.layers.stadiastamentoner = {
      layer: L.tileLayer.provider('Stadia.StamenToner'),
      label: 'Toner Saver (with names)'
    };
    this.layers.stadiastamentonerlite = {
      layer: L.tileLayer.provider('Stadia.StamenTonerLite'),
      label: 'Toner Saver Lite (with names)'
    };
    this.layers.stadiastamentonerbg = {
      layer: L.tileLayer.provider('Stadia.StamenTonerBackground'),
      label: 'Toner Saver (without names)'
    };
    this.layers.stadiaalidadesatellite = {
      layer: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg', {
         minZoom: 0,
         maxZoom: 20,
         attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }),
      label: 'Stadia Satellite'
    };
    this.layers.stadiasmooth = {
      layer: L.tileLayer.provider('Stadia.AlidadeSmooth'),
      label: 'Stadia Smooth'
    };
    this.layers.stadiasmoothdark = {
      layer: L.tileLayer.provider('Stadia.AlidadeSmoothDark'),
      label: 'Stadia Smooth Dark'
    };
    this.layers.mars = {
      layer: L.tileLayer('https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png', {
        maxNativeZoom: 11,
        maxZoom: 14,
        attribution: '<a href="https://www.openplanetary.org/opm" target="_blank" rel="noopener">OpenPlanetaryMap</a> Mars basemap (NASA, USGS, ESA)',
      }),
      label: 'Mars: OpenPlanetaryMap',
    };
    this.layers.moon = {
      layer: L.tileLayer('https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-moon-basemap-v0-1/all/{z}/{x}/{y}.png', {
        maxNativeZoom: 12,
        maxZoom: 14,
        attribution: '<a href="https://www.openplanetary.org/opm" target="_blank" rel="noopener">OpenPlanetaryMap</a> Moon basemap (NASA, USGS)',
      }),
      label: 'Moon: OpenPlanetaryMap',
    };
    // Worlds without a tile server: shaded relief drawn from the elevation data itself
    this.layers.mercury = {
      layer: new HillshadeLayer(this.elevationSources.mercury, {
        range: [-5000, 4500], radius: BODY_RADIUS.mercury, maxNativeZoom: 7, maxZoom: 12,
        attribution: 'Mercury shaded relief from MESSENGER elevation (NASA / JHU APL / USGS)',
      }),
      label: 'Mercury: shaded relief',
    };
    this.layers.gale = {
      layer: new HillshadeLayer(new PlanetSource(PLANETS[3], this.elevationSources.mars), {
        range: [-5000, 1000], radius: BODY_RADIUS.mars, maxNativeZoom: 16, minZoom: 3, maxZoom: 18,
        palette: [[0, [92, 44, 26]], [0.5, [170, 92, 52]], [1, [232, 170, 120]]],
        attribution: 'Gale crater shaded relief from HiRISE / MOLA elevation (NASA / JPL / UArizona / USGS)',
      }),
      label: 'Mars: Gale crater relief',
    };
    this.layers.nextzen = {
      layer: L.tileLayer(
        NextZen.getApiKeyedUrl(),
        {
          attribution: '&copy; NextZen',
          maxZoom: 15
        }
      ),
      label: 'Terrarium (AWS elevation tiles, raw)'
    };
  }
  createMap() {
    this.els.map = $('#map');

    const curLatLng : L.LatLngExpression = [parseFloat(this.inputs.latitude.val().toString()), parseFloat(this.inputs.longitude.val().toString())];

    this.doHeightsDebounced = debounce(50, () => {
      this.getApproxHeightsForState();
    });

    this.map = L.map('map', {
      center: curLatLng,
      scrollWheelZoom: 'center',
      zoom: parseInt(this.inputs.zoom.val().toString())
    });

    this.createOutputZoomControls(curLatLng);

    this.layers.topo.layer.addTo(this.map);

    const icon = L.icon({
      iconUrl: 'public/im/icon-marker.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const arrowIcons = {
      up: L.icon({
        iconUrl: 'public/im/icon-up.png',
        iconSize: [32, 32],
        iconAnchor: [16, 0],
      }),
      down: L.icon({
        iconUrl: 'public/im/icon-down.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
      right: L.icon({
        iconUrl: 'public/im/icon-right.png',
        iconSize: [32, 32],
        iconAnchor: [32, 16],
      }),
      left: L.icon({
        iconUrl: 'public/im/icon-left.png',
        iconSize: [32, 32],
        iconAnchor: [0, 16],
      }),
    };

    this.mapMarker = L.marker(curLatLng, {icon});
    this.mapMarker.addTo(this.map);

    this.arrows[0] = L.marker(curLatLng, {icon: arrowIcons.up});
    this.arrows[1] = L.marker(curLatLng, {icon: arrowIcons.left});
    this.arrows[2] = L.marker(curLatLng, {icon: arrowIcons.down});
    this.arrows[3] = L.marker(curLatLng, {icon: arrowIcons.right});
    this.arrows.map(arrow => arrow.addTo(this.map));
    this.arrows.map((arrow, i) => arrow.on('click', () => {
      const shiftKey = this.shiftHeld;
      trackEvent(shiftKey ? 'map/arrow-expand' : 'map/arrow-move');
      switch(i) {
        case 0:
          shiftKey ? this.expandArrowClick(1, 0) : this.arrowClick(1, 0);
          break;
        case 1:
          shiftKey ? this.expandArrowClick(0, -1) : this.arrowClick(0, -1);
          break;
        case 2:
          shiftKey ? this.expandArrowClick(-1, 0) : this.arrowClick(-1, 0);
          break;
        case 3:
          shiftKey ? this.expandArrowClick(0, 1) : this.arrowClick(0, 1);
          break;
      }
    }));

    this.els.mapDrawer = $('<div class="map-drawer">');
    this.els.mapWrap.append(this.els.mapDrawer);
    const drawerAnchor = $('<span class="map-drawer__anchor">');
    this.els.mapDrawer.append(drawerAnchor);
    this.profileTool = new ProfileTool({
      map: this.map,
      after: drawerAnchor[0],
      getSource: () => this.getElevationSource(),
      download: (blob, fn) => this.download(blob, fn),
      track: (event) => trackEvent(event),
    });

    this.map.on('click', (e) => {
      // While drawing a profile, clicks add points instead of moving the export area
      if (this.profileTool?.handleMapClick(e.latlng)) return;
      if (this.viewshedMode) {
        this.runViewshed(e.latlng);
        return;
      }
      if (this.shapeDrawing) {
        this.addShapePoint(e.latlng);
        return;
      }
      this.mapClickDebounced(e);
    });
    this.map.on('dblclick', () => {
      if (this.shapeDrawing) this.finishShapeDrawing();
    });
    document.addEventListener('keydown', (e) => {
      if (this.shapeDrawing && e.key === 'Enter') this.finishShapeDrawing();
      if (e.key === 'Escape') {
        if (this.shapeDrawing) { this.shapeDrawing.points = []; this.finishShapeDrawing(); }
        if (this.viewshedMode) this.toggleViewshedMode(false);
      }
    });

    this.map.on('move', throttle(1000/60, (e) => {
      const center = this.map.getCenter();
      const nlat = center.lat + 90;
      const lat = (((nlat % 180) + 180) % 180) - 90;
      const nlng = center.lng + 180;
      const lng = (((nlng % 360) + 360) % 360) - 180;
      // Don't overwrite an input the user is currently typing in (#7)
      if (!App.isFocused(this.inputs.latitude)) {
        this.inputs.latitude.val(lat);
      }
      if (!App.isFocused(this.inputs.longitude)) {
        this.inputs.longitude.val(lng);
      }
      if (!App.isFocused(this.inputs.zoom)) {
        this.inputs.zoom.val(this.map.getZoom());
      }
      this.mapMarker.setLatLng(center);
      this.saveLatLngZoomState();
      this.updatePhysicalDimensions();
      this.doHeightsDebounced();
    }));

    this.map.on('moveend', this.doHeightsDebounced);

    window.addEventListener('resize', debounce(50, () => {
      this.resizeMap();
    }))
    this.resizeMap();

    document.addEventListener('keydown', (e) => { if (e.key === 'Shift') this.shiftHeld = true; });
    document.addEventListener('keyup', (e) => { if (e.key === 'Shift') this.shiftHeld = false; });
    window.addEventListener('blur', () => { this.shiftHeld = false; });

    this.updatePhysicalDimensions();
    this.showHideCurrentLayer();
    this.drawShape();
    this.doHeightsDebounced();
    // The map box changes size with the sidebar and the 3D dock
    new ResizeObserver(debounce(50, () => this.map.invalidateSize())).observe(this.els.mapWrap[0]);
  }
  mapClickDebounced = debounce(100, (e : L.LeafletMouseEvent) => {
    if (this.profileTool?.active || this.shapeDrawing || this.viewshedMode) return;
    trackEvent('map/click');
    this.setPositionTo(e.latlng);
  });
  setPositionTo(latlng: L.LatLngLiteral) {
    this.map.setView(latlng);
    this.inputs.latitude.val(latlng.lat);
    this.inputs.longitude.val(latlng.lng);
    this.inputs.zoom.val(this.map.getZoom());
    this.mapMarker.setLatLng(latlng);
    this.saveLatLngZoomState();
    this.updatePhysicalDimensions();
    this.doHeightsDebounced();
  }
  arrowClick(up: 1|-1|0, right: 1|-1|0) {
    const state = this.getCurrentState();
    // Step one whole area along the (possibly rotated) area's own axes
    const [dx, dy] = rotateOut(right * state.width, -up * state.height, this.getRotation());
    const c = App.getLatLngFromTileCoords(state.exactPos.x + dx / NextZen.tileWidth, state.exactPos.y + dy / NextZen.tileHeight, state.zoom);
    this.setPositionTo({lat: c.latitude, lng: c.longitude});
  }
  expandArrowClick(up: 1|-1|0, right: 1|-1|0) {
    const state = this.getCurrentState();

    const newWidth = Math.round(Math.min(32516, Math.max(1, (state.widthInTiles + Math.abs(right)) * NextZen.tileWidth)));
    const newHeight = Math.round(Math.min(32516, Math.max(1, (state.heightInTiles + Math.abs(up)) * NextZen.tileHeight)));

    this.inputs.width.val(newWidth);
    this.inputs.height.val(newHeight);

    this.storeValue('width', this.inputs.width.val().toString());
    this.storeValue('height', this.inputs.height.val().toString());
    this.updatePhysicalDimensions();
    this.updateTileSummary();
  }
  resizeMap() {
    this.map.invalidateSize();
    this.positionOutputZoomControls();
  }
  updatePhysicalDimensions() {
    const state = this.getCurrentState();
    const bounds : L.LatLngBoundsExpression = [
      [
        state.bounds[0].latitude,
        state.bounds[0].longitude
      ], [
        state.bounds[1].latitude,
        state.bounds[1].longitude
      ]
    ];
    // The export area, turned when rotated: corners from pixel offsets around the centre
    const corners = rotatedCorners(state.width, state.height, this.getRotation()).map(([dx, dy]) => {
      const c = App.getLatLngFromTileCoords(state.exactPos.x + dx / NextZen.tileWidth, state.exactPos.y + dy / NextZen.tileHeight, state.zoom);
      return L.latLng(c.latitude, c.longitude);
    });
    if (!this.boundingRect) {
      this.boundingRect = L.polygon(corners, {color: "#ff7800", weight: 1, fillOpacity: 0.1, interactive: false}).addTo(this.map) as any;
    }
    (this.boundingRect as unknown as L.Polygon).setLatLngs(corners);
    const mid = (a : L.LatLng, b : L.LatLng) : L.LatLngTuple => [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
    this.arrows[0].setLatLng(mid(corners[0], corners[1]));
    this.arrows[1].setLatLng(mid(corners[3], corners[0]));
    this.arrows[2].setLatLng(mid(corners[2], corners[3]));
    this.arrows[3].setLatLng(mid(corners[1], corners[2]));
    this.positionOutputZoomControls(L.latLngBounds(corners));
    this.updateAreaStatus?.();

    const units = state.phys.width > 1000 ? 'km' : 'm';
    const precision = state.phys.width > 100000 ? 0 : 1;
    const w = state.phys.width > 1000 ? state.phys.width/1000 : state.phys.width;
    const h = state.phys.height > 1000 ? state.phys.height/1000 : state.phys.height;

    const res = Math.max(state.phys.width/state.width, state.phys.height/state.height);
    const resunit = 'm';
    const resprecision = res > 10 ? 1 : 2;

    // Output is in Web Mercator (EPSG:3857) - same as the source tiles.
    const sw3857 = L.CRS.EPSG3857.project(L.latLng(bounds[1][0], bounds[0][1]));
    const ne3857 = L.CRS.EPSG3857.project(L.latLng(bounds[0][0], bounds[1][1]));
    const px3857 = (ne3857.x - sw3857.x) / state.width;
    this.els.boundsContent.text(
      `Projection: EPSG:3857 (WGS 84 / Pseudo-Mercator)\n\n` +
      `Extent in EPSG:3857 metres (xmin, ymin, xmax, ymax):\n` +
      `${sw3857.x.toFixed(3)}, ${sw3857.y.toFixed(3)}, ${ne3857.x.toFixed(3)}, ${ne3857.y.toFixed(3)}\n` +
      `Pixel size: ${px3857.toFixed(6)} EPSG:3857 units/px (not ground metres)\n\n` +
      `Lat/lng corners (EPSG:4326):\n` +
      JSON.stringify({
        topLeft: [bounds[0][0], bounds[0][1]],
        bottomLeft: [bounds[1][0], bounds[0][1]],
        bottomRight: [bounds[1][0], bounds[1][1]],
        topRight: [bounds[0][0], bounds[1][1]]
      }, null, 2)
    );
    const infoHtml = `${localFormatNumber(w, precision)} x ${localFormatNumber(h, precision)}${units} - ${localFormatNumber(res, resprecision)}${resunit}/px resolution<span class="heights"></span>`;
    if (this.els.generatorInfoPrimary) {
      this.els.generatorInfoPrimary.html(infoHtml);
    } else {
      this.els.generatorInfo.html(infoHtml);
    }
    this.updateTileSummary(state);
    this.els.scaleInfoValues?.html('');
  }
  createOutputZoomControls(curLatLng: L.LatLngExpression) {
    if (!this.map) {
      return;
    }
    this.zoom.in = new L.Marker(curLatLng, {icon: L.icon({
      iconUrl: 'public/im/icon-zoom-in.png',
      iconSize: [32, 32],
      iconAnchor: [32, 0],
    })});
    this.zoom.out = new L.Marker(curLatLng, {icon: L.icon({
      iconUrl: 'public/im/icon-zoom-out.png',
      iconSize: [32, 32],
      iconAnchor: [0, 0],
    })});

    this.zoom.in.on('click', () => {
      trackEvent('map/output-zoom-in');
      this.adjustOutputZoom(1);
    });

    this.zoom.out.on('click', () => {
      trackEvent('map/output-zoom-out');
      this.adjustOutputZoom(-1);
    });

    this.zoom.in.addTo(this.map);
    this.zoom.out.addTo(this.map);
    this.positionOutputZoomControls();
  }
  adjustOutputZoom(delta: number) {
    if (!this.inputs.outputzoom) {
      return;
    }
    const current = parseInt(this.inputs.outputzoom.val().toString()) || 0;
    const min = parseInt(this.inputs.outputzoom.attr('min') || '1', 10);
    const max = parseInt(this.inputs.outputzoom.attr('max') || '18', 10);
    const nextValue = clamp(current + delta, min, max);
    if (nextValue === current) {
      return;
    }
    this.inputs.outputzoom.val(nextValue);
    this.storeValue('outputzoom', nextValue.toString());
    this.updatePhysicalDimensions();
    this.doDisEnableControls();
    if (this.doHeightsDebounced) {
      this.doHeightsDebounced();
    }
  }
  toggleTileInputs() {
    const mode = (this.inputs.tileMode?.val()?.toString() || 'off') as TileExportMode;
    const disableDimensions = mode !== 'dimensions';
    const disableCounts = mode !== 'count';
    [this.inputs.tileWidth, this.inputs.tileHeight].forEach(input => {
      if (input) {
        input.prop('disabled', disableDimensions);
      }
    });
    [this.inputs.tileCountX, this.inputs.tileCountY].forEach(input => {
      if (input) {
        input.prop('disabled', disableCounts);
      }
    });
    this.els.tileSizeColumn?.toggleClass('is-disabled', disableDimensions);
    this.els.tileCountColumn?.toggleClass('is-disabled', disableCounts);
  }
  updateTileSummary(state?: ConfigState) {
    if (!this.els.tilingSummary) {
      return;
    }
    const width = state ? state.width : this.getNumericInputValue(this.inputs.width);
    const height = state ? state.height : this.getNumericInputValue(this.inputs.height);
    if (!width || !height) {
      this.els.tilingSummary.text('Tiled export disabled.');
      return;
    }
    const config = this.getTileExportConfig(width, height);
    if (!config.enabled) {
      this.els.tilingSummary.text('Tiled export disabled.');
      return;
    }
    const totalTiles = config.tilesX * config.tilesY;
    const approxWidth = Math.min(config.tileWidth, width);
    const approxHeight = Math.min(config.tileHeight, height);
    const tileWord = totalTiles === 1 ? 'tile' : 'tiles';
    const dimText = `${localFormatNumber(approxWidth, 0)} × ${localFormatNumber(approxHeight, 0)}px`;
    this.els.tilingSummary.text(`Tiled export: ${config.tilesX} × ${config.tilesY} ${tileWord} (${totalTiles} total), target size ${dimText}. Edge tiles resize automatically.`);
  }
  getTileExportConfig(totalWidth?: number, totalHeight?: number) : TileExportConfig {
    const mode = (this.inputs.tileMode?.val()?.toString() || 'off') as TileExportMode;
    const widthValue = typeof totalWidth === 'number' ? totalWidth : this.getNumericInputValue(this.inputs.width);
    const heightValue = typeof totalHeight === 'number' ? totalHeight : this.getNumericInputValue(this.inputs.height);
    const safeWidth = Math.max(1, Math.floor(isNaN(widthValue) ? 0 : widthValue));
    const safeHeight = Math.max(1, Math.floor(isNaN(heightValue) ? 0 : heightValue));
    const baseConfig : TileExportConfig = {
      enabled: false,
      mode,
      tileWidth: safeWidth,
      tileHeight: safeHeight,
      tilesX: 1,
      tilesY: 1,
    };
    if (mode === 'off') {
      return baseConfig;
    }
    if (mode === 'dimensions') {
      const requestedWidth = Math.max(1, this.getNumericInputValue(this.inputs.tileWidth));
      const requestedHeight = Math.max(1, this.getNumericInputValue(this.inputs.tileHeight));
      if (!requestedWidth || !requestedHeight) {
        return baseConfig;
      }
      const tilesX = Math.max(1, Math.ceil(safeWidth / requestedWidth));
      const tilesY = Math.max(1, Math.ceil(safeHeight / requestedHeight));
      return {
        enabled: true,
        mode,
        tileWidth: requestedWidth,
        tileHeight: requestedHeight,
        tilesX,
        tilesY,
      };
    }
    if (mode === 'count') {
      const countX = Math.max(1, this.getNumericInputValue(this.inputs.tileCountX));
      const countY = Math.max(1, this.getNumericInputValue(this.inputs.tileCountY));
      if (!countX || !countY) {
        return baseConfig;
      }
      const tileWidth = Math.max(1, Math.ceil(safeWidth / countX));
      const tileHeight = Math.max(1, Math.ceil(safeHeight / countY));
      return {
        enabled: true,
        mode,
        tileWidth,
        tileHeight,
        tilesX: countX,
        tilesY: countY,
      };
    }
    return baseConfig;
  }
  positionOutputZoomControls(boundsInput?: L.LatLngBoundsExpression | L.LatLngBounds) {
    if (!this.zoom.in || !this.zoom.out || !this.map) {
      return;
    }
    const resolvedBounds = boundsInput
      ? (boundsInput instanceof L.LatLngBounds ? boundsInput : L.latLngBounds(boundsInput))
      : (this.boundingRect ? this.boundingRect.getBounds() : null);
    if (resolvedBounds) {
      const northEast = resolvedBounds.getNorthEast();
      const northWest = resolvedBounds.getNorthWest();
      this.zoom.in.setLatLng(northEast);
      this.zoom.out.setLatLng(northWest);
    }
  }
  latLngBetween(a: L.LatLngTuple, b:  L.LatLngTuple):  L.LatLngTuple {
    if (a.length === 3 && b.length === 3) {
      return [(a[0]+b[0])/2, a[1] + (a[1]+b[1])/2, (a[2] + b[2])/2];
    }
    return [(a[0]+b[0])/2, (a[1]+b[1])/2];
  }
  createInputOptions() {
    // input options
    this.inputs.latitude = App.createInput({
      name: 'latitude',
      placeholder: 'Latitude',
      type: 'number',
      min: '-90',
      max: '90',
      value: '27.994401411046148',
      step: '0.000000000000001'
    });
    this.inputs.longitude = App.createInput({
      name: 'longitude',
      placeholder: 'Longitude',
      type: 'number',
      min: '-180',
      max: '180',
      value: '86.92520141601562',
      step: '0.000000000000001'
    });
    this.inputs.zoom = App.createInput({
      name: 'zoom',
      placeholder: 'Zoom',
      type: 'number',
      min: '1',
      max: '18',
      step: '1',
      value: '13'
    });
    this.inputs.outputzoom = App.createInput({
      name: 'outputzoom',
      placeholder: 'Output Zoom Level',
      type: 'number',
      min: '1',
      max: '18',
      step: '1',
      value: '13'
    });

    this.inputs.elevSource = $(`<select name="elevsource">
      <option value="aws" selected>AWS Terrain Tiles (Mapzen)</option>
      <option value="mapterhorn">Mapterhorn (Copernicus 30 m + lidar)</option>
      <option value="etopo">NOAA ETOPO 2022 (land + sea floor)</option>
      <option value="upload">Your own file (GeoTIFF / SRTM .hgt)…</option>
      <option value="landsea">Mapterhorn land + ETOPO sea floor</option>
      <optgroup label="Other worlds">
        <option value="mars">Mars: MOLA (463 m)</option>
        <option value="gale">Mars: Gale crater, Curiosity site (1 m)</option>
        <option value="moon">Moon: LRO LOLA (118 m)</option>
        <option value="mercury">Mercury: MESSENGER (665 m)</option>
      </optgroup>
    </select>`) as JQuery<HTMLSelectElement>;
    this.els.elevSourceNote = $('<p class="elevation-note">');
    this.inputs.demFile = $('<input type="file" accept=".tif,.tiff,.hgt,image/tiff" hidden>') as JQuery<HTMLInputElement>;
    this.els.demUpload = $('<div class="dem-upload">').hide().append(
      $('<button class="button is-small" type="button">Choose elevation file…</button>').on('click', () => this.inputs.demFile.trigger('click')),
      this.inputs.demFile,
    );

    this.inputs.maptype = $('<select>') as JQuery<HTMLSelectElement>;
    for (let [type, layer] of Object.entries(this.layers)) {
      if (type === 'mars' || type === 'moon' || type === 'mercury' || type === 'gale') continue;
      this.inputs.maptype.append(`<option value="${type}">${layer.label}</option>`);
    }

    this.els.columnsLatLngZoom = $('<div class="columns">');
    this.els.columnLat = $('<div class="column field">');
    this.els.columnLng = $('<div class="column field">');
    this.els.columnZoom = $('<div class="column field">');
    this.els.columnOutputZoom = $('<div class="column field">');
    this.els.columnMaptype = $('<div class="column field">');

    this.els.latitudeControl  = $('<div class="control">').append(this.inputs.latitude);
    this.els.longitudeControl = $('<div class="control">').append(this.inputs.longitude);
    this.els.zoomControl = $('<div class="control">').append(this.inputs.zoom);
    this.els.outputzoomControl = $('<div class="control">').append(this.inputs.outputzoom);
    this.els.maptypeControl = $('<div class="control">').append($('<div class="select">').append(this.inputs.maptype));

    this.els.columnLat.append(App.createLabel('Latitude', {for:'latitude'}));
    this.els.columnLat.append(this.els.latitudeControl);
    this.els.columnLng.append(App.createLabel('Longitude', {for:'latitude'}));
    this.els.columnLng.append(this.els.longitudeControl);
    this.els.columnZoom.append(App.createLabel('Zoom', {for:'zoom'}));
    this.els.columnZoom.append(this.els.zoomControl);
    const outputZoomLabel = App.createLabel('Output Zoom', {for:'outputzoom'});
    this.els.columnOutputZoom.append(outputZoomLabel);
    this.els.columnOutputZoom.append(this.els.outputzoomControl);
    const mapTypeControlLabel = App.createLabel('Map Preview Type', {for:'maptype'});
    this.els.columnMaptype.append(mapTypeControlLabel);
    this.els.columnMaptype.append(this.els.maptypeControl);

    const elevSourceLabel = App.createLabel('Elevation Data', {for: 'elevsource'});
    App.withInfo(elevSourceLabel, `<div class="content"><p><b>AWS Terrain Tiles</b>: the original Mapzen data. Global, mostly 30 to 90 m, with 3 to 10 m in the USA. Output zoom up to 15.</p>
<p><b>Mapterhorn</b>: Copernicus GLO-30 worldwide, plus 0.25 to 10 m lidar for the USA (USGS 3DEP), the UK, most of Europe, Japan, New Zealand and more. Output zoom up to 18. Where only 30 m data exists, higher zooms are smoothly upscaled. Copernicus is a surface model, so forests and buildings can show as bumps.</p>
<p>See <a href="https://mapterhorn.com" target="_blank" rel="noopener">mapterhorn.com</a> for coverage.</p>
<p><b>NOAA ETOPO 2022</b>: land and sea floor worldwide at about 450 m (15 arc-seconds), including detailed ocean bathymetry. Best for coasts, islands and ocean trenches. Output zoom up to 12.</p>
<p><b>Mapterhorn land + ETOPO sea floor</b>: Mapterhorn's detailed land with ETOPO bathymetry wherever Mapterhorn shows flat sea, blended along the coast. Best for coastal maps, harbours and islands.</p>
<p><b>Mars, the Moon and Mercury</b>: global elevation from NASA's MOLA (Mars, 463 m), LRO LOLA (Moon, 118 m) and MESSENGER (Mercury, 665 m) via USGS. <b>Gale crater</b> is a 1 m HiRISE model of the area the Curiosity rover is exploring (MOLA outside it). The map switches to that world; distances and scales use its size.</p>
<p><b>Your own file</b>: a GeoTIFF (EPSG:4326 lat/long or EPSG:3857) or an SRTM .hgt tile, e.g. lidar from your national mapping agency. It stays on your computer. Other projections such as UTM need reprojecting to EPSG:4326 first (QGIS: Raster &gt; Projections &gt; Warp).</p></div>`);
    this.els.columnElevSource = $('<div class="column field">')
      .append(elevSourceLabel)
      .append($('<div class="control">').append($('<div class="select is-fullwidth">').append(this.inputs.elevSource)))
      .append(this.els.demUpload)
      .append(this.els.elevSourceNote);

    this.sections.location.append(grid(this.els.columnLat, this.els.columnLng, this.els.columnOutputZoom, this.els.columnMaptype));
    this.sections.elevation.append(this.els.columnElevSource);

    const outputZoomLabelInfo = $('<span class="info-icon"> ℹ️ </span>');
    outputZoomLabel.append(outputZoomLabelInfo);
    tippy(outputZoomLabelInfo[0], {
      ...deafultTippyOptions,
      content: 'The zoom level used to generate the heightmap. For a given pixel size, this will change the physical dimensions of the output.'
    });

    const mapTypeControlLabelInfo = $('<span class="info-icon"> ℹ️ </span>');
    mapTypeControlLabel.append(mapTypeControlLabelInfo);
    tippy(mapTypeControlLabelInfo[0], {
      ...deafultTippyOptions,
      content: 'This specifies the preview map type AND the type of map used for the albedo export.'
    });
  }
  createOutputOptions() {
    // output options

    this.inputs.width = App.createInput({
      name: 'width',
      placeholder: 'Width',
      type: 'number',
      min: '1',
      max: '32516',
      step: '1',
      value: '505'
    });

    this.inputs.height = App.createInput({
      name: 'height',
      placeholder: 'Height',
      type: 'number',
      min: '1',
      max: '32516',
      step: '1',
      value: '505'
    });

    this.inputs.defaultSize = $('<select>') as JQuery<HTMLSelectElement>;

    this.inputs.defaultSize.append(`<option></option>`);
    const sizeGroups = [
      { label: 'Unreal Engine', values: this.defaultSizes },
      { label: 'Power of Two', values: this.powerOfTwoSizes },
    ];
    for (const group of sizeGroups) {
      const optGroup = $('<optgroup>').attr('label', group.label);
      for (const size of group.values) {
        optGroup.append(`<option value="${size}">${size}</option>`);
      }
      this.inputs.defaultSize.append(optGroup);
    }

    this.inputs.tileMode = $('<select name="tilemode">') as JQuery<HTMLSelectElement>;
    this.inputs.tileMode.append('<option value="off">Single file</option>');
    this.inputs.tileMode.append('<option value="dimensions">Tile by size</option>');
    this.inputs.tileMode.append('<option value="count">Tile by count</option>');

    this.inputs.tileWidth = App.createInput({
      name: 'tilewidth',
      placeholder: 'Tile width (px)',
      type: 'number',
      min: '1',
      max: '32516',
      step: '1',
      value: '1024'
    });

    this.inputs.tileHeight = App.createInput({
      name: 'tileheight',
      placeholder: 'Tile height (px)',
      type: 'number',
      min: '1',
      max: '32516',
      step: '1',
      value: '1024'
    });

    this.inputs.tileCountX = App.createInput({
      name: 'tilecountx',
      placeholder: 'Tiles wide',
      type: 'number',
      min: '1',
      max: '64',
      step: '1',
      value: '1'
    });

    this.inputs.tileCountY = App.createInput({
      name: 'tilecounty',
      placeholder: 'Tiles high',
      type: 'number',
      min: '1',
      max: '64',
      step: '1',
      value: '1'
    });

    this.tileZipEl = $(`<label class="checkbox"><input type="checkbox"> Zip Exports?</label>`) as JQuery<HTMLLabelElement>;
    this.tileZipEl.find('input').on('change', () => {
      this.storeValue('tilezip', this.tileZipEl.find('input').is(':checked').toString());
      trackControl('tile-zip', this.tileZipEl.find('input').is(':checked') ? 'on' : 'off');
    });

    this.tilePadEl = $(`<label class="checkbox"><input type="checkbox"> Pad tile exports</label>`) as JQuery<HTMLLabelElement>;
    this.tilePadEl.find('input').on('change', () => {
      this.storeValue('tilepad', this.tilePadEl.find('input').is(':checked').toString());
      trackControl('tile-pad', this.tilePadEl.find('input').is(':checked') ? 'on' : 'off');
    });

    this.tileUnrealNameEl = $(`<label class="checkbox"><input type="checkbox"> Unreal 5.7+ naming</label>`) as JQuery<HTMLLabelElement>;
    this.tileUnrealNameEl.find('input').on('change', () => {
      this.storeValue('tileunrealname', this.tileUnrealNameEl.find('input').is(':checked').toString());
      trackControl('tile-unreal-naming', this.tileUnrealNameEl.find('input').is(':checked') ? 'on' : 'off');
    });

    this.els.columnsOutputPrimary = $('<div class="columns columns-output columns-output--primary">');
    this.els.columnsOutputSecondary = $('<div class="columns columns-output columns-output--secondary">');

    const widthColumn = $('<div class="column field">')
      .append(App.createLabel('Output Width (px)', {for:'width'}))
      .append($('<div class="control">').append(this.inputs.width));

    const heightColumn = $('<div class="column field">')
      .append(App.createLabel('Output Height (px)', {for:'height'}))
      .append($('<div class="control">').append(this.inputs.height));

    this.els.defaultSizeControl  = $('<div class="control">').append($('<div class="select is-fullwidth">').append(this.inputs.defaultSize));
    const defaultSizeColumn = $('<div class="column field">')
      .append(App.createLabel('Default Sizes', {for:'width'}))
      .append(this.els.defaultSizeControl);

    this.inputs.outputformat = $('<select name="outputformat">') as JQuery<HTMLSelectElement>;
    this.inputs.outputformat.append('<option value="png16" selected>PNG - 16 Bit</option>');
    this.inputs.outputformat.append('<option value="exr16">OpenEXR - 16 Bit</option>');
    this.inputs.outputformat.append('<option value="exr32">OpenEXR - 32 Bit</option>');
    this.inputs.outputformat.append('<option value="geotiff">GeoTIFF - 32 Bit float, metres (GIS)</option>');
    const outputFormatColumn = $('<div class="column field">')
      .append(App.createLabel('Output Format', {for:'outputformat'}))
      .append(
        $('<div class="control">').append(
          $('<div class="select is-fullwidth">').append(this.inputs.outputformat)
        )
      );

    this.els.smartNormalisationControl = $(`
    <div class="control">
      <div class="select is-fullwidth">
        <select name="smart-normalisation-control">
          <option value=0>Off</option>
          <option value=1>Regular</option>
          <option value=3 selected>Smart</option>
        </select>
      </div>
    </div>`);
    const normalisationColumn = $('<div class="column field">').append(this.els.smartNormalisationControl);

    this.sections.location.append(grid(widthColumn, heightColumn, defaultSizeColumn.addClass('is-full')));

    const tileSizeLabel = $('<label class="label">Tile Dimensions (px)</label>');
    const tileSizeControls = $('<div class="tile-option-grid">')
      .append($('<div class="control">').append(this.inputs.tileWidth))
      .append($('<div class="control">').append(this.inputs.tileHeight));
    this.els.tileSizeColumn = $('<div class="column field tile-field">')
      .append(tileSizeLabel)
      .append(tileSizeControls);

    const tileCountLabel = $('<label class="label">Tile Counts</label>');
    const tileCountControls = $('<div class="tile-option-grid">')
      .append($('<div class="control">').append(this.inputs.tileCountX))
      .append($('<div class="control">').append(this.inputs.tileCountY));
    this.els.tileCountColumn = $('<div class="column field tile-field">')
      .append(tileCountLabel)
      .append(tileCountControls);

    this.els.normFrom = $(`
    <label class="label">Norm From</label>
    <div class="control">
      <input class="input" type="number" name="norm-from" min="-10929" max="8848">
    </div>`);

    this.els.normTo = $(`
    <label class="label">Norm To</label>
    <div class="control">
      <input class="input" type="number" name="norm-to" min="-10929" max="8848">
    </div>`);

    const normFromColumn = $('<div class="column field">').append(this.els.normFrom);
    const normToColumn = $('<div class="column field">').append(this.els.normTo);

    const tileModeColumn = $('<div class="column field">')
      .append(App.createLabel('Tiled Export', {for:'tilemode'}))
      .append(
        $('<div class="control">').append(
          $('<div class="select is-fullwidth">').append(this.inputs.tileMode)
        )
      )
      .append(this.tileZipEl)
      .append(this.tilePadEl)
      .append(this.tileUnrealNameEl)
      .append($('<p class="tile-zip-note">').text('Large exports may consume significant browser RAM.'));

    this.sections.heightmap.append(grid(outputFormatColumn.addClass('is-full'), normalisationColumn.addClass('is-full'), normFromColumn, normToColumn));
    this.sections.tiles.append(grid(tileModeColumn.addClass('is-full'), this.els.tileSizeColumn, this.els.tileCountColumn));

    this.inputs.smartNormalisationControl = this.els.smartNormalisationControl.find('select');
    this.inputs.normFrom = this.els.normFrom.find('input');
    this.inputs.normTo = this.els.normTo.find('input');


    const normalisationModeLabel = $('<label class="label">Norm. Mode</label>');
    this.els.smartNormalisationControl.prepend(normalisationModeLabel);
    const normalisationModeLabelInfo = $('<span class="info-icon"> ℹ️ </span>');
    normalisationModeLabel.append(normalisationModeLabelInfo);
    tippy(normalisationModeLabelInfo[0], {
      ...deafultTippyOptions,
      content: `<div class="content"><p>None = No normalisation - the values in the file = metres above sea level.</p>
<p>Regular = Normalises the height values to use the full range of the output format (e.g. 0-65535 for 16 bit PNG).</p>
<p>Smart = Like Regular, but excludes outlier height values (usually errors in the data) from the normalisation calculation to give better results for the majority of terrain.</p></div>`,
    });
  }
  static createCheckbox(label : string, name : string) : {label: JQuery<HTMLLabelElement>, input: JQuery<HTMLInputElement>} {
    const el = $(`<label class="checkbox"><input type="checkbox" name="${name}"> </label>`) as JQuery<HTMLLabelElement>;
    el.append(document.createTextNode(label));
    return {label: el, input: el.find('input') as JQuery<HTMLInputElement>};
  }
  static withInfo(label : JQuery<HTMLElement>, content : string) : JQuery<HTMLElement> {
    const info = $('<span class="info-icon"> ℹ️ </span>');
    label.append(info);
    tippy(info[0], {...deafultTippyOptions, content});
    return label;
  }
  createExtraOutputOptions() {
    this.inputs.waterLevel = App.createInput({
      name: 'waterlevel',
      type: 'number',
      step: '0.1',
      value: '0',
    });
    const flatten = App.createCheckbox('Flatten below water level', 'flattenwater');
    const waterMask = App.createCheckbox('Water mask', 'watermask');
    this.inputs.flattenWater = flatten.input;
    this.inputs.waterMask = waterMask.input;

    this.inputs.normalMap = $(`<select name="normalmap">
      <option value="off" selected>Off</option>
      <option value="directx">DirectX (Unreal)</option>
      <option value="opengl">OpenGL (Godot, Blender, Unity)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    const slope = App.createCheckbox('Slope', 'slopemap');
    const curvature = App.createCheckbox('Curvature', 'curvaturemap');
    const ao = App.createCheckbox('Ambient occlusion', 'aomap');
    const flow = App.createCheckbox('Water flow', 'flowmap');
    const aspect = App.createCheckbox('Aspect + northness', 'aspectmap');
    this.inputs.slopeMap = slope.input;
    this.inputs.curvatureMap = curvature.input;
    this.inputs.aoMap = ao.input;
    this.inputs.flowMap = flow.input;
    this.inputs.aspectMap = aspect.input;

    this.inputs.heightBands = App.createInput({
      name: 'heightbands',
      type: 'text',
      placeholder: 'e.g. 500, 1500',
    });

    App.withInfo(flatten.label, 'Raises everything below the water level up to it. Sea beds otherwise eat a large part of the height range, leaving less precision for the land. Applied before normalisation, so the Z scale shown afterwards accounts for it.');
    App.withInfo(waterMask.label, 'Exports a black and white PNG that is white wherever the terrain is at or below the water level. Good for placing a water plane or painting a shoreline layer. Lakes above sea level are not detected unless you raise the water level to their surface.');

    const waterColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Water Level (m)', {for: 'waterlevel'}), 'Height in metres treated as the water surface. 0 is sea level.'))
      .append($('<div class="control">').append(this.inputs.waterLevel))
      .append(flatten.label)
      .append(waterMask.label);

    const mapsColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Normal Map', {for: 'normalmap'}), 'An RGB normal map of the terrain. Unreal uses DirectX (green down). Godot, Blender and Unity use OpenGL (green up).'))
      .append($('<div class="control">').append($('<div class="select is-fullwidth">').append(this.inputs.normalMap)))
      .append(App.withInfo(slope.label, 'Greyscale slope steepness: black is flat, white is vertical (0 to 90°). Use it to put rock on cliffs and grass on flat ground.'))
      .append(App.withInfo(curvature.label, 'Mid-grey is flat, brighter is ridges and peaks, darker is valleys and gullies. Good for erosion, snow or moss masks.'))
      .append(App.withInfo(ao.label, 'How much open sky each point sees: white is open ground, darker is tucked into valleys, gullies and under cliffs. Multiply it into your material for depth, or use it for moss and dirt.'))
      .append(App.withInfo(flow.label, 'Where water collects as it runs downhill (flow accumulation, after filling pits). Bright lines are streams and rivers, black is ridges. Log scale in real area: less than 0.1 hectare upstream is black, 1 km² is light grey and 100 km² or more is white. Only counts water from inside the exported area.'))
      .append(App.withInfo(aspect.label, 'Two maps. "aspect" is the compass direction each slope faces (1 to 255 = 0 to 360° clockwise from north, 0 = flat). "northness" is white on steep north-facing slopes, mid-grey on flat or east/west ground and black on steep south-facing slopes, handy for snow and moss.'));

    const bandsColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Height Bands (m)', {for: 'heightbands'}), 'Comma-separated heights in metres. Each one splits the terrain into another layer mask, e.g. "500, 1500" gives below 500 m, 500 to 1500 m and above 1500 m. The masks blend smoothly at each edge and add up to full white, so they work as Unreal landscape layer weightmaps.'))
      .append($('<div class="control">').append(this.inputs.heightBands));

    this.els.extraMapsSummary = $('<p class="extra-maps-note">');
    const summaryColumn = $('<div class="column field">')
      .append($('<label class="label">Extra Outputs</label>'))
      .append(this.els.extraMapsSummary);

    this.sections.water.append(waterColumn);
    this.sections.maps.append(mapsColumn, bandsColumn, summaryColumn);
    this.updateExtraMapsSummary();
  }
  createOsmOptions() {
    this.inputs.osmLayers = $('<input type="hidden" name="osmlayers">') as JQuery<HTMLInputElement>;
    this.els.osmChecks = $('<div class="checkbox-list">');
    for (const layer of OSM_LAYERS) {
      const box = App.createCheckbox(layer.label, `osm-${layer.id}`);
      box.input.attr('data-osm', layer.id);
      App.withInfo(box.label, layer.description);
      this.els.osmChecks.append(box.label);
    }
    const weights = App.createCheckbox('Export as weightmaps (sum to 100%)', 'osmweights');
    this.inputs.osmWeights = weights.input;
    App.withInfo(weights.label, 'Instead of one independent mask per layer, write weightmaps that add up to full white at every pixel, plus a "base" layer for whatever is left. Where layers overlap, the more specific one wins (roads over buildings over water over forest over grass and so on). This is what Unreal landscape layers expect.');
    const scripts = App.createCheckbox('Blender & Unreal import scripts', 'importscripts');
    this.inputs.importScripts = scripts.input;
    scripts.input.prop('checked', true);
    App.withInfo(scripts.label, 'After an export, offers a small Python script for Blender that builds the terrain at real size (with the albedo, if it is in the same folder), and one for Unreal that sets the landscape scale and height after you import it. Plus a README with the numbers.');
    this.els.osmNote = $('<p class="extra-maps-note">');
    const label = App.withInfo(App.createLabel('OpenStreetMap Layers'), `Masks drawn from OpenStreetMap for the export area, the same size as the heightmap: white where the feature is. Use them as landscape paint layers, splatmaps or to place foliage. Works for areas up to ${OSM_MAX_AREA_KM2.toLocaleString()} km². Coverage depends on how well your area is mapped. Sea isn't in OpenStreetMap as an area; use the water mask for that.`);
    this.els.columnsOsm = $('<div class="field">').append(label, this.els.osmChecks, weights.label, this.els.osmNote, this.inputs.osmLayers);
    this.sections.osm.append(this.els.columnsOsm);
    this.sections.scripts.append(scripts.label, note('Python scripts for Blender and Unreal, plus a README with the numbers, offered after each heightmap export.'));
    this.els.osmChecks.find('input').on('change', () => {
      this.inputs.osmLayers.val(this.getOsmLayerIds().join(','));
      this.inputs.osmLayers.trigger('change');
    });
  }
  getOsmLayerIds() : string[] {
    return this.els.osmChecks?.find('input:checked').map((_, el) => $(el).attr('data-osm')).get() ?? [];
  }
  /** Tick the layer boxes to match the hidden setting (after loading a link or saved values). */
  syncOsmCheckboxes() {
    if (!this.els.osmChecks) return;
    const ids = (this.inputs.osmLayers.val() ?? '').toString().split(',').filter(Boolean);
    this.els.osmChecks.find('input').each((_, el) => {
      $(el).prop('checked', ids.includes($(el).attr('data-osm')));
    });
    this.updateOsmNote();
  }
  osmGridFor(state : ConfigState) : OsmGrid {
    return {
      zoom: state.zoom,
      x0: state.exactPos.x - state.widthInTiles / 2,
      y0: state.exactPos.y - state.heightInTiles / 2,
      width: Math.round(state.width),
      height: Math.round(state.height),
      rotation: this.getRotation() || undefined,
    };
  }
  updateOsmNote() {
    if (!this.els.osmNote || !this.inputs.width) return;
    this.updateLayerStatus?.();
    const ids = this.getOsmLayerIds();
    const area = bboxAreaKm2(gridBBox(this.osmGridFor(this.getCurrentState())));
    const tooBig = area > OSM_MAX_AREA_KM2;
    this.els.osmNote.toggleClass('has-text-warning', tooBig && ids.length > 0);
    this.els.osmNote.html(ids.length
      ? (tooBig
        ? `This area is ${Math.round(area).toLocaleString()} km², too big for OpenStreetMap layers (max ${OSM_MAX_AREA_KM2.toLocaleString()} km²). They will be skipped.`
        : `${ids.length} layer${ids.length === 1 ? '' : 's'} will be exported with the heightmap. ${osmAttribution}`)
      : 'No OpenStreetMap layers selected.');
  }
  /** Start downloading OSM features for an export; resolves to null when there's nothing to do. */
  fetchOsmForExport(state : ConfigState) : Promise<OsmFeature[] | null> {
    return this.fetchOsm(state, this.osmLayersFor('heightmap'));
  }
  async rasterizeOsmFor(features : OsmFeature[] | null, state : ConfigState) : Promise<DerivedMap[]> {
    if (!features || !this.getOsmLayerIds().length) return [];
    const weights = this.inputs.osmWeights?.is(':checked') ?? false;
    return processor.rasterizeOsm(features, this.osmGridFor(state), this.getOsmLayerIds(), weights);
  }
  hookExtraOutputControls(doHeightsDebounced : () => void) {
    const watch = (key : SettingKey, input : JQuery<HTMLElement>, refreshHeights = false) => {
      input.on('change input', debounce(30, () => {
        const value = this.readSetting(key) ?? '';
        this.storeValue(key, value);
        trackControl(key, App.isCheckbox(input) ? (value === '1' ? 'on' : 'off') : (key === 'normalmap' ? value : undefined));
        this.updateExtraMapsSummary();
        if (refreshHeights) {
          doHeightsDebounced();
        }
      }));
    };
    watch('waterlevel', this.inputs.waterLevel, true);
    watch('flattenwater', this.inputs.flattenWater, true);
    watch('watermask', this.inputs.waterMask);
    watch('normalmap', this.inputs.normalMap);
    watch('slopemap', this.inputs.slopeMap);
    watch('curvaturemap', this.inputs.curvatureMap);
    watch('aomap', this.inputs.aoMap);
    watch('flowmap', this.inputs.flowMap);
    watch('aspectmap', this.inputs.aspectMap);
    watch('heightbands', this.inputs.heightBands);
    watch('osmlayers', this.inputs.osmLayers);
    watch('osmweights', this.inputs.osmWeights);
    watch('importscripts', this.inputs.importScripts);
    this.inputs.osmLayers.on('change', () => this.updateOsmNote());
    [this.inputs.width, this.inputs.height, this.inputs.outputzoom, this.inputs.latitude, this.inputs.longitude].forEach(input => {
      input.on('change input', debounce(100, () => this.updateOsmNote()));
    });
    this.map?.on('moveend', debounce(100, () => this.updateOsmNote()));
  }
  getWaterLevel() : number {
    const level = parseFloat(this.inputs.waterLevel?.val()?.toString() ?? '0');
    return Number.isFinite(level) ? level : 0;
  }
  getDerivedMapOptions() : DerivedMapOptions {
    return {
      normal: (this.inputs.normalMap?.val()?.toString() || 'off') as NormalMapConvention,
      slope: this.inputs.slopeMap?.is(':checked') ?? false,
      curvature: this.inputs.curvatureMap?.is(':checked') ?? false,
      ao: this.inputs.aoMap?.is(':checked') ?? false,
      flow: this.inputs.flowMap?.is(':checked') ?? false,
      aspect: this.inputs.aspectMap?.is(':checked') ?? false,
      waterMask: this.inputs.waterMask?.is(':checked') ?? false,
      heightBands: parseHeightBands(this.inputs.heightBands?.val()?.toString() ?? ''),
    };
  }
  /** Options for the worker: water handling plus any extra maps, sized for this export. */
  getProcessOptions(state : ConfigState, includeMaps : boolean = true, extra : {area? : AreaPlan, terrain? : TerrainOps} = {}) : ExtendedProcessOptions {
    return {
      ...extra,
      water: {
        level: this.getWaterLevel(),
        flatten: this.inputs.flattenWater?.is(':checked') ?? false,
      },
      maps: includeMaps ? this.getDerivedMapOptions() : undefined,
      metresPerPixel: {
        x: state.phys.width / state.width,
        y: state.phys.height / state.height,
      },
    };
  }
  updateExtraMapsSummary() {
    if (!this.els.extraMapsSummary) {
      return;
    }
    const maps = this.getDerivedMapOptions();
    const names : string[] = [];
    if (maps.normal !== 'off') names.push(`normal (${maps.normal === 'directx' ? 'DirectX' : 'OpenGL'})`);
    if (maps.slope) names.push('slope');
    if (maps.curvature) names.push('curvature');
    if (maps.ao) names.push('ambient occlusion');
    if (maps.flow) names.push('water flow');
    if (maps.aspect) names.push('aspect, northness');
    if (maps.waterMask) names.push('water mask');
    if (maps.heightBands.length) names.push(`${maps.heightBands.length + 1} height bands`);
    this.els.extraMapsSummary.text(names.length
      ? `Also exports: ${names.join(', ')}. Saved as 8-bit PNGs alongside the heightmap.`
      : 'No extra maps selected.');
  }
  createMeshOptions() {
    this.inputs.meshFormat = $(`<select name="meshformat">
      <option value="stl" selected>STL (3D printing)</option>
      <option value="obj">OBJ (Blender, most 3D apps)</option>
      <option value="glb">GLB / glTF (engines, web)</option>
      <option value="3mf">3MF (3D printing, colours)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.meshRes = $(`<select name="meshres">
      <option value="128">128</option>
      <option value="256">256</option>
      <option value="512" selected>512</option>
      <option value="1024">1024</option>
      <option value="2048">2048</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.meshSolid = $(`<select name="meshsolid">
      <option value="1" selected>Solid with base</option>
      <option value="0">Top surface only</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.baseThickness = App.createInput({name: 'basethickness', type: 'number', min: '0', step: '0.1', value: '2'});
    this.inputs.meshScale = $(`<select name="meshscale">
      <option value="print" selected>Print size (mm)</option>
      <option value="real">Real world (metres)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.printWidth = App.createInput({name: 'printwidth', type: 'number', min: '1', step: '1', value: '150'});
    this.inputs.exaggeration = App.createInput({name: 'exaggeration', type: 'number', min: '0.1', max: '20', step: '0.1', value: '1'});
    this.inputs.meshSimplify = $(`<select name="meshsimplify">
      <option value="off">Off (full grid)</option>
      <option value="low">Low (visually lossless)</option>
      <option value="medium" selected>Medium (recommended)</option>
      <option value="high">High (smallest files)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.meshTexture = $(`<select name="meshtexture">
      <option value="none" selected>None</option>
      <option value="map">Map imagery (Map Preview Type)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.textureSize = $(`<select name="texturesize">
      <option value="1024">1024 px</option>
      <option value="2048" selected>2048 px</option>
      <option value="4096">4096 px</option>
      <option value="8192">8192 px</option>
    </select>`) as JQuery<HTMLSelectElement>;

    const select = (input : JQuery<HTMLElement>) => $('<div class="control">').append($('<div class="select is-fullwidth">').append(input));
    const control = (input : JQuery<HTMLElement>) => $('<div class="control">').append(input);

    const formatColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('3D Model Format', {for: 'meshformat'}), 'STL for slicers and 3D printing. OBJ for Blender and most 3D apps (Y up, with UVs, so you can drape the albedo or normal map on it). GLB is a single-file glTF for game engines and the web.'))
      .append(select(this.inputs.meshFormat))
      .append(App.withInfo(App.createLabel('Mesh Resolution', {for: 'meshres'}), 'Vertices along the longer side. Higher is more detailed but larger and slower. 512 is plenty for most prints.'))
      .append(select(this.inputs.meshRes))
      .append(App.withInfo(App.createLabel('Simplify', {for: 'meshsimplify'}), 'Uses fewer, bigger triangles where the ground is flat or evenly sloped and keeps them small where it is rough, so files are often 5 to 20 times smaller with no visible difference. Off keeps every grid vertex (huge files). Low stays within about a tenth of the vertex spacing, Medium a quarter, High a half (and never more than 0.2%, 0.5% or 1% of the height range).'))
      .append(select(this.inputs.meshSimplify));

    this.els.baseThicknessLabel = App.createLabel('Base Thickness (mm)', {for: 'basethickness'});
    this.els.baseThicknessColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Shape', {for: 'meshsolid'}), '"Solid with base" closes the model with walls and a flat bottom so it can be printed. "Top surface only" is just the terrain skin, which is what you usually want in Blender or an engine.'))
      .append(select(this.inputs.meshSolid))
      .append(App.withInfo(this.els.baseThicknessLabel, 'Extra material under the lowest point of the terrain, so thin areas still print solidly.'))
      .append(control(this.inputs.baseThickness));

    this.els.printWidthColumn = $('<div class="field">')
      .append(App.withInfo(App.createLabel('Print Width (mm)', {for: 'printwidth'}), 'Length of the longer side of the printed model. Heights scale with it, so the model stays true to life (before exaggeration).'))
      .append(control(this.inputs.printWidth));
    this.els.textureSizeField = $('<div class="field">')
      .append(App.withInfo(App.createLabel('Texture Size', {for: 'texturesize'}), 'Longest side of the texture image. The map zoom is picked to fill it, up to the most detailed imagery available.'))
      .append(select(this.inputs.textureSize));
    const scaleColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Scale', {for: 'meshscale'}), 'Print size scales the model to a width in millimetres. Real world keeps it 1:1 in metres.'))
      .append(select(this.inputs.meshScale))
      .append(this.els.printWidthColumn)
      .append(App.withInfo(App.createLabel('Texture', {for: 'meshtexture'}), 'Drapes the map chosen under "Map Preview Type" (e.g. Esri World Imagery for satellite photos) over the model. GLB embeds it in the file; OBJ comes as a zip with an .mtl and a JPEG. STL can\'t hold colour. Also shown in the 3D preview.'))
      .append(select(this.inputs.meshTexture))
      .append(this.els.textureSizeField);

    this.els.previewButton = $('<button class="button is-info" type="button">3D Preview</button>');
    this.els.meshButton = $('<button class="button is-primary" type="button">Export 3D Model</button>');
    this.els.meshEstimate = $('<p class="mesh-estimate">');
    const actionsColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Height Exaggeration', {for: 'exaggeration'}), 'Multiplies heights only. 1 is true to life; 1.5 to 3 often reads better on small prints of gentle terrain.'))
      .append(control(this.inputs.exaggeration))
      .append($('<div class="buttons mesh-buttons">').append(this.els.previewButton).append(this.els.meshButton))
      .append(this.els.meshEstimate);

    this.els.columnsMesh = $('<div class="columns columns-output columns-output--mesh">')
      .append(formatColumn)
      .append(this.els.baseThicknessColumn)
      .append(scaleColumn)
      .append(actionsColumn);

    this.els.previewContainer = $('<div class="preview3d">').hide();
    this.els.previewCanvas = $('<div class="preview3d__canvas">');
    this.els.previewStatus = $('<div class="preview3d__status">');
    this.els.previewToolbar = $('<div class="preview3d__toolbar">');
    this.els.previewRefresh = $('<button class="button is-small" type="button">Refresh</button>');
    this.els.previewReset = $('<button class="button is-small" type="button">Reset view</button>');
    this.els.previewClose = $('<button class="button is-small" type="button" aria-label="Close preview">Close</button>');
    this.els.previewInfo = $('<span class="preview3d__info">');
    const tiles = App.createCheckbox('3 × 3 tiles', 'previewtiles');
    this.inputs.previewTiles = tiles.input;
    App.withInfo(tiles.label, 'Repeats the model around itself, to check a seamless heightmap joins up. Use "Top surface only" for the clearest view.');
    tiles.input.on('change', () => { trackControl('preview-tiles', tiles.input.is(':checked') ? 'on' : 'off'); this.preview?.setTiling(tiles.input.is(':checked')); });
    this.els.previewToolbar.append(this.els.previewInfo, tiles.label, this.els.previewRefresh, this.els.previewReset, this.els.previewClose);
    this.els.previewContainer.append(this.els.previewToolbar, this.els.previewCanvas, this.els.previewStatus, this.createSunControls());

    this.sections.model.append(this.els.columnsMesh);
    this.els.main.append(this.els.previewContainer);
    this.toggleMeshInputs();
  }
  createContourOptions() {
    this.inputs.contourInterval = App.createInput({name: 'contourinterval', type: 'number', min: '0', step: 'any', placeholder: 'Auto'});
    this.inputs.contourMode = $(`<select name="contourmode">
      <option value="lines" selected>Topo map lines</option>
      <option value="layers">Laser-cut layers (one file)</option>
      <option value="sheets">Laser-cut layers (one SVG per sheet)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.contourFormat = $(`<select name="contourformat">
      <option value="svg" selected>SVG (print, laser cutters, Inkscape)</option>
      <option value="dxf">DXF (CAD, metres, with elevations)</option>
    </select>`) as JQuery<HTMLSelectElement>;
    this.inputs.contourWidth = App.createInput({name: 'contourwidth', type: 'number', min: '10', step: '1', value: '300'});
    this.inputs.contourSmooth = $(`<select name="contoursmooth">
      <option value="0">None</option>
      <option value="1" selected>Light</option>
      <option value="2">Medium</option>
      <option value="4">Strong</option>
    </select>`) as JQuery<HTMLSelectElement>;
    const select = (input : JQuery<HTMLElement>) => $('<div class="control">').append($('<div class="select is-fullwidth">').append(input));
    const control = (input : JQuery<HTMLElement>) => $('<div class="control">').append(input);
    this.els.contourButton = $('<button class="button is-primary" type="button">Export Contours</button>');
    this.els.contourNote = $('<p class="mesh-estimate">');
    this.els.contourPreview = button('Preview on map', 'is-small is-info is-light');
    this.els.contourHide = button('Hide preview', 'is-small').hide();
    this.els.contourPreviewNote = note();
    this.els.columnsContours = $('<div class="columns columns-output columns-output--contours">')
      .append($('<div class="column field">')
        .append(App.withInfo(App.createLabel('Contour Interval (m)', {for: 'contourinterval'}), 'Height between lines in metres. Leave empty to pick a round number giving about 20 levels. Every 5th line is drawn thicker (index contours).'))
        .append(control(this.inputs.contourInterval))
        .append(App.withInfo(App.createLabel('Smoothing', {for: 'contoursmooth'}), 'Blurs the terrain slightly first, so lines are smooth rather than jagged from noise in the elevation data.'))
        .append(select(this.inputs.contourSmooth)))
      .append($('<div class="column field">')
        .append(App.withInfo(App.createLabel('Style', {for: 'contourmode'}), '<div class="content"><p><b>Topo map lines</b>: ordinary contour lines for maps and prints.</p><p><b>Laser-cut layers</b>: each level is a closed outline of all ground at or above it (closed along the edges), ready to cut from card, wood or acrylic and stack. "One SVG per sheet" gives a file per layer in a zip, with alignment marks and the next layer engraved as a gluing guide.</p></div>'))
        .append(select(this.inputs.contourMode))
        .append(App.withInfo(App.createLabel('Format', {for: 'contourformat'}), 'SVG is sized in millimetres for printing and laser cutting. DXF is in real-world metres (origin at the south-west corner) with each line at its height, one CAD layer per level.'))
        .append(select(this.inputs.contourFormat)))
      .append($('<div class="column field">')
        .append(App.withInfo(App.createLabel('SVG Width (mm)', {for: 'contourwidth'}), 'Printed width of the SVG. The height follows the area\'s shape.'))
        .append(control(this.inputs.contourWidth))
        .append($('<div class="buttons mesh-buttons">').append(this.els.contourButton))
        .append(this.els.contourNote));
    this.sections.contours.append(this.els.columnsContours,
      $('<div class="buttons are-small">').append(this.els.contourPreview, this.els.contourHide), this.els.contourPreviewNote);
  }
  hookContourControls() {
    const keys : [SettingKey, JQuery<HTMLElement>][] = [
      ['contourinterval', this.inputs.contourInterval],
      ['contourmode', this.inputs.contourMode],
      ['contourformat', this.inputs.contourFormat],
      ['contourwidth', this.inputs.contourWidth],
      ['contoursmooth', this.inputs.contourSmooth],
    ];
    for (const [key, input] of keys) {
      input.on('change input', debounce(30, () => {
        this.storeValue(key, this.readSetting(key) ?? '');
        trackControl(key, input.is('select') ? this.readSetting(key) : undefined);
        this.toggleContourInputs();
        if (this.contourLayer && key !== 'contourformat' && key !== 'contourwidth') this.refreshContourPreview();
      }));
    }
    this.els.contourPreview.on('click', () => { trackEvent('contours/preview'); this.previewContours(); });
    this.els.contourHide.on('click', () => this.hideContourPreview());
    this.els.contourButton.on('click', debounce(100, () => {
      trackEvent(`generate/contours/${this.inputs.contourFormat.val()}/${this.inputs.contourMode.val()}`);
      this.exportContours();
      countDonatePrompt();
    }));
    this.toggleContourInputs();
  }
  toggleContourInputs() {
    const dxf = this.inputs.contourFormat.val() === 'dxf';
    this.inputs.contourWidth.prop('disabled', dxf);
    if (dxf && this.inputs.contourMode.val() === 'sheets') {
      this.els.contourNote.text('DXF puts every layer in one file (one CAD layer per level).');
    } else {
      this.els.contourNote.text('');
    }
  }
  async exportContours() {
    if (this.isOutputZoomTooHigh()) {
      this.displayError({text: `Cannot export contours above output zoom ${this.getMaxOutputZoom()} with this elevation source`});
      return;
    }
    const button = this.els.contourButton;
    button.prop('disabled', true).addClass('is-loading');
    this.resetOutput();
    try {
      this.getElevationSource().resetStats();
      const input = await this.fetchRawHeights(1024, (msg, pct) => this.showProcessingProgress(msg, pct));
      this.showProcessingProgress('Tracing contours…', 95);
      const mode = (this.inputs.contourMode.val() ?? 'lines').toString();
      const contourFormat = (this.inputs.contourFormat.val() ?? 'svg').toString() as ContourJob['format'];
      const state = this.getCurrentState();
      const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
      const job : ContourJob = {
        interval: Math.max(0, parseFloat((this.inputs.contourInterval.val() ?? '').toString()) || 0),
        mode: mode === 'lines' ? 'lines' : 'layers',
        format: contourFormat,
        widthMm: Math.max(10, parseFloat((this.inputs.contourWidth.val() ?? '').toString()) || 300),
        smooth: parseInt((this.inputs.contourSmooth.val() ?? '1').toString(), 10) || 0,
        separateSheets: mode === 'sheets',
        title: base,
      };
      const result : ContourResult = await processor.buildContours(input, job);
      this.hideProcessingProgress();
      let filename : string;
      let blob : Blob;
      if (result.files.length === 1) {
        const ext = result.files[0].name.split('.').pop();
        filename = `${base}_contours_${mode}.${ext}`;
        blob = new Blob([result.files[0].text], {type: ext === 'svg' ? 'image/svg+xml' : 'application/dxf'});
      } else {
        const zip = new JSZip();
        for (const file of result.files) zip.file(file.name, file.text);
        blob = await zip.generateAsync({type: 'blob'});
        filename = `${base}_contour_sheets.zip`;
      }
      this.download(blob, filename);
      this.els.outputText.html('');
      this.els.outputText.append($('<p>').text(
        `Saved ${filename}: ${result.levels} levels every ${localFormatNumber(result.interval, 2)} m, from ${localFormatNumber(result.min, 0)} m to ${localFormatNumber(result.max, 0)} m${result.files.length > 1 ? ` (${result.files.length} sheets)` : ''}.`
      ));
      this.els.outputText.append($('<p>').html(`${this.describeElevationDetail(state.latitude, input.zoom)} ${this.getElevationSource().attributionHtml}`));
      this.showResults();
    } catch (e) {
      console.error('Failed to export contours', e);
      this.hideProcessingProgress();
      this.displayError({text: 'Could not build the contours. Please try again, or use a larger interval.'});
    } finally {
      button.prop('disabled', false).removeClass('is-loading');
      currentRequests = [];
    }
  }
  createSunControls() : JQuery<HTMLElement> {
    const today = new Date();
    const pad = (n : number) => n.toString().padStart(2, '0');
    const realSun = App.createCheckbox('Real sun', 'previewsun');
    const shadows = App.createCheckbox('Shadows', 'previewshadows');
    shadows.input.prop('checked', true);
    this.inputs.previewSun = realSun.input;
    this.inputs.previewShadows = shadows.input;
    this.inputs.sunDate = App.createInput({type: 'date', class: 'input is-small', value: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`});
    this.inputs.sunTime = $('<input type="range" min="0" max="1439" step="5" value="600" aria-label="Time of day (solar time)">') as JQuery<HTMLInputElement>;
    this.els.sunPlay = $('<button class="button is-small" type="button" aria-label="Play a day">▶</button>');
    this.els.sunReadout = $('<span class="preview3d__sun-readout">');
    App.withInfo(realSun.label, 'Light the model from where the sun really is over this place on the chosen date and time, with shadows. Times are local solar time (the sun is highest at 12:00), which can differ from clock time by an hour or more.');
    const bar = $('<div class="preview3d__sun">').append(
      realSun.label, this.inputs.sunDate, this.els.sunPlay, this.inputs.sunTime, this.els.sunReadout, shadows.label,
    );
    const update = () => this.updatePreviewSun();
    this.inputs.previewSun.on('change', () => { trackControl('preview-sun', this.inputs.previewSun.is(':checked') ? 'on' : 'off'); update(); });
    this.inputs.previewShadows.on('change', update);
    this.inputs.sunDate.on('change input', update);
    this.inputs.sunTime.on('input change', () => {
      if (!this.inputs.previewSun.is(':checked')) this.inputs.previewSun.prop('checked', true);
      update();
    });
    let timer : number | null = null;
    this.els.sunPlay.on('click', () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
        this.els.sunPlay.text('▶');
        return;
      }
      trackEvent('preview/sun-play');
      this.inputs.previewSun.prop('checked', true);
      this.els.sunPlay.text('❚❚');
      timer = window.setInterval(() => {
        if (this.previewView === 'map') {
          window.clearInterval(timer);
          timer = null;
          this.els.sunPlay.text('▶');
          return;
        }
        const minutes = (parseInt(this.inputs.sunTime.val().toString(), 10) + 5) % 1440;
        this.inputs.sunTime.val(minutes);
        update();
      }, 40);
    });
    update();
    return bar;
  }
  /** Date the sun controls describe, in UTC, from a local solar time at this longitude. */
  getSunDate() : Date {
    const [y, m, d] = (this.inputs.sunDate.val() || '').toString().split('-').map(n => parseInt(n, 10));
    const now = new Date();
    const minutes = parseInt(this.inputs.sunTime.val().toString(), 10) || 0;
    const lng = parseFloat(this.inputs.longitude.val().toString()) || 0;
    // Solar time runs ahead of UTC by 4 minutes per degree east
    const utcMinutes = minutes - lng * 4;
    return new Date(Date.UTC(y || now.getUTCFullYear(), (m || now.getUTCMonth() + 1) - 1, d || now.getUTCDate(), 0, 0, 0) + utcMinutes * 60000);
  }
  updatePreviewSun() {
    const minutes = parseInt(this.inputs.sunTime?.val()?.toString() ?? '600', 10) || 0;
    const clock = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
    if (!this.inputs.previewSun?.is(':checked')) {
      this.els.sunReadout?.text(`${clock} · default lighting`);
      this.preview?.setSun(null);
      return;
    }
    const lat = parseFloat(this.inputs.latitude.val().toString()) || 0;
    const lng = parseFloat(this.inputs.longitude.val().toString()) || 0;
    const date = this.getSunDate();
    const pos = sunPosition(date, lat, lng);
    const times = sunTimes(date, lat, lng);
    const solar = (t : Date | null) => {
      if (!t) return '–';
      const mins = ((t.getUTCHours() * 60 + t.getUTCMinutes() + lng * 4) % 1440 + 1440) % 1440;
      return `${Math.floor(mins / 60).toString().padStart(2, '0')}:${Math.round(mins % 60).toString().padStart(2, '0')}`;
    };
    const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((pos.azimuth % 360) + 360) % 360 / 45) % 8];
    const riseSet = times.sunrise && times.sunset ? ` · rise ${solar(times.sunrise)}, set ${solar(times.sunset)}` : (pos.altitude > 0 ? ' · midnight sun' : ' · polar night');
    this.els.sunReadout.text(`${clock} · sun ${pos.altitude.toFixed(0)}° up in the ${compass}${riseSet}`);
    this.preview?.setSun({
      direction: sunDirectionZUp(pos.azimuth, pos.altitude),
      altitude: pos.altitude,
      shadows: this.inputs.previewShadows.is(':checked'),
    });
  }
  hookMeshControls() {
    const meshKeys : [SettingKey, JQuery<HTMLElement>][] = [
      ['meshformat', this.inputs.meshFormat],
      ['meshres', this.inputs.meshRes],
      ['meshsolid', this.inputs.meshSolid],
      ['basethickness', this.inputs.baseThickness],
      ['meshscale', this.inputs.meshScale],
      ['printwidth', this.inputs.printWidth],
      ['exaggeration', this.inputs.exaggeration],
      ['meshsimplify', this.inputs.meshSimplify],
      ['meshtexture', this.inputs.meshTexture],
      ['texturesize', this.inputs.textureSize],
    ];
    this.inputs.meshTexture.on('change', () => this.updatePreviewTexture());
    this.inputs.maptype.on('change', debounce(200, () => this.updatePreviewTexture()));
    const rebuildPreview = debounce(150, () => this.rebuildPreviewMesh(false));
    for (const [key, input] of meshKeys) {
      input.on('change input', debounce(30, () => {
        const value = this.readSetting(key) ?? '';
        this.storeValue(key, value);
        trackControl(key, input.is('select') ? value : undefined);
        this.toggleMeshInputs();
        this.updateMeshEstimate();
        rebuildPreview();
      }));
    }
    this.els.meshButton.on('click', debounce(100, () => {
      trackEvent(`generate/mesh/${this.inputs.meshFormat.val()}/${this.getMeshOptions().solid ? 'solid' : 'surface'}`);
      this.exportMesh();
      countDonatePrompt();
    }));
    this.els.previewButton.on('click', debounce(100, () => {
      trackEvent('preview/3d');
      this.openPreview();
    }));
    this.els.previewRefresh.on('click', () => { trackEvent('preview/refresh'); this.refreshPreview(); });
    this.els.previewReset.on('click', () => { trackEvent('preview/reset-view'); this.preview?.frameMesh(); });
    this.els.previewClose.on('click', () => { trackEvent('preview/close'); this.closePreview(); });
    // Keep the size estimate current as the area changes
    [this.inputs.width, this.inputs.height, this.inputs.outputzoom].forEach(input => {
      input.on('change input', debounce(60, () => this.updateMeshEstimate()));
    });
    this.updateMeshEstimate();
  }
  getMeshOptions() : MeshOptions {
    const num = (input : JQuery<HTMLElement>, fallback : number) => {
      const v = parseFloat((input?.val() ?? '').toString());
      return Number.isFinite(v) ? v : fallback;
    };
    return {
      resolution: Math.max(2, Math.round(num(this.inputs.meshRes, defaultMeshOptions.resolution))),
      solid: (this.inputs.meshSolid?.val() ?? '1').toString() === '1',
      baseThickness: Math.max(0, num(this.inputs.baseThickness, defaultMeshOptions.baseThickness)),
      scale: ((this.inputs.meshScale?.val() ?? 'print').toString() as MeshScale),
      printWidth: Math.max(1, num(this.inputs.printWidth, defaultMeshOptions.printWidth)),
      exaggeration: Math.max(0.01, num(this.inputs.exaggeration, defaultMeshOptions.exaggeration)),
    };
  }
  getSimplifyPreset() : SimplifyPreset {
    return ((this.inputs.meshSimplify?.val() ?? 'medium').toString() as SimplifyPreset);
  }
  wantsMeshTexture() : boolean {
    return (this.inputs.meshTexture?.val() ?? 'none').toString() === 'map';
  }
  getMeshFormat() : MeshFormat {
    return ((this.inputs.meshFormat?.val() ?? 'stl').toString() as MeshFormat);
  }
  toggleMeshInputs() {
    if (!this.inputs.meshSolid) return;
    const opts = this.getMeshOptions();
    this.inputs.baseThickness.prop('disabled', !opts.solid);
    this.els.baseThicknessLabel.contents().first()[0].textContent = `Base Thickness (${opts.scale === 'print' ? 'mm' : 'm'})`;
    this.els.printWidthColumn.toggleClass('is-disabled', opts.scale !== 'print');
    this.inputs.printWidth.prop('disabled', opts.scale !== 'print');
    const stl = this.getMeshFormat() === 'stl' || this.getMeshFormat() === '3mf';
    this.inputs.meshTexture.prop('disabled', stl);
    this.updatePrintNote?.();
    this.els.textureSizeField.toggleClass('is-disabled', stl || !this.wantsMeshTexture());
    this.inputs.textureSize.prop('disabled', stl || !this.wantsMeshTexture());
  }
  updateMeshEstimate() {
    if (!this.els.meshEstimate || !this.inputs.width) return;
    const state = this.getCurrentState();
    const opts = this.getMeshOptions();
    const grid = meshGridSize(state.width, state.height, opts.resolution);
    const tris = triangleCount(grid.width, grid.height, opts.solid);
    const bytes = estimateFileBytes(this.getMeshFormat(), grid.width, grid.height, opts.solid);
    const mb = bytes / (1024 * 1024);
    let footprint : string;
    if (opts.scale === 'print') {
      const longest = Math.max(state.phys.width, state.phys.height) || 1;
      footprint = `${localFormatNumber(state.phys.width / longest * opts.printWidth, 0)} × ${localFormatNumber(state.phys.height / longest * opts.printWidth, 0)} mm`;
    } else {
      footprint = `${localFormatNumber(state.phys.width / 1000, 2)} × ${localFormatNumber(state.phys.height / 1000, 2)} km`;
    }
    const preset = this.getSimplifyPreset();
    const simplified = preset !== 'off';
    let size = `${localFormatNumber(tris, 0)} triangles, ~${localFormatNumber(mb, mb < 10 ? 1 : 0)} MB`;
    if (simplified) {
      const estTris = estimateSimplifiedTriangles(grid.width, grid.height, opts.solid, preset);
      const estMb = estimateFileBytes(this.getMeshFormat(), grid.width, grid.height, opts.solid, {triangles: estTris, vertices: Math.round(estTris / 2)}) / (1024 * 1024);
      size = `roughly ${localFormatNumber(estTris, 0)} triangles, ~${localFormatNumber(estMb, estMb < 10 ? 1 : 0)} MB (full grid would be ${localFormatNumber(mb, mb < 10 ? 1 : 0)} MB; rough terrain keeps more)`;
    }
    this.els.meshEstimate.text(`${grid.width} × ${grid.height} grid, ${size}. Footprint ${footprint}.`);
    this.els.meshEstimate.toggleClass('is-warning', mb > 250 && !simplified);
  }
  /**
   * Fetch real heights in metres for the current area, at a zoom just detailed
   * enough for `targetResolution` samples on the longer side. Water flattening
   * is applied; normalisation is not.
   */
  async fetchRawHeights(targetResolution : number, onProgress? : (message : string, percent : number) => void, purpose : 'model' | 'preview' | 'raw' = 'raw') : Promise<MeshInput & {zoom: number, state: ConfigState, features: OsmFeature[] | null}> {
    const full = this.getCurrentState();
    // Drop whole zoom levels while the grid stays at least as big as needed
    let scale = 1;
    while (Math.max(full.width, full.height) * scale / 2 >= targetResolution && full.z + Math.log2(scale / 2) >= 1) {
      scale /= 2;
    }
    const state = this.getCurrentState(scale);
    const plan = this.planFor(state);
    const osmIds = this.osmLayersFor(purpose);
    const osm = this.fetchOsm(state, osmIds, purpose === 'preview');
    const items = this.buildTileFetchList(plan.fetchState);
    let loaded = 0;
    const results = await promiseAllInBatches((item) => this.fetchImage(item, plan.fetchState).then(r => {
      loaded++;
      onProgress?.(`Downloading terrain tiles (${loaded}/${items.length})`, loaded / items.length * 75);
      return r;
    }), items, 200, 0);
    if (osmIds.length) onProgress?.('Downloading OpenStreetMap…', 78);
    const features = await osm;
    onProgress?.('Stitching terrain…', 85);
    const output = await processor.combineImages(
      this.prepareWorkerStates(results),
      NormaliseMode.Off,
      normDefaults,
      undefined,
      this.getProcessOptions(state, false, {area: plan.area, terrain: this.terrainOpsFor(state, purpose, features)})
    ) as NormaliseResult<Float32Array>;
    const width = output.width ?? Math.round(state.width);
    return {
      heights: output.data,
      width,
      height: output.height ?? Math.floor(output.data.length / width),
      physWidth: state.phys.width,
      physHeight: state.phys.height,
      zoom: state.z,
      state,
      features,
    };
  }
  /** Mesh extras (buildings, label, colour bands, lithophane) for the current settings. */
  meshExtras(input : {state : ConfigState, features : OsmFeature[] | null}, forPrint : boolean) : MeshExtras {
    const extras : MeshExtras = {};
    if (this.wantsBuildings() && input.features) {
      const h = parseFloat((this.inputs.buildingHeight?.val() ?? '8').toString());
      extras.buildings = {features: input.features.filter(f => f.layer === 'buildings'), grid: this.osmGridFor(input.state), options: {defaultHeight: Number.isFinite(h) ? h : 8}};
    }
    if (!forPrint) return extras;
    if (this.inputs.label?.is(':checked')) {
      const state = this.getCurrentState();
      const name = (this.inputs.labelText?.val() ?? '').toString() || this.placeName();
      extras.label = {lines: [name, this.formatCoord(state.latitude, state.longitude)].filter(Boolean), depth: 12, color: '#FFFFFF'};
    }
    const bands = parseInt((this.inputs.colorBands?.val() ?? '0').toString(), 10) || 0;
    if (bands > 1) {
      const levels = (this.inputs.bandLevels?.val() ?? '').toString().split(/[,;\s]+/).map(parseFloat).filter(Number.isFinite);
      extras.bands = {colors: this.getBandColors().slice(0, bands), levels: levels.slice(0, bands - 1)};
    }
    if (this.inputs.lithophane?.is(':checked')) {
      const min = parseFloat((this.inputs.lithoMin?.val() ?? '0.8').toString());
      const max = parseFloat((this.inputs.lithoMax?.val() ?? '3').toString());
      extras.lithophane = {minThickness: Number.isFinite(min) ? min : 0.8, maxThickness: Math.max((Number.isFinite(min) ? min : 0.8) + 0.2, Number.isFinite(max) ? max : 3), zFactor: 2};
    }
    return extras;
  }
  async exportMesh() {
    if (this.isOutputZoomTooHigh()) {
      this.displayError({text: `Cannot export a 3D model above output zoom ${this.getMaxOutputZoom()} with this elevation source`});
      return;
    }
    const button = this.els.meshButton;
    button.prop('disabled', true).addClass('is-loading');
    this.resetOutput();
    try {
      const opts = this.getMeshOptions();
      const meshFormat = this.getMeshFormat();
      this.getElevationSource().resetStats();
      const input = await this.fetchRawHeights(opts.resolution, (msg, pct) => this.showProcessingProgress(msg, pct), 'model');
      const extras = this.meshExtras(input, true);
      const meshInput : MeshInput = {heights: input.heights, width: input.width, height: input.height, physWidth: input.physWidth, physHeight: input.physHeight};
      this.showProcessingProgress(`Building ${meshFormat.toUpperCase()} mesh…`, 92);
      const state = this.getCurrentState();
      const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
      const name = `${base}_terrain_${opts.solid ? 'solid' : 'surface'}`;
      let texture : {mimeType: 'image/jpeg', data: Uint8Array, filename: string} | undefined;
      if (this.wantsMeshTexture() && meshFormat !== 'stl' && meshFormat !== '3mf' && !extras.lithophane) {
        const canvas = await this.fetchMapImage(this.getTextureSize(), (msg, pct) => this.showProcessingProgress(msg, 92 + pct * 0.04));
        texture = {mimeType: 'image/jpeg', data: await App.canvasToJpeg(canvas), filename: `${name}_texture.jpg`};
      }
      this.showProcessingProgress(`Building ${meshFormat.toUpperCase()} mesh…`, 97);
      const preset = this.getSimplifyPreset();
      // The texture is copied (not transferred) so the OBJ zip can still use it
      const result = await processor.buildMeshFile(meshInput, opts, meshFormat, extras.lithophane ? `${base}_lithophane` : name, preset, texture, extras);
      this.hideProcessingProgress();
      let filename = extras.lithophane ? `${base}_lithophane.${meshFormat === '3mf' ? '3mf' : 'stl'}` : `${name}.${meshFormat}`;
      let blob = new Blob([result.buffer], {type: meshFormat === 'obj' ? 'text/plain' : 'application/octet-stream'});
      if (meshFormat === 'obj' && result.mtl && texture) {
        // OBJ needs its material and image beside it, so ship them together
        const zip = new JSZip();
        zip.file(filename, blob);
        zip.file(`${name}.mtl`, result.mtl);
        zip.file(texture.filename, texture.data);
        blob = await zip.generateAsync({type: 'blob'});
        filename = `${name}_obj.zip`;
      }
      this.download(blob, filename);
      const sizeMb = blob.size / (1024 * 1024);
      const unitsText = result.units === 'mm' ? 'millimetres' : 'metres';
      this.els.outputText.html('');
      const fullTris = triangleCount(result.gridWidth, result.gridHeight, opts.solid);
      const simplifiedText = preset !== 'off'
        ? ` (simplified from ${localFormatNumber(fullTris, 0)}, max error ${localFormatNumber(result.simplifyError, result.simplifyError < 1 ? 2 : 1)} m)`
        : '';
      this.els.outputText.append($('<p>').text(
        `Saved ${filename}: ${localFormatNumber(result.vertices, 0)} vertices, ${localFormatNumber(result.triangles, 0)} triangles${simplifiedText}, ${localFormatNumber(sizeMb, 1)} MB. Units: ${unitsText}.${texture ? ' Textured with ' + this.layers[this.layer]?.label + '.' : ''}${result.notes?.length ? ' Includes ' + result.notes.join(', ') + '.' : ''}`
      ));
      if (result.bands?.length) {
        const list = $('<ul class="band-list">');
        result.bands.forEach((b : {from : number, to : number, z : number, color : string}, i : number) => list.append($('<li>').append(
          $('<span class="painter__swatch">').css('background', b.color),
          document.createTextNode(` Part ${i + 1}: ${localFormatNumber(b.from, 0)} to ${localFormatNumber(b.to, 0)} m${i > 0 ? `, starts at Z = ${localFormatNumber(b.z, 2)} mm (colour change height for one-extruder printing)` : ''}`),
        )));
        this.els.outputText.append($('<p>').text('Colour bands (one part each in the 3MF; assign a filament to each part in your slicer):'), list);
      }
      this.els.outputText.append($('<p>').html(`${this.describeElevationDetail(state.latitude, input.zoom)} ${this.getElevationSource().attributionHtml}`));
      if (meshFormat === 'obj' || meshFormat === 'glb') {
        this.els.outputText.append($('<p>').text('Y is up and the model is centred on the origin. UVs cover the top surface 0–1, so an albedo or normal map exported for the same area lines up directly.'));
      }
      this.showResults();
    } catch (e) {
      console.error('Failed to export mesh', e);
      this.hideProcessingProgress();
      this.displayError({text: 'Could not build the 3D model. Please try again, or lower the mesh resolution.'});
    } finally {
      button.prop('disabled', false).removeClass('is-loading');
      currentRequests = [];
    }
  }
  /** Identifies the terrain the preview was built from, so we know when it's stale. */
  getPreviewKey() : string {
    const s = this.readSettings();
    const round = (v? : string) => v === undefined ? '' : (+v).toFixed(5);
    return [s.elevsource, round(s.latitude), round(s.longitude), s.outputzoom, s.width, s.height, s.waterlevel, s.flattenwater,
      s.rotation, s.shape, s.seammode, s.seamperiod, s.seamoverlap, s.sealevel, s.carveroads, s.carverail, s.carverivers, s.carvelakes,
      s.carveshoulder, s.carvedepth, s.buildings, s.buildingheight]
      .map(v => v ?? '').join('|');
  }
  async openPreview(view : '3d' | 'split' = this.previewView === '3d' ? '3d' : 'split') {
    this.setView(view);
    if (!this.preview) {
      this.els.previewStatus.text('Loading 3D viewer…').show();
      try {
        const {TerrainPreview} = await import(/* webpackChunkName: "preview3d" */ './preview3d');
        this.preview = new TerrainPreview(this.els.previewCanvas[0]);
        await this.preview.init();
      } catch (e) {
        console.error('Failed to start 3D preview', e);
        this.els.previewStatus.text('Sorry, the 3D preview could not start in this browser (WebGL is needed).');
        this.preview = null;
        return;
      }
    }
    await this.refreshPreview();
  }
  getTextureSize() : number {
    return parseInt((this.inputs.textureSize?.val() ?? '2048').toString(), 10) || 2048;
  }
  previewTextureKey : string = '';
  /** Drape the map imagery over the preview when a texture is chosen. */
  async updatePreviewTexture() {
    if (!this.preview || this.previewView === 'map') return;
    if (!this.wantsMeshTexture()) {
      this.previewTextureKey = '';
      this.preview.setTexture(null);
      return;
    }
    const key = `${this.getPreviewKey()}|${this.activeLayerKey()}`;
    if (key === this.previewTextureKey) return;
    this.previewTextureKey = key;
    try {
      this.els.previewStatus.text('Loading map imagery…').show();
      const canvas = await this.fetchMapImage(Math.min(2048, this.getTextureSize()), (msg) => this.els.previewStatus.text(msg));
      if (key !== this.previewTextureKey) return;
      this.preview.setTexture(canvas);
    } catch (e) {
      console.error('Preview texture failed', e);
    } finally {
      this.els.previewStatus.hide();
    }
  }
  closePreview() {
    this.setView('map');
  }
  async refreshPreview() {
    if (this.previewBusy) return;
    if (this.isOutputZoomTooHigh()) {
      this.els.previewStatus.text(`Output zoom is too high (>${this.getMaxOutputZoom()}) for this elevation source.`).show();
      return;
    }
    this.previewBusy = true;
    this.els.previewStatus.text('Loading terrain…').show();
    try {
      const key = this.getPreviewKey();
      // The preview stays light: at most 384 vertices a side
      const input = await this.fetchRawHeights(Math.min(384, this.getMeshOptions().resolution),
        (msg) => this.els.previewStatus.text(msg), 'preview');
      this.previewCache = {key, input};
      await this.rebuildPreviewMesh(true);
      this.updatePreviewTexture();
    } catch (e) {
      console.error('Preview failed', e);
      this.els.previewStatus.text('Could not load terrain for the preview. Please try again.').show();
    } finally {
      this.previewBusy = false;
      currentRequests = [];
    }
  }
  async rebuildPreviewMesh(reframe : boolean) {
    if (!this.preview || !this.previewCache || this.previewView === 'map') return;
    const opts = this.getMeshOptions();
    const previewOpts : MeshOptions = {...opts, resolution: Math.min(384, opts.resolution)};
    const cache = this.previewCache.input;
    // Send a copy: the cache is reused for later option changes
    const extras = this.meshExtras(this.previewCache.input as any, false);
    const meshInput : MeshInput = {heights: cache.heights.slice(0), width: cache.width, height: cache.height, physWidth: cache.physWidth, physHeight: cache.physHeight};
    const data = await processor.buildPreviewMesh(meshInput, previewOpts, this.getSimplifyPreset(), extras) as PreviewMeshData & {gridWidth: number, gridHeight: number, triangles: number};
    const flatten = this.inputs.flattenWater?.is(':checked') ?? false;
    const showWater = flatten || (this.inputs.waterMask?.is(':checked') ?? false) || this.getSeaLevel() !== 0;
    this.preview.setMesh(data, {waterLevel: showWater ? (flatten || this.inputs.waterMask?.is(':checked') ? this.getWaterLevel() : 0) : null}, reframe);
    this.preview.setTiling(this.inputs.previewTiles?.is(':checked') ?? false);
    this.updatePreviewSun();
    const stale = this.previewCache.key !== this.getPreviewKey();
    this.els.previewInfo.text(`Preview ${data.gridWidth} × ${data.gridHeight}, ${localFormatNumber(data.triangles, 0)} triangles${stale ? ' · area changed, press Refresh' : ''}. Drag to orbit, right-drag to pan, scroll to zoom.`);
    this.els.previewStatus.hide();
  }
  /* ------------------------------------------------------------------ */
  /* New feature controls                                                */
  /* ------------------------------------------------------------------ */
  createAreaOptions() {
    this.inputs.rotation = numberInput('rotation', {min: '-360', max: '360', step: '1', value: '0'});
    this.els.rotationRange = $('<input type="range" class="ui-range" min="-180" max="180" step="1" value="0" aria-label="Rotation">');
    this.inputs.shape = $('<input type="hidden" name="shape">') as JQuery<HTMLInputElement>;
    this.els.shapeDraw = button('Draw a custom shape');
    this.els.shapeClear = button('Clear shape', 'is-small is-light');
    this.els.shapeNote = note();
    this.sections.shape.append(
      grid(
        field('Rotation (° clockwise)', this.inputs.rotation, {tip: 'Turns the export area about its centre, so a valley or ridge can run along the heightmap. 90° makes the top of the image point east. Heights, masks, splines and models all follow the rotation. World files include the rotation; GeoTIFFs are written unrotated.'}),
        $('<div class="field ui-field">').append($('<label class="label">').html('&nbsp;'), this.els.rotationRange),
      ),
      $('<div class="buttons are-small">').append(this.els.shapeDraw, this.els.shapeClear),
      this.els.shapeNote,
      this.inputs.shape,
    );
    const rotationChanged = debounce(40, () => {
      this.storeValue('rotation', this.readSetting('rotation') ?? '0');
      trackControl('rotation');
      this.updatePhysicalDimensions();
      this.updateOsmNote();
      this.doHeightsDebounced?.();
    });
    this.els.rotationRange.on('input', () => {
      this.inputs.rotation.val(this.els.rotationRange.val());
      rotationChanged();
    });
    this.inputs.rotation.on('change input', () => {
      this.els.rotationRange.val(this.getRotation() > 180 ? this.getRotation() - 360 : this.getRotation());
      rotationChanged();
    });
    this.els.shapeDraw.on('click', () => this.startShapeDrawing());
    this.els.shapeClear.on('click', () => this.setShape([]));

    this.inputs.seamMode = selectInput('seammode', [['off', 'Off'], ['seamcut', 'Seam cutting (recommended)'], ['smooth', 'Smooth only'], ['mirror', 'Mirror (2 × 2)']]);
    this.inputs.seamPeriod = selectInput('seamperiod', [['texture', 'Repeats every N pixels (texture)'], ['landscape', 'Last row = first row (landscape)']]);
    this.inputs.seamOverlap = numberInput('seamoverlap', {min: '3', max: '30', step: '1', value: '12'});
    this.els.seamScore = note();
    this.sections.seamless.append(
      note('Makes the heightmap repeat without a visible join, for tiling backgrounds, distant terrain or endless levels. <b>Seam cutting</b> fetches a strip of extra terrain past the edges and joins the two sides along the path where they differ least (usually a valley floor), then spreads out any remaining tilt. <b>Smooth only</b> just spreads the tilt. <b>Mirror</b> repeats a mirrored copy of the middle of the area.'),
      grid(
        field('Mode', selectControl(this.inputs.seamMode), {full: true}),
        field('Repeat', selectControl(this.inputs.seamPeriod), {full: true, tip: 'Textures and most engines repeat every N pixels. Unreal landscape sections placed side by side share their edge vertices, so they need the last row and column to equal the first.'}),
        field('Overlap strip (%)', this.inputs.seamOverlap, {tip: 'Width of the extra strip used for seam cutting, as a share of the shorter side. Wider strips find better joins.'}),
      ),
      this.els.seamScore,
    );
    for (const [key, input] of [['seammode', this.inputs.seamMode], ['seamperiod', this.inputs.seamPeriod], ['seamoverlap', this.inputs.seamOverlap]] as [SettingKey, JQuery<HTMLElement>][]) {
      input.on('change', () => {
        this.storeValue(key, this.readSetting(key) ?? '');
        trackControl(key, this.readSetting(key));
        this.updateSeamlessNote();
        this.doHeightsDebounced?.();
      });
    }
  }
  createTerrainOptions() {
    this.inputs.seaLevel = numberInput('sealevel', {step: '1', value: '0'});
    const presets = selectInput('sealevel-preset', [['', 'Presets…'], ['0', 'Today (0 m)'], ['-120', 'Last glacial maximum (−120 m)'], ['-60', '10,000 years ago (−60 m)'], ['1', 'Sea level rise by 2100 (+1 m)'], ['10', '+10 m'], ['70', 'All the ice melted (+70 m)']]);
    const overlay = checkbox('Show the new coastline on the map', 'sealevel-overlay');
    this.els.seaOverlay = overlay.input;
    this.els.seaNote = note();
    this.sections.sealevel.append(
      note('Moves the sea up or down. Heights are shifted so the new sea level is 0 m, so the water mask, "flatten below water", the 3D preview\'s water and the Unreal script\'s Z = 0 all follow it. Drop it 120 m for the Ice Age land bridges, or raise it to drown a coastline.'),
      grid(field('Sea level change (m)', this.inputs.seaLevel), field('Presets', selectControl(presets))),
      overlay.label,
      this.els.seaNote,
    );
    presets.on('change', () => {
      if (presets.val() !== '') { this.inputs.seaLevel.val(presets.val() as string); this.inputs.seaLevel.trigger('change'); }
      presets.val('');
    });
    this.inputs.seaLevel.on('change input', debounce(80, () => {
      this.storeValue('sealevel', this.readSetting('sealevel') ?? '0');
      trackControl('sealevel');
      this.updateSeaNote();
      this.doHeightsDebounced?.();
      if (this.els.seaOverlay.is(':checked')) this.updateSeaOverlay();
      this.rebuildPreviewSoon();
    }));
    this.els.seaOverlay.on('change', () => this.updateSeaOverlay());

    const roads = checkbox('Flatten roads into the ground', 'carveroads', 'Gives every road a flat bed that follows a smoothed profile along it, blending back into the hillside over the shoulder width. Bridges are left alone.');
    const rail = checkbox('Railways and paths too', 'carverail');
    const rivers = checkbox('Carve river and stream channels', 'carverivers', 'Cuts a channel along every river and stream that always runs downhill (OpenStreetMap draws them in the direction of flow), deeper for wider rivers.');
    const lakes = checkbox('Level lakes to one surface', 'carvelakes', 'Flattens each lake to a single water height, removing bumps from trees on the shore or noise in the data.');
    this.inputs.carveRoads = roads.input;
    this.inputs.carveRail = rail.input;
    this.inputs.carveRivers = rivers.input;
    this.inputs.carveLakes = lakes.input;
    this.inputs.carveShoulder = numberInput('carveshoulder', {min: '0', step: '1', value: '8'});
    this.inputs.carveDepth = numberInput('carvedepth', {min: '0', max: '5', step: '0.25', value: '1'});
    this.els.carveNote = note();
    this.sections.carve.append(
      note('Shapes the terrain around OpenStreetMap features so they sit right in a game level. Applies to the heightmap, 3D models, contours and posters. Earth only, areas up to ' + OSM_MAX_AREA_KM2.toLocaleString() + ' km².'),
      roads.label, rail.label, rivers.label, lakes.label,
      grid(field('Road shoulder (m)', this.inputs.carveShoulder), field('River depth ×', this.inputs.carveDepth, {tip: 'Channels are about 15% of the river\'s width deep (0.5 to 6 m). This multiplies that.'})),
      this.els.carveNote,
    );
    for (const [key, input] of [['carveroads', this.inputs.carveRoads], ['carverail', this.inputs.carveRail], ['carverivers', this.inputs.carveRivers], ['carvelakes', this.inputs.carveLakes], ['carveshoulder', this.inputs.carveShoulder], ['carvedepth', this.inputs.carveDepth]] as [SettingKey, JQuery<HTMLElement>][]) {
      input.on('change', () => {
        this.storeValue(key, this.readSetting(key) ?? '');
        trackControl(key, App.isCheckbox(input) ? (this.readSetting(key) === '1' ? 'on' : 'off') : undefined);
        this.updateCarveNote();
        this.updateOsmNote();
        this.rebuildPreviewSoon();
      });
    }
  }
  createLayerEditors() {
    this.inputs.paint = $('<input type="hidden" name="paint">') as JQuery<HTMLInputElement>;
    this.inputs.scatter = $('<input type="hidden" name="scatter">') as JQuery<HTMLInputElement>;
    this.scatterEditor = new ScatterEditor((sets) => {
      this.inputs.scatter.val(encodeScatter(sets));
      this.inputs.scatter.trigger('change');
    });
    this.painter = new PainterEditor((settings) => {
      this.inputs.paint.val(encodePaint(settings));
      this.inputs.paint.trigger('change');
      this.scatterEditor.setPaintLayers(settings.enabled ? [...settings.rules.map(r => r.name), settings.baseName] : []);
    });
    this.sections.painter.append(this.painter.el, this.inputs.paint);
    this.painter.previewButton.on('click', () => { trackEvent('paint/preview'); this.previewPaint(); });
    this.sections.scatter.append(
      note('Positions for trees, rocks and bushes with a random size and rotation, placed with a density wherever a painted layer or OpenStreetMap layer says. Exported with the heightmap as CSV plus Blender and Unreal scripts (Unreal: instanced static meshes).'),
      this.scatterEditor.el,
      this.inputs.scatter,
    );
    this.inputs.paint.on('change', debounce(200, () => {
      this.storeValue('paint', this.readSetting('paint') ?? '');
      trackControl('paint', this.getPaintSettings().enabled ? 'on' : 'off');
      this.updateLayerStatus();
      this.updateOsmNote();
      if (this.overlays.paint) this.previewPaint();
    }));
    this.inputs.scatter.on('change', debounce(200, () => {
      this.storeValue('scatter', this.readSetting('scatter') ?? '');
      trackControl('scatter', `${this.getScatterSets().length}`);
      this.updateLayerStatus();
      this.updateOsmNote();
    }));
  }
  createTreeOptions() {
    const on = checkbox('Export a real treemap with the heightmap', 'treemap', 'Maps where the real trees are, from measured data: Swiss 1 m canopy heights (with every tree found one by one, at its real height) and ESA WorldCover 10 m tree cover everywhere else. Leaf type comes from OpenStreetMap forests where mapped.');
    this.inputs.treeMap = on.input;
    this.inputs.treeMin = numberInput('treemin', {min: '0.5', step: '0.5', value: '3'});
    this.inputs.treeDensity = numberInput('treedensity', {min: '1', step: '10', value: '350'});
    this.inputs.treeSpacing = numberInput('treespacing', {min: '0.5', step: '0.5', value: '3'});
    this.inputs.treeLeaf = selectInput('treeleaf', [['conifer', 'Conifers'], ['broadleaf', 'Broadleaf'], ['mixed', 'Mixed (half and half)']], 'conifer');
    const swiss = checkbox('Use Swiss 1 m canopy heights where available', 'treeswiss');
    this.inputs.treeSwiss = swiss.input;
    this.inputs.treeSwiss.prop('checked', true);
    this.els.treePreview = button('Preview on map', 'is-small is-info is-light');
    this.els.treeHide = button('Hide preview', 'is-small').hide();
    this.els.treeNote = note();
    this.sections.trees.append(
      note('A treemap from real data: where the trees are, how tall, and conifer or broadleaf. Exported with the heightmap as greyscale maps on the same grid (density, conifer, broadleaf and canopy height) plus every tree as CSV, Blender and Unreal scripts. Earth only.'),
      on.label,
      grid(
        field('Smallest tree (m)', this.inputs.treeMin, {tip: 'Canopy lower than this counts as bushes or grass, not trees. Used with canopy heights.'}),
        field('Leaf type if unmapped', selectControl(this.inputs.treeLeaf), {tip: 'OpenStreetMap forests often say needleleaved, broadleaved or mixed. Where they don\'t, trees get this type.'}),
        field('Trees per hectare', this.inputs.treeDensity, {tip: 'Where only tree cover is known (outside Switzerland), trees are scattered through the forest at this density. Mature forests have roughly 200 to 600 trees per hectare.'}),
        field('Min spacing (m)', this.inputs.treeSpacing, {tip: 'Scattered trees are never closer than this.'}),
      ),
      swiss.label,
      $('<div class="buttons are-small">').append(this.els.treePreview, this.els.treeHide),
      this.els.treeNote,
    );
    const keys : [SettingKey, JQuery<HTMLElement>][] = [
      ['treemap', this.inputs.treeMap], ['treemin', this.inputs.treeMin], ['treedensity', this.inputs.treeDensity],
      ['treespacing', this.inputs.treeSpacing], ['treeleaf', this.inputs.treeLeaf], ['treeswiss', this.inputs.treeSwiss],
    ];
    for (const [key, input] of keys) {
      input.on('change', debounce(100, () => {
        this.storeValue(key, this.readSetting(key) ?? '');
        trackControl(key, input.is('select') || input.is(':checkbox') ? this.readSetting(key) : undefined);
        this.updateLayerStatus();
        this.updateOsmNote();
        if (this.overlays.trees && key !== 'treemap') this.previewTrees();
      }));
    }
    this.els.treePreview.on('click', () => { trackEvent('trees/preview'); this.previewTrees(); });
    this.els.treeHide.on('click', () => this.removeOverlay('trees'));
  }
  getTreeSettings() : TreeSettings {
    const num = (input : JQuery<HTMLElement>, def : number) => {
      const v = parseFloat((input?.val() ?? '').toString());
      return Number.isFinite(v) && v > 0 ? v : def;
    };
    const d = defaultTreeSettings;
    const leaf = (this.inputs.treeLeaf?.val() ?? d.leaf).toString() as LeafType;
    return {
      minHeight: num(this.inputs.treeMin, d.minHeight),
      density: num(this.inputs.treeDensity, d.density),
      spacing: num(this.inputs.treeSpacing, d.spacing),
      leaf: ['conifer', 'broadleaf', 'mixed'].includes(leaf) ? leaf : d.leaf,
      swiss: this.inputs.treeSwiss?.is(':checked') ?? true,
    };
  }
  wantsTrees() : boolean {
    return this.isEarth() && (this.inputs.treeMap?.is(':checked') ?? false);
  }
  /** Canopy height / tree cover rasters for an output state's area. */
  async treeRastersFor(state : ConfigState, settings : TreeSettings) : Promise<TreeRaster[]> {
    const box = gridBBox(this.osmGridFor(state));
    const mpp = (state.phys.width / state.width + state.phys.height / state.height) / 2;
    return fetchTreeRasters(box, mpp, {swiss: settings.swiss, singleTrees: true});
  }
  async previewTrees() {
    if (!this.isEarth()) {
      this.els.treeNote.text('Tree data is for Earth only.');
      return;
    }
    const button = this.els.treePreview;
    button.addClass('is-loading');
    try {
      const settings = this.getTreeSettings();
      const o = await this.fetchOverlayHeights(512);
      const grid = this.osmGridFor(o.state);
      const [rasters, features] = await Promise.all([
        fetchTreeRasters(gridBBox(grid), (o.mpp.x + o.mpp.y) / 2, {swiss: settings.swiss}),
        this.fetchOsm(o.state, ['forest'], true),
      ]);
      if (!rasters.length) {
        this.removeOverlay('trees');
        this.els.treeNote.text('No tree data found here.');
        return;
      }
      const result = await processor.treePreview(o.heights, o.width, o.height, grid, o.mpp, rasters, features ?? undefined, settings);
      this.showOverlay('trees', result.preview, o.width, o.height, o.bounds, 0.9);
      this.els.treeHide.show();
      const s = result.stats;
      const swissHere = overlapsSwitzerland(gridBBox(grid));
      this.els.treeNote.text(`Trees cover ${(s.cover * 100).toFixed(s.cover < 0.1 ? 1 : 0)}% of the box. Data: ${s.sources.join(' + ')}. Dark green = conifer, light green = broadleaf.` +
        (swissHere && settings.swiss && !s.sources.some(x => x.startsWith('Swiss')) ? ' No Swiss canopy heights here, so tree cover is used.' : '') +
        (s.sources.some(x => x.startsWith('Swiss')) ? ' Single trees are picked out of the canopy heights in the export.' : ''));
    } catch (e) {
      console.error('Tree preview failed', e);
      this.els.treeNote.text('Could not load the tree data. Please try again.');
    } finally {
      button.removeClass('is-loading');
    }
  }
  createAnalysisOptions() {
    const profileButton = button('Draw a profile on the map');
    profileButton.on('click', () => {
      this.profileTool?.active ? this.profileTool.finish() : this.profileTool?.start();
    });
    this.sections.profile.append(
      note('Click points on the map to draw a line (or use the mountain button on the map), then press Enter or double-click. You get a chart of the ground along it, with the climb, descent and steepest grade, and a CSV download.'),
      $('<div class="buttons are-small">').append(profileButton),
    );

    this.inputs.viewHeight = numberInput('viewheight', {min: '0', step: '0.1', value: '1.7'});
    this.inputs.viewTarget = numberInput('viewtarget', {min: '0', step: '1', value: '0'});
    this.els.viewPick = button('Pick a viewpoint on the map', 'is-small is-info');
    this.els.viewDownload = button('Download visibility mask', 'is-small is-light').prop('disabled', true);
    this.els.viewClear = button('Clear', 'is-small is-light');
    this.els.viewNote = note();
    this.sections.viewshed.append(
      note('Everything visible from one spot inside the export area, allowing for the curvature of the planet. Green is visible, red is hidden. Handy for placing watchtowers, sniper spots or scenic viewpoints.'),
      grid(field('Eye height (m)', this.inputs.viewHeight), field('Target height (m)', this.inputs.viewTarget, {tip: 'How tall the things you are looking for are. 0 means the ground itself; 10 asks "could I see a 10 m tower here?"'})),
      $('<div class="buttons are-small">').append(this.els.viewPick, this.els.viewDownload, this.els.viewClear),
      this.els.viewNote,
    );
    this.els.viewPick.on('click', () => this.toggleViewshedMode());
    this.els.viewClear.on('click', () => this.clearViewshed());
    this.els.viewDownload.on('click', () => this.downloadViewshed());
    this.inputs.viewHeight.on('change', () => {
      this.storeValue('viewheight', this.readSetting('viewheight') ?? '1.7');
      if (this.viewshedMarker) this.runViewshed(this.viewshedMarker.getLatLng());
    });
    this.inputs.viewTarget.on('change', () => {
      if (this.viewshedMarker) this.runViewshed(this.viewshedMarker.getLatLng());
    });

    const sun = checkbox('Export a yearly sunlight map with the heightmap', 'sunmap', 'A greyscale map of how much sun each spot gets over a year: one day a month, sampled every hour, with terrain shadows and each slope\'s angle to the sun. Brightest = sunniest. Great for snow, moss, vegetation and where players would build.');
    this.inputs.sunMap = sun.input;
    this.els.sunPreview = button('Preview on map', 'is-small is-info is-light');
    this.els.sunHide = button('Hide preview', 'is-small').hide();
    this.els.sunNote = note();
    this.sections.sunlight.append(sun.label, $('<div class="buttons are-small">').append(this.els.sunPreview, this.els.sunHide), this.els.sunNote,
      note('The 3D preview can also show the real sun for any date and time: open it from the 3D &amp; Print tab.'));
    this.inputs.sunMap.on('change', () => {
      this.storeValue('sunmap', this.readSetting('sunmap') ?? '0');
      trackControl('sunmap', this.inputs.sunMap.is(':checked') ? 'on' : 'off');
      this.updateLayerStatus();
    });
    this.els.sunPreview.on('click', () => { trackEvent('sunlight/preview'); this.previewSunlight(); });
    this.els.sunHide.on('click', () => this.removeOverlay('sun'));
  }
  createPrintOptions() {
    const buildings = checkbox('3D buildings from OpenStreetMap', 'buildings', 'Extrudes building footprints to their tagged height (or levels × 3 m, or the default) and stands them on the terrain. Textured models get real roof colours from the satellite image. Earth only.');
    this.inputs.buildings = buildings.input;
    this.inputs.buildingHeight = numberInput('buildingheight', {min: '2', step: '1', value: '8'});
    this.sections.model.append($('<hr class="ui-rule">'), buildings.label, grid(field('Default building height (m)', this.inputs.buildingHeight)));

    const label = checkbox('Raised label on a plinth', 'label', 'Adds a plinth along the front (south) edge with raised text: the place name and coordinates. Solid print models only (STL or 3MF).');
    this.inputs.label = label.input;
    this.inputs.labelText = textInput('labeltext', {placeholder: 'Place name (default: the search result)'});
    this.inputs.colorBands = selectInput('colorbands', [['0', 'One colour'], ['2', '2 colours'], ['3', '3 colours'], ['4', '4 colours'], ['5', '5 colours'], ['6', '6 colours']]);
    this.inputs.bandLevels = textInput('bandlevels', {placeholder: 'Auto, or e.g. 500, 1500, 2500'});
    this.inputs.bandColors = $('<input type="hidden" name="bandcolors">') as JQuery<HTMLInputElement>;
    this.els.bandSwatches = $('<div class="band-swatches">');
    const litho = checkbox('Lithophane instead of a relief model', 'lithophane', 'A thin flat plate whose thickness follows the hillshade: hold it up to a light (or a window) and the terrain appears. Uses Print Width; print it upright with 100% infill.');
    this.inputs.lithophane = litho.input;
    this.inputs.lithoMin = numberInput('lithomin', {min: '0.4', step: '0.1', value: '0.8'});
    this.inputs.lithoMax = numberInput('lithomax', {min: '1', step: '0.1', value: '3'});
    this.els.printNote = note();
    this.sections.print.append(
      label.label,
      grid(field('Label text', this.inputs.labelText, {full: true})),
      grid(
        field('Colour bands (3MF)', selectControl(this.inputs.colorBands), {tip: 'Splits the model by height into stacked parts in one 3MF file, so a multi-colour printer can print lowlands, slopes and peaks in different filaments. With one extruder, swap filament at the heights listed after export.'}),
        field('Band heights (m)', this.inputs.bandLevels),
      ),
      this.els.bandSwatches, this.inputs.bandColors,
      $('<hr class="ui-rule">'),
      litho.label,
      grid(field('Thinnest (mm)', this.inputs.lithoMin), field('Thickest (mm)', this.inputs.lithoMax)),
      this.els.printNote,
    );
    for (const [key, input] of [['buildings', this.inputs.buildings], ['buildingheight', this.inputs.buildingHeight], ['label', this.inputs.label], ['labeltext', this.inputs.labelText], ['colorbands', this.inputs.colorBands], ['bandlevels', this.inputs.bandLevels], ['bandcolors', this.inputs.bandColors], ['lithophane', this.inputs.lithophane], ['lithomin', this.inputs.lithoMin], ['lithomax', this.inputs.lithoMax]] as [SettingKey, JQuery<HTMLElement>][]) {
      input.on('change', () => {
        this.storeValue(key, this.readSetting(key) ?? '');
        trackControl(key, input.is('select') || App.isCheckbox(input) ? this.readSetting(key) : undefined);
        if (key === 'colorbands') this.renderBandSwatches();
        this.updatePrintNote();
        this.updateOsmNote();
        if (key === 'buildings' || key === 'buildingheight') this.rebuildPreviewSoon();
      });
    }
    this.renderBandSwatches();
  }
  static readonly BAND_DEFAULTS = ['#3f7a4a', '#9bb06a', '#d8c690', '#9c7b5a', '#ffffff', '#6d6762'];
  renderBandSwatches() {
    const count = parseInt((this.inputs.colorBands.val() ?? '0').toString(), 10) || 0;
    const saved = (this.inputs.bandColors.val() ?? '').toString().split(',').filter(c => /^#?[0-9a-f]{6}$/i.test(c));
    this.els.bandSwatches.empty().toggle(count > 1);
    for (let i = 0; i < count; i++) {
      const value = saved[i] ? (saved[i].startsWith('#') ? saved[i] : '#' + saved[i]) : App.BAND_DEFAULTS[i];
      const input = $('<input type="color" class="painter__color">').val(value).attr('aria-label', `Band ${i + 1} colour`);
      input.on('change', () => {
        const colors = this.els.bandSwatches.find('input').map((_, el) => ($(el).val() ?? '').toString().replace('#', '')).get();
        this.inputs.bandColors.val(colors.join(','));
        this.inputs.bandColors.trigger('change');
      });
      this.els.bandSwatches.append($('<label class="band-swatch">').append(input, $('<span>').text(i === 0 ? 'Lowest' : i === count - 1 ? 'Highest' : `Band ${i + 1}`)));
    }
  }
  getBandColors() : string[] {
    return this.els.bandSwatches?.find('input').map((_, el) => ($(el).val() ?? '#888888').toString()).get() ?? [];
  }
  createSplineOptions() {
    this.inputs.splines = $('<input type="hidden" name="splines">') as JQuery<HTMLInputElement>;
    this.els.splineChecks = $('<div class="checkbox-list">');
    const labels : Record<string, string> = {roads: 'Roads', railways: 'Railways', paths: 'Paths', rivers: 'Rivers & streams'};
    for (const id of SPLINE_LAYERS) {
      const box = checkbox(labels[id], `spline-${id}`);
      box.input.attr('data-spline', id);
      this.els.splineChecks.append(box.label);
    }
    this.sections.splines.append(
      note('Roads, railways, paths and rivers from OpenStreetMap as 3D splines with heights from the (carved) heightmap. Exported with the heightmap as CSV and GeoJSON, plus a Blender script that makes curves and an Unreal script that makes actors with Spline components, ready for PCG or spline meshes.'),
      this.els.splineChecks, this.inputs.splines,
    );
    this.els.splineChecks.find('input').on('change', () => {
      const ids = this.els.splineChecks.find('input:checked').map((_, el) => $(el).attr('data-spline')).get();
      this.inputs.splines.val(ids.join(','));
      this.inputs.splines.trigger('change');
    });
    this.inputs.splines.on('change', () => {
      this.storeValue('splines', this.readSetting('splines') ?? '');
      trackControl('splines', this.readSetting('splines'));
      this.updateOsmNote();
      this.updateLayerStatus();
    });
  }
  syncSplineCheckboxes() {
    const ids = (this.inputs.splines?.val() ?? '').toString().split(',');
    this.els.splineChecks?.find('input').each((_, el) => { $(el).prop('checked', ids.includes($(el).attr('data-spline'))); });
  }
  createPosterOptions() {
    this.inputs.posterStyle = selectInput('posterstyle', Object.entries(POSTER_THEMES).map(([id, t]) => [id, t.label] as [string, string]));
    this.inputs.posterPaper = selectInput('posterpaper', [['a4', 'A4'], ['a3', 'A3'], ['a2', 'A2'], ['a1', 'A1'], ['square', 'Square (30 cm)'], ['screen', 'Wallpaper (16:9)'], ['custom', 'Custom size…']], 'a3');
    this.inputs.posterDpi = selectInput('posterdpi', [['100', '100 dpi (preview)'], ['150', '150 dpi'], ['200', '200 dpi'], ['300', '300 dpi (print shop)']], '150');
    this.inputs.posterTitle = textInput('postertitle', {placeholder: 'Title (default: the search result)'});
    this.inputs.posterContours = selectInput('postercontours', [['auto', 'Auto'], ['0', 'None'], ['10', '10 m'], ['20', '20 m'], ['50', '50 m'], ['100', '100 m'], ['200', '200 m'], ['500', '500 m'], ['1000', '1,000 m']], 'auto');
    this.inputs.posterZ = numberInput('posterz', {min: '0.5', max: '10', step: '0.5', value: '1.5'});
    this.inputs.posterWidth = numberInput('posterwidth', {min: '1', step: 'any', value: '30'});
    this.inputs.posterHeight = numberInput('posterheight', {min: '1', step: 'any', value: '40'});
    this.inputs.posterUnit = selectInput('posterunit', [['mm', 'mm'], ['cm', 'cm'], ['in', 'inches']], 'cm');
    const credit = checkbox('Include unrealheightmap credit', 'postercredit', 'A small "Generated with unrealheightmap" line in the bottom margin.');
    this.inputs.posterCredit = credit.input;
    this.inputs.posterCredit.prop('checked', true);
    const qr = checkbox('Include QR code link', 'posterqr', 'A QR code in the poster\'s colours that opens unrealheightmap with this area and these settings, so anyone can make their own.');
    this.inputs.posterQr = qr.input;
    this.inputs.posterQr.prop('checked', true);
    this.els.posterCustom = grid(
      field('Width', this.inputs.posterWidth),
      field('Height', this.inputs.posterHeight),
      field('Units', selectControl(this.inputs.posterUnit)),
    ).addClass('poster-custom');
    this.els.posterButton = button('Make poster', 'is-primary is-small');
    this.els.posterNote = note();
    this.els.posterPreview = $('<div class="poster-preview" aria-live="polite">').append($('<canvas>'), $('<p class="poster-preview-status">'));
    this.sections.poster.append(
      note('A print-ready shaded-relief map of the area with a title, coordinates, scale bar and north arrow, as a PNG.'),
      grid(
        field('Style', selectControl(this.inputs.posterStyle)),
        field('Paper', selectControl(this.inputs.posterPaper)),
        field('Resolution', selectControl(this.inputs.posterDpi)),
        field('Contours', selectControl(this.inputs.posterContours)),
      ),
      this.els.posterCustom,
      grid(
        field('Title', this.inputs.posterTitle, {full: true}),
        field('Relief exaggeration', this.inputs.posterZ, {tip: 'Deepens the shading. 1 is true to life; 1.5 to 3 suits gentle landscapes.'}),
      ),
      credit.label,
      qr.label,
      this.els.posterPreview,
      $('<div class="buttons are-small">').append(this.els.posterButton),
      this.els.posterNote,
    );
    const keys : [SettingKey, JQuery<HTMLElement>][] = [
      ['posterstyle', this.inputs.posterStyle], ['posterpaper', this.inputs.posterPaper], ['posterdpi', this.inputs.posterDpi],
      ['postertitle', this.inputs.posterTitle], ['postercontours', this.inputs.posterContours], ['posterz', this.inputs.posterZ],
      ['posterwidth', this.inputs.posterWidth], ['posterheight', this.inputs.posterHeight], ['posterunit', this.inputs.posterUnit],
      ['postercredit', this.inputs.posterCredit], ['posterqr', this.inputs.posterQr],
    ];
    for (const [key, input] of keys) {
      input.on('change', () => {
        this.storeValue(key, this.readSetting(key) ?? '');
        trackControl(key, input.is('select') || input.is(':checkbox') ? this.readSetting(key) : undefined);
        this.updatePosterControls();
      });
      if (input.is('input[type=text], input[type=number]')) input.on('input', () => this.updatePosterControls());
    }
    // Changing units converts the numbers, so the size stays the same
    let lastUnit = (this.inputs.posterUnit.val() ?? 'cm').toString() as LengthUnit;
    this.inputs.posterUnit.on('change', () => {
      const unit = (this.inputs.posterUnit.val() ?? 'cm').toString() as LengthUnit;
      for (const input of [this.inputs.posterWidth, this.inputs.posterHeight]) {
        const v = parseFloat((input.val() ?? '').toString());
        if (Number.isFinite(v)) {
          input.val(+(v * MM_PER_UNIT[lastUnit] / MM_PER_UNIT[unit]).toFixed(unit === 'mm' ? 0 : 2));
          input.trigger('change');
        }
      }
      lastUnit = unit;
    });
    // Live preview once the section is opened, and whenever the area moves
    this.sections.poster.closest('details').on('toggle', () => this.updatePosterControls());
    this.els.posterButton.on('click', debounce(100, () => {
      trackEvent(`generate/poster/${this.inputs.posterStyle.val()}/${this.inputs.posterPaper.val()}`);
      this.exportPoster();
      countDonatePrompt();
    }));
    this.updatePosterControls();
  }
  updatePosterControls() {
    if (!this.inputs.posterPaper) return;
    const custom = this.inputs.posterPaper.val() === 'custom';
    this.els.posterCustom.toggle(custom);
    const settings = this.posterSettings();
    if (settings.error) {
      this.els.posterNote.addClass('has-text-warning').text(settings.error);
    } else {
      this.els.posterNote.removeClass('has-text-warning').text(`${settings.page.width.toLocaleString()} × ${settings.page.height.toLocaleString()} px at ${settings.dpi} dpi.`);
    }
    this.els.posterButton.prop('disabled', !!settings.error);
    this.refreshPosterPreview();
  }
  /** Everything the poster layout needs from the controls. */
  posterSettings() {
    const style = (this.inputs.posterStyle.val() ?? 'classic').toString() as PosterStyle;
    const paper = (this.inputs.posterPaper.val() ?? 'a3').toString() as PaperSize;
    const dpi = parseInt((this.inputs.posterDpi.val() ?? '150').toString(), 10) || 150;
    const unit = (this.inputs.posterUnit.val() ?? 'cm').toString() as LengthUnit;
    const toMm = (input : JQuery<HTMLElement>, def : number) => {
      const v = parseFloat((input.val() ?? '').toString());
      return (Number.isFinite(v) && v > 0 ? v : def) * (MM_PER_UNIT[unit] ?? 10);
    };
    const customMm : [number, number] = [toMm(this.inputs.posterWidth, 30), toMm(this.inputs.posterHeight, 40)];
    const state = this.getCurrentState();
    const aspect = state.phys.width / Math.max(1, state.phys.height);
    const page = pagePixels(paper, dpi, aspect, customMm);
    let error = '';
    if (paper === 'custom' && Math.min(...customMm) < 50) error = 'The poster needs to be at least 5 cm (2 in) on each side.';
    else if (Math.max(page.width, page.height) > POSTER_MAX_SIDE || page.width * page.height > POSTER_MAX_PIXELS) error = `That's too big for the browser to draw (${page.width.toLocaleString()} × ${page.height.toLocaleString()} px). Lower the resolution or the size.`;
    return {
      style, theme: POSTER_THEMES[style] ?? POSTER_THEMES.classic, paper, dpi, page, aspect, state, error,
      contours: (this.inputs.posterContours.val() ?? 'auto').toString(),
      z: parseFloat((this.inputs.posterZ.val() ?? '1.5').toString()) || 1.5,
      title: (this.inputs.posterTitle.val() ?? '').toString(),
      credit: this.inputs.posterCredit?.is(':checked') ?? true,
      qr: this.inputs.posterQr?.is(':checked') ?? true,
    };
  }
  /** Small heights grid for the live preview, reused until the area changes. */
  posterPreviewHeights : {key : string, data : Promise<Awaited<ReturnType<App['fetchOverlayHeights']>>>} | null = null;
  posterPreviewRun = 0;
  refreshPosterPreview = debounce(250, async () => {
    const details = this.sections.poster?.closest('details')[0] as HTMLDetailsElement | undefined;
    const wrap = this.els.posterPreview;
    if (!wrap || !details?.open || !wrap.is(':visible')) return;
    const settings = this.posterSettings();
    const status = wrap.find('.poster-preview-status');
    if (settings.error) return;
    const run = ++this.posterPreviewRun;
    const state = settings.state;
    const key = `${this.getElevationSource().id}|${state.latitude.toFixed(5)}|${state.longitude.toFixed(5)}|${state.zoom}|${state.width}|${state.height}|${this.getRotation()}`;
    if (this.posterPreviewHeights?.key !== key) {
      this.posterPreviewHeights = {key, data: this.fetchOverlayHeights(384)};
      this.posterPreviewHeights.data.catch(() => { this.posterPreviewHeights = null; });
    }
    status.text('Updating preview…');
    try {
      const o = await this.posterPreviewHeights.data;
      if (run !== this.posterPreviewRun) return;
      // Draw the page at panel width (doubled for sharp screens), inside a square box
      const box = Math.max(160, Math.round(wrap.width() || 320));
      const scale = Math.min(box / settings.page.width, box / settings.page.height) * Math.min(2, window.devicePixelRatio || 1);
      const canvas = wrap.find('canvas')[0] as HTMLCanvasElement;
      await this.drawPoster(canvas, {heights: o.heights, width: o.width, height: o.height, physWidth: o.mpp.x * o.width, physHeight: o.mpp.y * o.height}, settings, scale);
      if (run !== this.posterPreviewRun) return;
      status.text('');
    } catch (e) {
      console.error('Poster preview failed', e);
      if (run === this.posterPreviewRun) status.text('Could not draw the preview.');
    }
  });
  createViewSwitch() {
    const views : ['map' | '3d' | 'split', string][] = [['map', 'Map'], ['split', 'Split'], ['3d', '3D']];
    this.els.viewSwitch = $('<div class="view-switch buttons has-addons are-small" role="group" aria-label="View">');
    for (const [id, label] of views) {
      const b = $(`<button type="button" class="button" data-view="${id}">`).text(label);
      b.on('click', () => {
        trackEvent(`view/${id}`);
        if (id !== 'map') this.openPreview(id);
        else this.setView('map');
      });
      this.els.viewSwitch.append(b);
    }
    this.els.main.append(this.els.viewSwitch);
    this.setView('map');
  }
  /** Show the map, the 3D preview, or both. */
  setView(view : 'map' | '3d' | 'split') {
    this.previewView = view;
    this.els.main.attr('data-view', view);
    this.els.viewSwitch?.find('button').each((_, el) => {
      const on = $(el).attr('data-view') === view;
      $(el).toggleClass('is-selected is-dark', on).attr('aria-pressed', on ? 'true' : 'false');
    });
    if (view === 'map') this.els.previewContainer?.hide();
    else this.els.previewContainer?.show();
    // Leaflet and three.js both need telling when their box changes size
    setTimeout(() => {
      this.map?.invalidateSize();
      this.preview?.resize();
    }, 30);
  }
  /* ------------------------------------------------------------------ */
  /* Settings for the new features                                       */
  /* ------------------------------------------------------------------ */
  getRotation() : number {
    const v = parseFloat((this.inputs.rotation?.val() ?? '0').toString());
    return Number.isFinite(v) ? normaliseAngle(v) : 0;
  }
  getShape() : [number, number][] {
    return decodeShape((this.inputs.shape?.val() ?? '').toString());
  }
  getSeamlessOptions() : SeamlessOptions {
    const overlap = parseFloat((this.inputs.seamOverlap?.val() ?? '12').toString());
    return {
      mode: ((this.inputs.seamMode?.val() ?? 'off').toString() as SeamlessOptions['mode']),
      period: ((this.inputs.seamPeriod?.val() ?? 'texture').toString() as SeamlessOptions['period']),
      overlap: (Number.isFinite(overlap) ? overlap : 12) / 100,
    };
  }
  getSeaLevel() : number {
    const v = parseFloat((this.inputs.seaLevel?.val() ?? '0').toString());
    return Number.isFinite(v) ? v : 0;
  }
  getCarveOptions() : CarveOptions {
    const num = (el : JQuery<HTMLElement>, d : number) => {
      const v = parseFloat((el?.val() ?? '').toString());
      return Number.isFinite(v) ? v : d;
    };
    return {
      roads: this.inputs.carveRoads?.is(':checked') ?? false,
      railways: this.inputs.carveRail?.is(':checked') ?? false,
      rivers: this.inputs.carveRivers?.is(':checked') ?? false,
      lakes: this.inputs.carveLakes?.is(':checked') ?? false,
      shoulder: Math.max(0, num(this.inputs.carveShoulder, 8)),
      riverDepth: Math.max(0, num(this.inputs.carveDepth, 1)),
    };
  }
  getPaintSettings() : PaintSettings {
    return decodePaint((this.inputs.paint?.val() ?? '').toString());
  }
  getScatterSets() : ScatterSet[] {
    return decodeScatter((this.inputs.scatter?.val() ?? '').toString());
  }
  getSplineLayers() : string[] {
    return (this.inputs.splines?.val() ?? '').toString().split(',').filter(Boolean);
  }
  wantsBuildings() : boolean {
    return this.getBody() === 'earth' && (this.inputs.buildings?.is(':checked') ?? false);
  }
  isEarth() : boolean {
    return this.getBody() === 'earth';
  }
  /** Features that need the whole area processed in one go (so no streamed tiles). */
  needsWholeArea() : boolean {
    return this.getRotation() !== 0 || this.getSeamlessOptions().mode !== 'off' || this.getShape().length >= 3 ||
      this.getPaintSettings().enabled || this.getScatterSets().length > 0 || this.getSplineLayers().length > 0 || this.wantsTrees() ||
      (this.inputs.sunMap?.is(':checked') ?? false) || wantsCarve(this.getCarveOptions()) || this.getSeaLevel() !== 0;
  }
  /** OpenStreetMap layers an export needs: masks, carving, painting, scatter, splines, buildings. */
  osmLayersFor(purpose : 'heightmap' | 'model' | 'preview' | 'raw') : string[] {
    if (!this.isEarth()) return [];
    const ids = new Set<string>(carveLayers(this.getCarveOptions()));
    if (purpose === 'heightmap') {
      this.getOsmLayerIds().forEach(id => ids.add(id));
      paintOsmLayers(this.getPaintSettings()).forEach(id => ids.add(id));
      for (const set of this.getScatterSets()) if (set.source.startsWith('osm:')) ids.add(set.source.slice(4));
      this.getSplineLayers().forEach(id => ids.add(id));
      if (this.wantsTrees()) ids.add('forest');
    }
    if ((purpose === 'model' || purpose === 'preview') && this.wantsBuildings()) ids.add('buildings');
    return Array.from(ids);
  }
  /** Download (or reuse) OpenStreetMap features for an area. */
  fetchOsm(state : ConfigState, ids : string[], quiet = false) : Promise<OsmFeature[] | null> {
    if (!ids.length || !this.isEarth()) return Promise.resolve(null);
    const bbox = gridBBox(this.osmGridFor(state));
    if (bboxAreaKm2(bbox) > OSM_MAX_AREA_KM2) {
      if (!quiet) this.displayError({text: `OpenStreetMap features skipped: the area is larger than ${OSM_MAX_AREA_KM2.toLocaleString()} km².`});
      return Promise.resolve(null);
    }
    const key = `${[bbox.south, bbox.west, bbox.north, bbox.east].map(v => v.toFixed(5)).join(',')}|${ids.slice().sort().join(',')}`;
    const cached = this.osmCache.get(key);
    if (cached) return cached;
    trackEvent(`generate/osm/${ids.length}`);
    // Overpass can be very slow when busy: give up after two minutes rather than stall the export
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    const promise = fetchOsmLayers(bbox, ids, (url, init) => fetch(url, init as RequestInit) as any, {signal: controller.signal}).catch(e => {
      console.error('OSM fetch failed', e);
      this.osmCache.delete(key);
      const reason = controller.signal.aborted ? 'the OpenStreetMap server took too long to answer. Try again in a minute' : (e?.message ?? e);
      if (!quiet) this.displayError({text: `OpenStreetMap features could not be downloaded (${reason}). The export carried on without them.`});
      return null;
    }).finally(() => clearTimeout(timer));
    this.osmCache.set(key, promise);
    if (this.osmCache.size > 8) this.osmCache.delete(this.osmCache.keys().next().value);
    return promise;
  }
  /** A copy of `base` covering width × height pixels, its centre moved by (dx, dy) pixels. */
  deriveState(base : ConfigState, width : number, height : number, dx = 0, dy = 0) : ConfigState {
    const s : ConfigState = {...base};
    s.width = Math.max(1, Math.round(width));
    s.height = Math.max(1, Math.round(height));
    s.widthInTiles = s.width / NextZen.tileWidth;
    s.heightInTiles = s.height / NextZen.tileHeight;
    s.exactPos = {x: base.exactPos.x + dx / NextZen.tileWidth, y: base.exactPos.y + dy / NextZen.tileHeight, z: base.exactPos.z};
    s.startx = Math.floor(s.exactPos.x - s.widthInTiles / 2);
    s.endx = Math.floor(s.exactPos.x + s.widthInTiles / 2);
    s.starty = clamp(Math.floor(s.exactPos.y - s.heightInTiles / 2), s.min.y, s.max.y);
    s.endy = clamp(Math.floor(s.exactPos.y + s.heightInTiles / 2), s.min.y, s.max.y);
    return s;
  }
  /**
   * What to fetch for an output state and how the worker turns it into the
   * output grid: rotation resamples a bigger axis-aligned box, seam cutting
   * needs a strip past the right and bottom edges.
   */
  planFor(state : ConfigState) : {fetchState : ConfigState, area : AreaPlan} {
    const rotation = this.getRotation();
    const seam = this.getSeamlessOptions();
    const seamOn = seam.mode !== 'off' && state.width * state.height <= SEAMLESS_MAX_PIXELS;
    const margin = seamOn ? seamlessMargin(state.width, state.height, seam) : 0;
    const gw = state.width + margin, gh = state.height + margin;
    const area : AreaPlan = {};
    if (seamOn) area.seamless = {options: seam, width: state.width, height: state.height};
    if (!rotation) {
      return {fetchState: margin ? this.deriveState(state, gw, gh, margin / 2, margin / 2) : state, area};
    }
    const b = rotatedBounds(state.width, state.height, gw, gh, rotation);
    const fw = Math.ceil(b.maxX - b.minX) + 2, fh = Math.ceil(b.maxY - b.minY) + 2;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    area.resample = {rotation, gridWidth: gw, gridHeight: gh, areaWidth: state.width, areaHeight: state.height, centreX: fw / 2 - cx, centreY: fh / 2 - cy};
    return {fetchState: this.deriveState(state, fw, fh, cx, cy), area};
  }
  baseName(state : ConfigState) : string {
    return format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
  }
  /** Terrain edits and extra outputs for one job. */
  terrainOpsFor(state : ConfigState, purpose : 'heightmap' | 'model' | 'preview' | 'raw', features : OsmFeature[] | null) : TerrainOps {
    const ops : TerrainOps = {name: this.baseName(state), grid: this.osmGridFor(state)};
    const sea = this.getSeaLevel();
    if (sea) ops.seaLevel = sea;
    const carve = this.getCarveOptions();
    if (wantsCarve(carve) && features) ops.carve = carve;
    const shape = this.getShape();
    if (shape.length >= 3) ops.shape = shape;
    if (features) ops.features = features;
    if (purpose === 'heightmap') {
      const paint = this.getPaintSettings();
      if (paint.enabled) ops.paint = paint;
      const scatter = this.getScatterSets();
      if (scatter.length) ops.scatter = scatter;
      const splines = this.getSplineLayers();
      if (splines.length && features) ops.splines = splines;
      if (this.inputs.sunMap?.is(':checked') && this.isEarth()) {
        ops.sunlight = {latitude: state.latitude, longitude: state.longitude, year: new Date().getFullYear(), stepHours: 1};
      }
    }
    return ops;
  }
  rebuildPreviewSoon = debounce(300, () => {
    if (this.preview && this.previewView !== 'map') this.refreshPreview();
  });

  /* ------------------------------------------------------------------ */
  /* Notes and status                                                   */
  /* ------------------------------------------------------------------ */
  updateSeamlessNote(edges? : PipelineExtras['edges']) {
    if (!this.els.seamScore) return;
    const seam = this.getSeamlessOptions();
    sectionStatus(this.sections.seamless, seam.mode === 'off' ? '' : seam.mode === 'seamcut' ? 'Seam cut' : seam.mode === 'smooth' ? 'Smooth' : 'Mirror', seam.mode !== 'off');
    this.inputs.seamOverlap?.prop('disabled', seam.mode !== 'seamcut');
    this.inputs.seamPeriod?.prop('disabled', seam.mode === 'mirror' || seam.mode === 'off');
    const state = this.getCurrentState();
    if (seam.mode !== 'off' && state.width * state.height > SEAMLESS_MAX_PIXELS) {
      this.els.seamScore.addClass('has-text-warning').text('This export is too big to make seamless in the browser (up to about 4,100 × 4,100 px). Seamless tiling will be skipped.');
      return;
    }
    this.els.seamScore.removeClass('has-text-warning');
    if (edges) this.lastEdges = edges;
    const e = edges ?? this.lastEdges;
    if (!e) {
      this.els.seamScore.text(seam.mode === 'off' ? '' : 'Checking how well this area tiles…');
      return;
    }
    const score = seamScore(e, e.heightRange);
    const verdict = score >= 85 ? 'tiles easily' : score >= 60 ? 'tiles fairly well' : score >= 35 ? 'needs a fair bit of bending' : 'is hard to tile: try moving the box so similar ground sits at opposite edges';
    this.els.seamScore.html(`Seam score <b>${score}/100</b>: this area ${verdict}. Edge mismatch ${localFormatNumber(e.leftRight, 0)} m left/right, ${localFormatNumber(e.topBottom, 0)} m top/bottom.`);
  }
  lastEdges : PipelineExtras['edges'] | null = null;
  updateSeaNote() {
    const sea = this.getSeaLevel();
    sectionStatus(this.sections.sealevel, sea ? `${sea > 0 ? '+' : ''}${sea} m` : '', !!sea);
    this.els.seaNote?.text(sea
      ? `The heightmap's 0 m is ${Math.abs(sea)} m ${sea > 0 ? 'above' : 'below'} today's sea level. Tick "Water mask" or "Flatten below water level" (Water section) to mark or fill the new sea.`
      : '');
  }
  updateCarveNote() {
    const c = this.getCarveOptions();
    const on = wantsCarve(c);
    const parts = [c.roads && 'roads', c.railways && 'railways', c.rivers && 'rivers', c.lakes && 'lakes'].filter(Boolean);
    sectionStatus(this.sections.carve, on ? parts.join(', ') : '', on);
    this.els.carveNote?.text(on && !this.isEarth() ? 'Carving uses OpenStreetMap, so it only works on Earth.' : '');
  }
  updateLayerStatus() {
    const paint = this.getPaintSettings();
    sectionStatus(this.sections.painter, paint.enabled ? `${paint.rules.length + 1} layers` : '', paint.enabled);
    const sets = this.getScatterSets();
    sectionStatus(this.sections.scatter, sets.length ? `${sets.length} set${sets.length === 1 ? '' : 's'}` : '', sets.length > 0);
    const splines = this.getSplineLayers();
    sectionStatus(this.sections.splines, splines.join(', '), splines.length > 0);
    sectionStatus(this.sections.trees, this.wantsTrees() ? 'Exported' : '', this.wantsTrees());
    const sun = this.inputs.sunMap?.is(':checked') ?? false;
    sectionStatus(this.sections.sunlight, sun ? 'Exported' : '', sun);
    const osm = this.getOsmLayerIds();
    sectionStatus(this.sections.osm, osm.length ? `${osm.length} layer${osm.length === 1 ? '' : 's'}` : '', osm.length > 0);
  }
  updateAreaStatus() {
    const rot = this.getRotation();
    const shape = this.getShape();
    sectionStatus(this.sections.shape, [rot ? `${Math.round(rot)}°` : '', shape.length >= 3 ? 'shape' : ''].filter(Boolean).join(', '), !!rot || shape.length >= 3);
    this.els.shapeClear?.prop('disabled', shape.length < 3);
    this.els.shapeNote?.html(shape.length >= 3
      ? `Custom shape with ${shape.length} points. Outside it the ground drops to the lowest point inside, and an <code>area_mask</code> map is exported with the texture maps.`
      : 'Draw a shape (an island, a national park, a county) to export just that: click points on the map, then double-click, press Enter or click the first point to finish.');
  }
  updatePrintNote() {
    if (!this.els.printNote) return;
    const format = this.getMeshFormat();
    const notes : string[] = [];
    const bands = parseInt((this.inputs.colorBands?.val() ?? '0').toString(), 10) || 0;
    if (bands > 1 && format !== '3mf') notes.push('Colour bands need the 3MF format (3D Model Format).');
    if (bands > 1 && !this.getMeshOptions().solid) notes.push('Colour bands need "Solid with base".');
    if (this.inputs.label?.is(':checked') && (format === 'obj' || format === 'glb')) notes.push('The label is only added to STL and 3MF prints.');
    if (this.inputs.label?.is(':checked') && this.getMeshOptions().scale !== 'print') notes.push('The label needs Scale: Print size.');
    if (this.inputs.lithophane?.is(':checked')) notes.push('Lithophane is on: the 3D model export makes a lithophane plate (STL or 3MF) instead of a relief.');
    this.els.printNote.text(notes.join(' '));
    const on = bands > 1 || this.inputs.label?.is(':checked') || this.inputs.lithophane?.is(':checked');
    sectionStatus(this.sections.print, on ? [bands > 1 ? `${bands} colours` : '', this.inputs.label?.is(':checked') ? 'label' : '', this.inputs.lithophane?.is(':checked') ? 'lithophane' : ''].filter(Boolean).join(', ') : '', !!on);
  }

  /* ------------------------------------------------------------------ */
  /* Map overlays                                                        */
  /* ------------------------------------------------------------------ */
  /** Raw heights for the axis-aligned box around the area, for map overlays. */
  async fetchOverlayHeights(maxSize = 512) : Promise<{heights : Float32Array, width : number, height : number, state : ConfigState, bounds : L.LatLngBounds, mpp : {x : number, y : number}}> {
    const full = this.getCurrentState();
    const rotation = this.getRotation();
    let scale = 1;
    const longest = () => Math.max(full.width, full.height) * (rotation ? 1.42 : 1) * scale;
    while (longest() / 2 >= maxSize && full.z + Math.log2(scale / 2) >= 1) scale /= 2;
    const base = this.getCurrentState(scale);
    let state = base;
    if (rotation) {
      const b = rotatedBounds(base.width, base.height, base.width, base.height, rotation);
      state = this.deriveState(base, Math.ceil(b.maxX - b.minX) + 2, Math.ceil(b.maxY - b.minY) + 2, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2);
    }
    const items = this.buildTileFetchList(state);
    const results = await promiseAllInBatches((item) => this.fetchImage(item, state), items, 200, 0);
    const output = await processor.combineImages(this.prepareWorkerStates(results), NormaliseMode.Off, normDefaults, undefined, {}) as NormaliseResult<Float32Array>;
    const nw = App.getLatLngFromTileCoords(state.exactPos.x - state.widthInTiles / 2, state.exactPos.y - state.heightInTiles / 2, state.z);
    const se = App.getLatLngFromTileCoords(state.exactPos.x + state.widthInTiles / 2, state.exactPos.y + state.heightInTiles / 2, state.z);
    const physW = this.getDistanceBetweenLatLngs(nw, {latitude: nw.latitude, longitude: se.longitude});
    const physH = this.getDistanceBetweenLatLngs(nw, {latitude: se.latitude, longitude: nw.longitude});
    return {
      heights: output.data, width: state.width, height: state.height, state,
      bounds: L.latLngBounds([se.latitude, nw.longitude], [nw.latitude, se.longitude]),
      mpp: {x: physW / state.width, y: physH / state.height},
    };
  }
  showOverlay(key : string, rgba : Uint8ClampedArray, width : number, height : number, bounds : L.LatLngBounds, opacity = 0.75) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.putImageData(new ImageData(rgba as any, width, height), 0, 0);
    this.removeOverlay(key);
    this.overlays[key] = L.imageOverlay(canvas.toDataURL('image/png'), bounds, {opacity, interactive: false, className: `map-overlay map-overlay--${key}`}).addTo(this.map);
    this.boundingRect?.bringToFront();
  }
  removeOverlay(key : string) {
    this.overlays[key]?.remove();
    delete this.overlays[key];
    if (key === 'sun') {
      this.els.sunHide?.hide();
      this.els.sunNote?.empty();
    }
    if (key === 'trees') {
      this.els.treeHide?.hide();
      this.els.treeNote?.empty();
    }
  }
  clearAreaOverlays() {
    for (const key of Object.keys(this.overlays)) this.removeOverlay(key);
    this.hideContourPreview();
    this.viewshedMarker?.remove();
    this.viewshedMarker = null;
    this.viewshedResult = null;
    this.els.viewDownload?.prop('disabled', true);
  }
  async updateSeaOverlay() {
    if (!this.els.seaOverlay?.is(':checked')) {
      this.removeOverlay('sea');
      return;
    }
    try {
      const o = await this.fetchOverlayHeights(512);
      const sea = this.getSeaLevel();
      const rgba = new Uint8ClampedArray(o.width * o.height * 4);
      let flooded = 0;
      for (let i = 0; i < o.heights.length; i++) {
        if (o.heights[i] <= sea) {
          const depth = Math.min(1, (sea - o.heights[i]) / 200);
          rgba[i * 4] = 30; rgba[i * 4 + 1] = 110 - depth * 60; rgba[i * 4 + 2] = 200 - depth * 80; rgba[i * 4 + 3] = 150 + depth * 80;
          flooded++;
        }
      }
      this.showOverlay('sea', rgba, o.width, o.height, o.bounds, 0.8);
      this.els.seaNote.text(`${this.els.seaNote.text()} Under water at ${sea > 0 ? '+' : ''}${sea} m: ${(flooded / o.heights.length * 100).toFixed(1)}% of the box shown.`.trim());
    } catch (e) {
      console.error('Sea overlay failed', e);
    }
  }
  async previewPaint() {
    const settings = this.getPaintSettings();
    if (!settings.enabled) {
      this.removeOverlay('paint');
      return;
    }
    const button = this.painter.previewButton;
    button.addClass('is-loading');
    try {
      const o = await this.fetchOverlayHeights(512);
      const sea = this.getSeaLevel();
      if (sea) for (let i = 0; i < o.heights.length; i++) o.heights[i] -= sea;
      const ids = paintOsmLayers(settings);
      const features = ids.length ? await this.fetchOsm(o.state, ids) : null;
      const grid = {zoom: o.state.zoom, x0: o.state.exactPos.x - o.state.widthInTiles / 2, y0: o.state.exactPos.y - o.state.heightInTiles / 2, width: o.width, height: o.height};
      const result = await processor.paintPreview(o.heights, o.width, o.height, o.mpp, settings, features ?? undefined, grid);
      this.showOverlay('paint', result.preview, o.width, o.height, o.bounds, 0.85);
      this.painter.showCoverage(result.coverage);
    } catch (e) {
      console.error('Paint preview failed', e);
      this.displayError({text: 'Could not preview the painted layers. Please try again.'});
    } finally {
      button.removeClass('is-loading');
    }
  }
  refreshContourPreview = debounce(400, () => this.previewContours());
  hideContourPreview() {
    this.contourLayer?.remove();
    this.contourLayer = null;
    this.els.contourHide?.hide();
    this.els.contourPreviewNote?.empty();
  }
  /** Draw the contours (or laser-cut layers, stacked) over the map as vectors. */
  async previewContours() {
    const button = this.els.contourPreview;
    button.addClass('is-loading');
    try {
      const o = await this.fetchOverlayHeights(1024);
      const sea = this.getSeaLevel();
      if (sea) for (let i = 0; i < o.heights.length; i++) o.heights[i] -= sea;
      const mode = (this.inputs.contourMode.val() ?? 'lines').toString();
      const layers = mode !== 'lines';
      const result = await processor.contourPreview(o.heights, o.width, o.height, {
        interval: Math.max(0, parseFloat((this.inputs.contourInterval.val() ?? '').toString()) || 0),
        smooth: parseInt((this.inputs.contourSmooth.val() ?? '1').toString(), 10) || 0,
        closed: layers,
      });
      const st = o.state;
      const x0 = st.exactPos.x - st.widthInTiles / 2, y0 = st.exactPos.y - st.heightInTiles / 2;
      const toLatLng = (px : number, py : number) : L.LatLngTuple => {
        const c = App.getLatLngFromTileCoords(x0 + px / o.width * st.widthInTiles, y0 + py / o.height * st.heightInTiles, st.z);
        return [c.latitude, c.longitude];
      };
      const ringLatLngs = (pts : Float32Array) => {
        const out : L.LatLngTuple[] = [];
        for (let i = 0; i < pts.length; i += 2) out.push(toLatLng(pts[i], pts[i + 1]));
        return out;
      };
      const renderer = L.canvas({padding: 0.2});
      const group = L.layerGroup();
      const count = result.contours.length;
      result.contours.forEach((c, k) => {
        const index = Math.round(c.level / result.interval) % 5 === 0;
        if (layers) {
          // Stacked sheets: each level a translucent fill, so higher ground builds up darker
          const rings = c.rings.filter(r => r.points.length >= 6).map(r => ringLatLngs(r.points));
          if (!rings.length) return;
          const t = count > 1 ? k / (count - 1) : 1;
          L.polygon(rings, {renderer, interactive: false, color: '#3b2a1a', weight: 1, opacity: 0.9,
            fillColor: `hsl(${30 - t * 20}, ${45 + t * 20}%, ${78 - t * 45}%)`, fillOpacity: Math.min(0.35, 3 / count)}).addTo(group);
        } else {
          for (const r of c.rings) {
            if (r.points.length < 4) continue;
            const latlngs = ringLatLngs(r.points);
            if (r.closed) latlngs.push(latlngs[0]);
            L.polyline(latlngs, {renderer, interactive: false, color: index ? '#5a2d0c' : '#8a4b1f', weight: index ? 2 : 1, opacity: index ? 0.95 : 0.8}).addTo(group);
          }
        }
      });
      this.contourLayer?.remove();
      this.contourLayer = group.addTo(this.map);
      this.boundingRect?.bringToFront();
      this.els.contourHide.show();
      const unit = (v : number) => `${localFormatNumber(v, v < 10 ? 1 : 0)} m`;
      this.els.contourPreviewNote.text(`${count} ${layers ? 'layers' : 'levels'} every ${unit(result.interval)}, from ${unit(result.min)} to ${unit(result.max)}. ${layers ? 'Darker = higher sheets.' : 'Thicker lines are every 5th (index) contour.'} The export uses the full resolution, so its lines are finer.`);
    } catch (e) {
      console.error('Contour preview failed', e);
      this.els.contourPreviewNote.text('Could not preview the contours. Please try again.');
    } finally {
      button.removeClass('is-loading');
    }
  }
  async previewSunlight() {
    if (!this.isEarth()) {
      this.els.sunNote.text('Sunlight uses Earth\'s sun, so it only works on Earth.');
      return;
    }
    this.els.sunPreview.addClass('is-loading');
    try {
      const o = await this.fetchOverlayHeights(160);
      const state = this.getCurrentState();
      const result = await processor.sunlight(o.heights, o.width, o.height, o.mpp, {latitude: state.latitude, longitude: state.longitude, year: new Date().getFullYear(), stepHours: 1});
      const rgba = new Uint8ClampedArray(o.width * o.height * 4);
      const range = Math.max(1e-6, result.max - result.min);
      for (let i = 0; i < result.data.length; i++) {
        const t = (result.data[i] - result.min) / range;
        // Dark blue (shady) through orange to pale yellow (sunniest)
        rgba[i * 4] = 30 + 225 * Math.min(1, t * 1.4);
        rgba[i * 4 + 1] = 40 + 200 * t * t;
        rgba[i * 4 + 2] = 110 - 60 * t + 120 * Math.max(0, t - 0.85) * 4;
        rgba[i * 4 + 3] = 255;
      }
      this.showOverlay('sun', rgba, o.width, o.height, o.bounds, 0.7);
      this.els.sunHide.show();
      this.els.sunNote.html(`Clear-sky sunlight over a year: ${localFormatNumber(result.min, 0)} to ${localFormatNumber(result.max, 0)} kWh/m² (flat open ground here: ${localFormatNumber(result.flatReference, 0)}). Real totals are lower because of clouds; use it as relative brightness.`);
    } catch (e) {
      console.error('Sunlight preview failed', e);
      this.els.sunNote.text('Could not work out the sunlight. Please try again.');
    } finally {
      this.els.sunPreview.removeClass('is-loading');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Viewshed                                                            */
  /* ------------------------------------------------------------------ */
  viewshedResult : {lat : number, lng : number} | null = null;
  toggleViewshedMode(on = !this.viewshedMode) {
    this.viewshedMode = on;
    this.els.viewPick.toggleClass('is-active', on).text(on ? 'Click the map…' : 'Pick a viewpoint on the map');
    this.els.map.toggleClass('is-picking', on);
    if (on) {
      this.profileTool?.active && this.profileTool.finish();
      this.els.viewNote.text('Click a spot inside the orange export area.');
    }
  }
  clearViewshed() {
    this.removeOverlay('view');
    this.viewshedMarker?.remove();
    this.viewshedMarker = null;
    this.viewshedResult = null;
    this.els.viewDownload.prop('disabled', true);
    this.els.viewNote.text('');
    this.toggleViewshedMode(false);
  }
  viewshedOptions(x : number, y : number) {
    const num = (el : JQuery<HTMLElement>, d : number) => {
      const v = parseFloat((el?.val() ?? '').toString());
      return Number.isFinite(v) ? v : d;
    };
    return {x, y, observerHeight: Math.max(0, num(this.inputs.viewHeight, 1.7)), targetHeight: Math.max(0, num(this.inputs.viewTarget, 0)), radius: this.bodyRadius()};
  }
  async runViewshed(latlng : L.LatLng) {
    this.toggleViewshedMode(false);
    this.viewshedMarker?.remove();
    this.viewshedMarker = L.marker(latlng, {icon: L.divIcon({className: 'viewshed-marker', html: '👁', iconSize: [28, 28], iconAnchor: [14, 14]})}).addTo(this.map);
    this.els.viewNote.text('Working out what can be seen…');
    try {
      const o = await this.fetchOverlayHeights(768);
      const grid = {zoom: o.state.zoom, x0: o.state.exactPos.x - o.state.widthInTiles / 2, y0: o.state.exactPos.y - o.state.heightInTiles / 2, width: o.width, height: o.height};
      const [px, py] = (await import('./osm-layers')).latLngToPixel(grid, latlng.lat, latlng.lng);
      if (px < 0 || py < 0 || px > o.width || py > o.height) {
        this.els.viewNote.text('That spot is outside the export area. Pick a point inside the orange box.');
        return;
      }
      const result = await processor.viewshed(o.heights, o.width, o.height, o.mpp, this.viewshedOptions(px, py));
      const rgba = new Uint8ClampedArray(o.width * o.height * 4);
      for (let i = 0; i < result.visible.length; i++) {
        if (result.visible[i]) { rgba[i * 4] = 40; rgba[i * 4 + 1] = 200; rgba[i * 4 + 2] = 90; rgba[i * 4 + 3] = 150; }
        else { rgba[i * 4] = 200; rgba[i * 4 + 1] = 40; rgba[i * 4 + 2] = 40; rgba[i * 4 + 3] = 110; }
      }
      this.showOverlay('view', rgba, o.width, o.height, o.bounds, 0.8);
      this.viewshedResult = {lat: latlng.lat, lng: latlng.lng};
      this.els.viewDownload.prop('disabled', false);
      this.els.viewNote.html(`Standing on ground at ${localFormatNumber(result.observerGround, 0)} m with eyes ${this.viewshedOptions(0, 0).observerHeight} m up, <b>${(result.fraction * 100).toFixed(1)}%</b> of the box shown is visible.`);
      trackEvent('viewshed/run');
    } catch (e) {
      console.error('Viewshed failed', e);
      this.els.viewNote.text('Could not work out the viewshed. Please try again.');
    }
  }
  /** Visibility mask on the exact heightmap grid (rotation included), as a PNG. */
  async downloadViewshed() {
    if (!this.viewshedResult) return;
    const button = this.els.viewDownload;
    button.addClass('is-loading');
    try {
      const state = this.getCurrentState();
      const input = await this.fetchRawHeights(Math.max(state.width, state.height), undefined, 'raw');
      const grid = {...this.osmGridFor(input.state), width: input.width, height: input.height};
      const [px, py] = (await import('./osm-layers')).latLngToPixel(grid, this.viewshedResult.lat, this.viewshedResult.lng);
      const mpp = {x: input.physWidth / input.width, y: input.physHeight / input.height};
      const result = await processor.viewshed(input.heights, input.width, input.height, mpp, this.viewshedOptions(px, py));
      const png = await App.encodeToPng([result.visible], input.width, input.height, 0, 0, 8);
      this.download(new Blob([png], {type: 'image/png'}), `${this.baseName(state)}_viewshed.png`);
    } catch (e) {
      console.error('Viewshed export failed', e);
      this.displayError({text: 'Could not export the viewshed. Please try again.'});
    } finally {
      button.removeClass('is-loading');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Custom shapes                                                       */
  /* ------------------------------------------------------------------ */
  startShapeDrawing() {
    if (this.shapeDrawing) {
      this.finishShapeDrawing();
      return;
    }
    trackEvent('shape/draw');
    this.profileTool?.active && this.profileTool.finish();
    const line = L.polyline([], {color: '#7a3cff', weight: 2, dashArray: '4 4', interactive: false}).addTo(this.map);
    this.shapeDrawing = {points: [], line};
    this.map.doubleClickZoom.disable();
    this.els.map.addClass('is-picking');
    this.els.shapeDraw.text('Finish shape').addClass('is-info');
  }
  addShapePoint(latlng : L.LatLng) {
    const d = this.shapeDrawing!;
    if (d.points.length >= 3) {
      const first = this.map.latLngToContainerPoint(d.points[0]);
      if (first.distanceTo(this.map.latLngToContainerPoint(latlng)) < 10) {
        this.finishShapeDrawing();
        return;
      }
    }
    d.points.push(latlng);
    d.line.setLatLngs(d.points);
  }
  finishShapeDrawing() {
    const d = this.shapeDrawing;
    if (!d) return;
    d.line.remove();
    this.shapeDrawing = null;
    this.els.map.removeClass('is-picking');
    this.els.shapeDraw.text('Draw a custom shape').removeClass('is-info');
    setTimeout(() => this.map.doubleClickZoom.enable(), 300);
    if (d.points.length >= 3) {
      this.setShape(d.points.map(p => [p.lat, p.lng] as [number, number]), true);
    }
  }
  /** Set (or clear) the custom shape; optionally move and size the export area to fit it. */
  setShape(ring : [number, number][], fit = false) {
    this.inputs.shape.val(ring.length >= 3 ? encodeShape(ring) : '');
    this.storeValue('shape', this.readSetting('shape') ?? '');
    this.drawShape();
    this.updateAreaStatus();
    if (fit && ring.length >= 3) this.fitAreaToShape(ring);
    this.doHeightsDebounced?.();
  }
  drawShape() {
    this.shapeLayer?.remove();
    this.shapeLayer = null;
    const ring = this.getShape();
    if (ring.length >= 3 && this.map) {
      this.shapeLayer = L.polygon(ring, {color: '#7a3cff', weight: 2, fillOpacity: 0.08, dashArray: '6 4', interactive: false}).addTo(this.map);
    }
  }
  fitAreaToShape(ring : [number, number][]) {
    const lats = ring.map(p => p[0]), lngs = ring.map(p => p[1]);
    const centre = {lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2};
    const rotation = this.getRotation();
    let zoom = parseInt(this.inputs.outputzoom.val().toString(), 10) || 13;
    const sizes = Array.from(new Set(this.defaultSizes.concat(this.powerOfTwoSizes).map(s => parseInt(s, 10)))).sort((a, b) => a - b);
    for (; zoom >= 1; zoom--) {
      const c = App.getTileCoordsFromLatLngExact(centre.lat, centre.lng, zoom);
      let w = 0, h = 0;
      for (const [lat, lng] of ring) {
        const t = App.getTileCoordsFromLatLngExact(lat, lng, zoom);
        const [u, v] = (rotation ? (dx : number, dy : number) => {
          const r = rotation * Math.PI / 180;
          return [dx * Math.cos(r) + dy * Math.sin(r), -dx * Math.sin(r) + dy * Math.cos(r)];
        } : (dx : number, dy : number) => [dx, dy])((t.x - c.x) * 256, (t.y - c.y) * 256);
        w = Math.max(w, Math.abs(u) * 2.04);
        h = Math.max(h, Math.abs(v) * 2.04);
      }
      const fitW = this.defaultSizes.map(s => parseInt(s, 10)).sort((a, b) => a - b).find(s => s >= w) ?? sizes.find(s => s >= w);
      const fitH = this.defaultSizes.map(s => parseInt(s, 10)).sort((a, b) => a - b).find(s => s >= h) ?? sizes.find(s => s >= h);
      if (fitW && fitH && fitW <= 8129 && fitH <= 8129) {
        this.inputs.width.val(fitW);
        this.inputs.height.val(fitH);
        this.inputs.outputzoom.val(zoom);
        for (const key of ['width', 'height', 'outputzoom'] as SettingKey[]) this.storeValue(key, this.readSetting(key) ?? '');
        break;
      }
    }
    this.setPositionTo(centre);
    this.updateTileSummary();
    this.doDisEnableControls();
  }

  /* ------------------------------------------------------------------ */
  /* Poster                                                              */
  /* ------------------------------------------------------------------ */
  lastPlaceName = '';
  placeName() : string {
    return this.lastPlaceName;
  }
  formatCoord(lat : number, lng : number) : string {
    const f = (v : number, pos : string, neg : string) => `${Math.abs(v).toFixed(3)}°${v >= 0 ? pos : neg}`;
    return `${f(lat, 'N', 'S')} ${f(lng, 'E', 'W')}`;
  }
  async exportPoster() {
    if (this.isOutputZoomTooHigh()) {
      this.displayError({text: `Cannot make a poster above output zoom ${this.getMaxOutputZoom()} with this elevation source`});
      return;
    }
    const settings = this.posterSettings();
    if (settings.error) {
      this.displayError({text: settings.error});
      return;
    }
    const button = this.els.posterButton;
    button.prop('disabled', true).addClass('is-loading');
    this.resetOutput();
    try {
      const {page, style, paper, dpi, theme, state} = settings;
      const map = this.posterLayout(settings, 1);
      this.getElevationSource().resetStats();
      const input = await this.fetchRawHeights(Math.min(4096, Math.round(Math.max(map.w, map.h) / 1.25)), (msg, pct) => this.showProcessingProgress(msg, pct * 0.8), 'raw');
      this.showProcessingProgress('Drawing the relief…', 85);
      const canvas = document.createElement('canvas');
      await this.drawPoster(canvas, input, settings, 1);
      this.showProcessingProgress('Saving…', 95);
      const blob : Blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not encode the poster')), 'image/png'));
      const filename = `${this.baseName(state)}_poster_${style}_${paper}.png`;
      this.hideProcessingProgress();
      this.download(blob, filename);
      const url = URL.createObjectURL(blob);
      const size = paper === 'custom'
        ? `${(this.inputs.posterWidth.val() ?? '').toString()} × ${(this.inputs.posterHeight.val() ?? '').toString()} ${(this.inputs.posterUnit.val() ?? 'cm').toString()}`
        : paper.toUpperCase();
      this.els.outputText.html('');
      this.els.outputText.append($('<p>').text(`Saved ${filename}: ${page.width} × ${page.height} px (${size} at ${dpi} dpi), ${theme.label}.`));
      this.els.outputImage.append($('<img class="poster-thumb" alt="Poster preview">').attr('src', url));
      this.showResults();
    } catch (e) {
      console.error('Poster failed', e);
      this.hideProcessingProgress();
      this.displayError({text: 'Could not make the poster. Try a lower resolution or a smaller paper size.'});
    } finally {
      button.prop('disabled', false).removeClass('is-loading');
      currentRequests = [];
    }
  }
  /** Where the map sits on the page, at a given scale of the full-size page. */
  posterLayout(settings : ReturnType<App['posterSettings']>, scale : number) {
    const width = Math.max(1, Math.round(settings.page.width * scale)), height = Math.max(1, Math.round(settings.page.height * scale));
    const margin = Math.round(Math.min(width, height) * 0.07);
    const footer = Math.round(height * (settings.paper === 'screen' ? 0.16 : 0.14));
    const availW = width - margin * 2, availH = height - margin * 2 - footer;
    let w = availW, h = Math.round(availW / settings.aspect);
    if (h > availH) { h = availH; w = Math.round(availH * settings.aspect); }
    return {width, height, margin, footer, availH, w: Math.max(1, w), h: Math.max(1, h)};
  }
  /** Lay out the whole poster on `canvas`: full size for the export (scale 1), or scaled down for the preview. */
  async drawPoster(canvas : HTMLCanvasElement, input : {heights : Float32Array, width : number, height : number, physWidth : number, physHeight : number}, settings : ReturnType<App['posterSettings']>, scale : number) {
    const {theme, style, state} = settings;
    const L0 = this.posterLayout(settings, scale);
    const {width: pageW, height: pageH, margin, footer, availH} = L0;
    const mapW = L0.w, mapH = L0.h;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < input.heights.length; i++) { if (input.heights[i] < min) min = input.heights[i]; if (input.heights[i] > max) max = input.heights[i]; }
    const interval = settings.contours === 'auto' ? niceDistance((max - min) / 15) : parseFloat(settings.contours) || 0;
    const water = this.isEarth() && min < 0.5 ? 0 : (this.inputs.flattenWater?.is(':checked') || this.inputs.waterMask?.is(':checked') ? this.getWaterLevel() : null);
    const rgba = await processor.renderPoster(input.heights, input.width, input.height, {
      style, width: mapW, height: mapH, mpp: {x: input.physWidth / input.width, y: input.physHeight / input.height},
      zFactor: settings.z, contourInterval: interval, waterLevel: water,
    });
    canvas.width = pageW;
    canvas.height = pageH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, pageW, pageH);
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = mapW;
    mapCanvas.height = mapH;
    mapCanvas.getContext('2d')!.putImageData(new ImageData(rgba as any, mapW, mapH), 0, 0);
    const mapX = Math.round((pageW - mapW) / 2), mapY = margin + Math.round((availH - mapH) / 2);
    ctx.drawImage(mapCanvas, mapX, mapY);
    const unit = Math.min(pageW, pageH) / 100;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = Math.max(scale < 1 ? 0.5 : 1, unit * 0.12);
    ctx.strokeRect(mapX, mapY, mapW, mapH);
    // QR code link (bottom left of the footer, a full margin above the page edge)
    let qr : {x : number, y : number, size : number, module : number, modules : boolean[][], quiet : number} | null = null;
    if (settings.qr) {
      const modules = qrModules(posterQrUrl(buildHash(this.readSettings()), `${style}_${settings.paper}`));
      const n = modules.length;
      // Modules of at least 0.4 mm printed, so phones can read a long link
      const minModule = 0.4 / 25.4 * settings.dpi * scale;
      let size = Math.min(footer * 0.78, Math.max(unit * 7, n * minModule));
      let module = size / n;
      if (scale >= 1 && module >= 2) module = Math.floor(module);
      size = module * n;
      const quiet = module * 2;
      qr = {x: mapX + quiet, y: pageH - margin - quiet - size, size, module, modules, quiet};
    }
    const reserve = qr ? qr.size + qr.quiet * 2 + unit * 2 : 0;
    // Title block
    const title = (settings.title || this.placeName() || this.formatCoord(state.latitude, state.longitude)).toUpperCase();
    const titleY = pageH - margin - footer + Math.round(footer * 0.42);
    ctx.fillStyle = theme.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let titleSize = unit * 5.2;
    ctx.font = `600 ${titleSize}px ${theme.font}`;
    const spaced = title.split('').join(String.fromCharCode(8202));
    while (ctx.measureText(spaced).width > pageW - (margin + reserve) * 2 && titleSize > unit * 2) {
      titleSize *= 0.92;
      ctx.font = `600 ${titleSize}px ${theme.font}`;
    }
    ctx.fillText(spaced, pageW / 2, titleY);
    ctx.fillStyle = theme.muted;
    let subSize = unit * 1.6;
    ctx.font = `${subSize}px ${theme.font}`;
    const world = this.getBody() === 'earth' ? '' : ` · ${this.getBody().charAt(0).toUpperCase()}${this.getBody().slice(1)}`;
    const sub = `${this.formatCoord(state.latitude, state.longitude)}${world}  ·  ${localFormatNumber(min, 0)} m to ${localFormatNumber(max, 0)} m${interval ? `  ·  contours every ${localFormatNumber(interval, 0)} m` : ''}`;
    while (ctx.measureText(sub).width > pageW - (margin + reserve) * 2 && subSize > unit) {
      subSize *= 0.92;
      ctx.font = `${subSize}px ${theme.font}`;
    }
    ctx.fillText(sub, pageW / 2, titleY + unit * 3.2);
    // Scale bar (bottom left of the footer)
    const metresPerPx = state.phys.width / mapW;
    const barMetres = niceDistance(metresPerPx * mapW * 0.22);
    const barPx = barMetres / metresPerPx;
    const barX = mapX + reserve, barY = pageH - margin - unit * 1.2;
    ctx.fillStyle = theme.ink;
    for (let k = 0; k < 4; k++) {
      ctx.globalAlpha = k % 2 ? 0.25 : 1;
      ctx.fillRect(barX + barPx / 4 * k, barY - unit * 0.5, barPx / 4, unit * 0.5);
    }
    ctx.globalAlpha = 1;
    ctx.strokeRect(barX, barY - unit * 0.5, barPx, unit * 0.5);
    ctx.textAlign = 'left';
    ctx.font = `${unit * 1.2}px ${theme.font}`;
    ctx.fillText(barMetres >= 1000 ? `${localFormatNumber(barMetres / 1000, barMetres >= 10000 ? 0 : 1)} km` : `${localFormatNumber(barMetres, 0)} m`, barX + barPx + unit, barY);
    // North arrow (bottom right), turned for rotated areas
    const ax = mapX + mapW - unit * 2.5, ay = barY - unit * 1.2;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-this.getRotation() * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(0, -unit * 2.2);
    ctx.lineTo(unit * 0.9, unit * 0.9);
    ctx.lineTo(0, unit * 0.3);
    ctx.lineTo(-unit * 0.9, unit * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.font = `600 ${unit * 1.3}px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -unit * 2.6);
    ctx.restore();
    // Credits along the bottom margin: elevation data on the right, ours (with a QR link) on the left
    const creditY = pageH - margin * 0.45;
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.muted;
    ctx.font = `${unit * 0.9}px ${theme.font}`;
    const credit = $('<div>').html(this.getElevationSource().attributionHtml).text().replace(/\s+/g, ' ').slice(0, 160);
    ctx.fillText(`Elevation: ${credit}`, mapX + mapW, creditY);
    if (qr) {
      const colours = qrColours(theme);
      ctx.fillStyle = colours.light;
      ctx.fillRect(qr.x - qr.quiet, qr.y - qr.quiet, qr.size + qr.quiet * 2, qr.size + qr.quiet * 2);
      ctx.fillStyle = colours.dark;
      // Slight overlap between modules so no hairline gaps show when scaled
      const m = qr.module, pad = scale < 1 ? 0.3 : 0;
      qr.modules.forEach((row, r) => row.forEach((dark, c) => {
        if (dark) ctx.fillRect(qr!.x + c * m, qr!.y + r * m, m + pad, m + pad);
      }));
    }
    if (settings.credit) {
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.muted;
      ctx.font = `${unit * 0.9}px ${theme.font}`;
      ctx.fillText('Generated with unrealheightmap', mapX, creditY);
    }
  }
  createSubmitButton() {
    this.els.generatedColumn = $('<div class="column content">');
    this.els.generatorInfo = $('<div class="generatorInfo">');
    this.els.generatorInfoPrimary = $('<div class="generatorInfo-primary">');
    this.els.tilingSummary = $('<div class="tilingSummary">Tiled export disabled.</div>');
    this.els.generatorInfo.append(this.els.generatorInfoPrimary);
    this.els.generatorInfo.append(this.els.tilingSummary);
    this.els.boundsInfo = $('<details class="boundsInfo"><summary>Bounds &amp; projection (EPSG:3857, click to expand):</summary></details>');
    this.els.boundsContent = $('<pre class="boundsContent">');
    this.els.generatedColumn.append(this.els.generatorInfo);
    this.els.scaleInfo = $('<div class="scaleInfo" style="font-size: 0.85em; margin-top: 0.5em;">');
    const scaleInfoLabel = $('<span style="font-weight: 600;">Approx. UE scale:</span> ');
    const scaleInfoIcon = $('<span class="info-icon"> ℹ️ </span>');
    tippy(scaleInfoIcon[0], {
      ...deafultTippyOptions,
      content: 'This is an approximation based on the current preview. The heightmap generation process will calculate and display the actual scale values.'
    });
    scaleInfoLabel.append(scaleInfoIcon);
    this.els.scaleInfo.append(scaleInfoLabel);
    this.els.scaleInfoValues = $('<span>');
    this.els.scaleInfo.append(this.els.scaleInfoValues);
    this.els.generatedColumn.append(this.els.scaleInfo);
    this.els.generatedColumn.append(this.els.boundsInfo.append(this.els.boundsContent));
    this.els.generate = $('<button class="button is-primary">Generate Heightmap</button>');
    this.els.generateAlbedo = $('<button class="button is-secondary is-light" data-orig-text="Albedo">Albedo</button>');

    tippy(this.els.generate[0], {
      ...deafultTippyOptions,
      content: 'Start the heightmap exporting process. This will export the orange area in the preview as a heightmap.',
    });
    tippy(this.els.generateAlbedo[0], {
      ...deafultTippyOptions,
      content: 'Use this to export the visible map in the preview. This is good for exporting satellite imagery or textures for texturing your map afterwards.',
    });
    this.els.progressHost = $('<div class="sidebar-foot__progress">');
    this.els.sidebarFoot.append(
      this.els.generatedColumn,
      this.els.progressHost,
      $('<div class="buttons sidebar-foot__buttons">').append(this.els.generate, this.els.generateAlbedo),
    );
  }
  /** The form control behind each shareable setting. */
  getSettingControl(key : SettingKey) : JQuery<HTMLInputElement|HTMLSelectElement> | undefined {
    const controls : Record<SettingKey, JQuery<HTMLInputElement|HTMLSelectElement> | undefined> = {
      latitude: this.inputs.latitude,
      longitude: this.inputs.longitude,
      zoom: this.inputs.zoom,
      outputzoom: this.inputs.outputzoom,
      elevsource: this.inputs.elevSource,
      width: this.inputs.width,
      height: this.inputs.height,
      outputformat: this.inputs.outputformat,
      maptype: this.inputs.maptype,
      normmode: this.inputs.smartNormalisationControl,
      normfrom: this.inputs.normFrom,
      normto: this.inputs.normTo,
      tilemode: this.inputs.tileMode,
      tilewidth: this.inputs.tileWidth,
      tileheight: this.inputs.tileHeight,
      tilecountx: this.inputs.tileCountX,
      tilecounty: this.inputs.tileCountY,
      tilezip: this.tileZipEl?.find('input') as JQuery<HTMLInputElement>,
      tilepad: this.tilePadEl?.find('input') as JQuery<HTMLInputElement>,
      tileunrealname: this.tileUnrealNameEl?.find('input') as JQuery<HTMLInputElement>,
      waterlevel: this.inputs.waterLevel,
      flattenwater: this.inputs.flattenWater,
      watermask: this.inputs.waterMask,
      normalmap: this.inputs.normalMap,
      slopemap: this.inputs.slopeMap,
      curvaturemap: this.inputs.curvatureMap,
      aomap: this.inputs.aoMap,
      flowmap: this.inputs.flowMap,
      aspectmap: this.inputs.aspectMap,
      heightbands: this.inputs.heightBands,
      osmlayers: this.inputs.osmLayers,
      osmweights: this.inputs.osmWeights,
      importscripts: this.inputs.importScripts,
      meshformat: this.inputs.meshFormat,
      meshres: this.inputs.meshRes,
      meshsolid: this.inputs.meshSolid,
      basethickness: this.inputs.baseThickness,
      meshscale: this.inputs.meshScale,
      printwidth: this.inputs.printWidth,
      exaggeration: this.inputs.exaggeration,
      contourinterval: this.inputs.contourInterval,
      contourmode: this.inputs.contourMode,
      contourformat: this.inputs.contourFormat,
      contourwidth: this.inputs.contourWidth,
      contoursmooth: this.inputs.contourSmooth,
      meshsimplify: this.inputs.meshSimplify,
      meshtexture: this.inputs.meshTexture,
      texturesize: this.inputs.textureSize,
      rotation: this.inputs.rotation,
      shape: this.inputs.shape,
      seammode: this.inputs.seamMode,
      seamperiod: this.inputs.seamPeriod,
      seamoverlap: this.inputs.seamOverlap,
      sealevel: this.inputs.seaLevel,
      carveroads: this.inputs.carveRoads,
      carverail: this.inputs.carveRail,
      carverivers: this.inputs.carveRivers,
      carvelakes: this.inputs.carveLakes,
      carveshoulder: this.inputs.carveShoulder,
      carvedepth: this.inputs.carveDepth,
      paint: this.inputs.paint,
      scatter: this.inputs.scatter,
      sunmap: this.inputs.sunMap,
      treemap: this.inputs.treeMap,
      treemin: this.inputs.treeMin,
      treedensity: this.inputs.treeDensity,
      treespacing: this.inputs.treeSpacing,
      treeleaf: this.inputs.treeLeaf,
      treeswiss: this.inputs.treeSwiss,
      splines: this.inputs.splines,
      buildings: this.inputs.buildings,
      buildingheight: this.inputs.buildingHeight,
      label: this.inputs.label,
      labeltext: this.inputs.labelText,
      colorbands: this.inputs.colorBands,
      bandlevels: this.inputs.bandLevels,
      bandcolors: this.inputs.bandColors,
      lithophane: this.inputs.lithophane,
      lithomin: this.inputs.lithoMin,
      lithomax: this.inputs.lithoMax,
      posterstyle: this.inputs.posterStyle,
      posterpaper: this.inputs.posterPaper,
      posterdpi: this.inputs.posterDpi,
      postertitle: this.inputs.posterTitle,
      postercontours: this.inputs.posterContours,
      posterz: this.inputs.posterZ,
      posterwidth: this.inputs.posterWidth,
      posterheight: this.inputs.posterHeight,
      posterunit: this.inputs.posterUnit,
      postercredit: this.inputs.posterCredit,
      posterqr: this.inputs.posterQr,
      viewheight: this.inputs.viewHeight,
    };
    return controls[key];
  }
  static isCheckbox(el : JQuery<HTMLElement>) : boolean {
    return !!el && el.is(':checkbox');
  }
  readSetting(key : SettingKey) : string | undefined {
    const el = this.getSettingControl(key);
    if (!el || !el.length) {
      return undefined;
    }
    if (App.isCheckbox(el)) {
      return el.is(':checked') ? '1' : '0';
    }
    return (el.val() ?? '').toString();
  }
  writeSetting(key : SettingKey, value : string) {
    const el = this.getSettingControl(key);
    if (!el || !el.length || App.isFocused(el)) {
      return;
    }
    if (App.isCheckbox(el)) {
      el.prop('checked', value === '1' || value === 'true');
      return;
    }
    // Ignore values a <select> doesn't offer (e.g. a renamed map layer in an old link)
    if (el.is('select') && !el.find('option').filter((_, o) => (o as HTMLOptionElement).value === value).length) {
      return;
    }
    el.val(value);
  }
  readSettings() : SettingValues {
    const values : SettingValues = {};
    for (const key of Object.keys(SETTINGS) as SettingKey[]) {
      const value = this.readSetting(key);
      if (value !== undefined) {
        values[key] = value;
      }
    }
    return values;
  }
  insertSavedValues() {
    for (const key of Object.keys(SETTINGS) as SettingKey[]) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const value = JSON.parse(val) as StoredItemValue;
          if (value.data !== undefined && value.data !== null && value.data !== '') {
            this.writeSetting(key, value.data);
          }
        }
      } catch (e) {
        // Corrupt or blocked storage: fall back to defaults
      }
    }
    this.insertValuesFromUrlHash();
    this.toggleTileInputs();
    this.updateTileSummary();
    this.updateExtraMapsSummary();
    this.syncOsmCheckboxes();
    this.syncFeatureControls();
  }
  /** Bring the editors and readouts in line with the (hidden) settings after loading values. */
  syncFeatureControls() {
    this.painter?.set(this.getPaintSettings());
    this.scatterEditor?.setPaintLayers(this.getPaintSettings().enabled ? [...this.getPaintSettings().rules.map(r => r.name), this.getPaintSettings().baseName] : []);
    this.scatterEditor?.set(this.getScatterSets());
    this.syncSplineCheckboxes();
    const rot = this.getRotation();
    this.els.rotationRange?.val(rot > 180 ? rot - 360 : rot);
    this.renderBandSwatches();
    this.drawShape();
    this.updateAreaStatus();
    this.updateSeamlessNote();
    this.updateSeaNote();
    this.updateCarveNote();
    this.updateLayerStatus();
    this.updatePrintNote();
  }
  insertValuesFromUrlHash() {
    const values = parseHash(location.hash);
    if (!Object.keys(values).length) {
      return;
    }
    trackDebounced('share/open', 'share/open', 500);
    // Links leave out default values to stay short, so anything missing means
    // "default" rather than "whatever this browser used last time".
    for (const key of Object.keys(SETTINGS) as SettingKey[]) {
      const value = values[key] ?? SETTINGS[key].default;
      if (value !== null) {
        this.writeSetting(key, value);
      }
    }
    this.toggleTileInputs();
    this.updateTileSummary();
    this.updateExtraMapsSummary();
    this.toggleMeshInputs();
    this.updateMeshEstimate();
    this.updateElevationSourceNote();
    this.syncOsmCheckboxes();
    this.syncFeatureControls();
  }
  /** Mirror the current settings into the address bar without adding history entries. */
  writeHash() {
    const hash = buildHash(this.readSettings());
    if (hash !== location.hash) {
      history.replaceState(null, '', hash);
    }
    this.lastWrittenHash = location.hash;
  }
  storeValue(key : string, data : string, expires : number = null) {
    expires = expires || ((new Date()).getTime())+(1000*60*60*24*30);
    let storedItem : StoredItemValue = {key, data, expires};
    try {
      localStorage.setItem(key, JSON.stringify(storedItem));
    } catch (e) {
      // Storage may be full or disabled; the URL still carries the state
    }
    this.writeHashThrottled();
  }
  writeHashThrottled = throttle(250, () => this.writeHash());
  saveLatLngZoomState() {
    this.storeValue('latitude', this.inputs.latitude.val().toString());
    this.storeValue('longitude', this.inputs.longitude.val().toString());
    this.storeValue('zoom', this.inputs.zoom.val().toString());
  }
  doDisEnableControls() {
    const max = this.getMaxOutputZoom();
    if (this.isOutputZoomTooHigh()) {
      this.els.generate.prop('disabled', true);
      this.els.generate.prop('title', `Cannot generate heightmap above output zoom ${max} with this elevation source`);
      this.els.generate.text(`Output Zoom too high (>${max})`);
    } else {
      this.els.generate.prop('disabled', false);
      this.els.generate.prop('title', 'Generate heightmap');
      this.els.generate.text('Generate Heightmap');
    }
  }
  /** GeoTIFF is always in metres, so normalisation doesn't apply. */
  toggleNormalisationInputs() {
    const geotiff = this.isGeoTiff();
    [this.inputs.smartNormalisationControl, this.inputs.normFrom, this.inputs.normTo].forEach(input => input?.prop('disabled', geotiff));
    this.els.smartNormalisationControl?.closest('.column').toggleClass('is-disabled', geotiff);
    this.els.normFrom?.closest('.column').toggleClass('is-disabled', geotiff);
    this.els.normTo?.closest('.column').toggleClass('is-disabled', geotiff);
  }
  hookControls() {
    const doHeightsDebounced = debounce(50, () => {
      this.getApproxHeightsForState();
    });
    this.inputs.defaultSize.on('change input', debounce(100, () => {
      const val = this.inputs.defaultSize.val();
      trackControl('default-size', val?.toString().replace(' x ', 'x'));
      if (val && typeof val === 'string' && val.trim() !== '') {
        const parts = val.split(" x ");
        if (parts.length === 2) {
          this.inputs.width.val(parts[0]);
          this.inputs.height.val(parts[1]);
        }
      }
      this.storeValue('width', this.inputs.width.val().toString());
      this.storeValue('height', this.inputs.height.val().toString());
      this.updatePhysicalDimensions();
      this.updateTileSummary();
      doHeightsDebounced();
    }));

    this.els.generate.on('click touchend', debounce(100, () => {
      const tiling = this.inputs.tileMode.val()?.toString() || 'off';
      trackEvent(`generate/heightmap/${this.inputs.outputformat.val()}/${tiling === 'off' ? 'single' : 'tiled'}`);
      this.generate();
      countDonatePrompt();
    }));

    this.els.generateAlbedo.on('click touchend', debounce(100, () => {
      trackEvent(`generate/albedo/${this.activeLayerKey()}`);
      this.generateAlbedo();
      countDonatePrompt();
    }));

    this.inputs.maptype.on('change input', debounce(30, () => {
      this.storeValue('maptype', this.inputs.maptype.val().toString());
      trackControl('maptype', this.inputs.maptype.val().toString());
      this.showHideCurrentLayer();
      doHeightsDebounced();
    }));

    this.inputs.tileMode.on('change input', debounce(30, () => {
      this.storeValue('tilemode', this.inputs.tileMode.val()?.toString() || 'off');
      trackControl('tilemode', this.inputs.tileMode.val()?.toString() || 'off');
      this.toggleTileInputs();
      this.updateTileSummary();
    }));

    this.inputs.tileWidth.on('change input', debounce(30, () => {
      this.storeValue('tilewidth', this.inputs.tileWidth.val().toString());
      trackControl('tile-size');
      this.updateTileSummary();
    }));

    this.inputs.tileHeight.on('change input', debounce(30, () => {
      this.storeValue('tileheight', this.inputs.tileHeight.val().toString());
      trackControl('tile-size');
      this.updateTileSummary();
    }));

    this.inputs.tileCountX.on('change input', debounce(30, () => {
      this.storeValue('tilecountx', this.inputs.tileCountX.val().toString());
      trackControl('tile-count');
      this.updateTileSummary();
    }));

    this.inputs.tileCountY.on('change input', debounce(30, () => {
      this.storeValue('tilecounty', this.inputs.tileCountY.val().toString());
      trackControl('tile-count');
      this.updateTileSummary();
    }));

    this.inputs.latitude.on('change input', debounce(30, () => {
      if (!App.isValidNumberInput(this.inputs.latitude) || !App.isValidNumberInput(this.inputs.longitude)) return;
      this.storeValue('latitude', this.inputs.latitude.val().toString());
      trackControl('coords');
      this.map.setView({
        lat: parseFloat(this.inputs.latitude.val().toString()),
        lng: parseFloat(this.inputs.longitude.val().toString())
      });
      this.updatePhysicalDimensions();
      this.updateTileSummary();
      doHeightsDebounced();
    }));

    this.inputs.longitude.on('change input', debounce(30, () => {
      if (!App.isValidNumberInput(this.inputs.latitude) || !App.isValidNumberInput(this.inputs.longitude)) return;
      this.storeValue('longitude', this.inputs.longitude.val().toString());
      trackControl('coords');
      this.map.setView({
        lat: parseFloat(this.inputs.latitude.val().toString()),
        lng: parseFloat(this.inputs.longitude.val().toString())
      });
      this.updatePhysicalDimensions();
      this.updateTileSummary();
      doHeightsDebounced();
    }));

    this.inputs.zoom.on('change input', debounce(30, () => {
      if (!App.isValidNumberInput(this.inputs.zoom)) return;
      this.storeValue('zoom', this.inputs.zoom.val().toString());
      trackControl('zoom');
      this.map.setZoom(parseInt(this.inputs.zoom.val().toString()));
      this.updatePhysicalDimensions();
      this.updateTileSummary();
      doHeightsDebounced();
    }));

    this.inputs.outputzoom.on('change input', debounce(30, () => {
      this.storeValue('outputzoom', this.inputs.outputzoom.val().toString());
      trackControl('outputzoom', this.inputs.outputzoom.val().toString());
      this.updatePhysicalDimensions();
      this.doDisEnableControls();
      doHeightsDebounced();
    }));

    this.inputs.width.on('change input', debounce(30, () => {
      this.storeValue('width', this.inputs.width.val().toString());
      trackControl('output-size');
      this.updatePhysicalDimensions();
      this.updateTileSummary();
      doHeightsDebounced();
    }));

    this.inputs.height.on('change input', debounce(30, () => {
      this.storeValue('height', this.inputs.height.val().toString());
      trackControl('output-size');
      this.updatePhysicalDimensions();
      this.updateTileSummary();
      doHeightsDebounced();
    }));

    this.inputs.demFile.on('change', () => {
      const file = (this.inputs.demFile[0] as HTMLInputElement).files?.[0];
      if (file) this.loadDemFile(file);
      this.inputs.demFile.val('');
    });
    this.inputs.elevSource.on('change', () => {
      const value = this.inputs.elevSource.val().toString();
      if (value === 'upload' && !this.elevationSources.upload) {
        this.inputs.demFile.trigger('click');
      }
      this.storeValue('elevsource', value);
      trackControl('elevsource', value);
      this.updateElevationSourceNote();
      this.updateBody();
      this.doDisEnableControls();
      doHeightsDebounced();
    });
    this.updateElevationSourceNote();
    // A shared link to Mars should open where it points, not at the default site
    this.updateBody(true);

    this.inputs.outputformat.on('change input', debounce(30, () => {
      this.storeValue('outputformat', this.inputs.outputformat.val().toString());
      trackControl('outputformat', this.inputs.outputformat.val().toString());
      this.toggleNormalisationInputs();
    }));
    this.toggleNormalisationInputs();

    this.inputs.smartNormalisationControl.on('change', () => {
      const labels : Record<string, string> = {'0': 'off', '1': 'regular', '3': 'smart'};
      const val = this.inputs.smartNormalisationControl.val().toString();
      this.storeValue('normmode', val);
      trackControl('normalisation', labels[val] ?? val);
    });

    this.inputs.normFrom.on('change input', () => {
      this.storeValue('normfrom', this.inputs.normFrom.val().toString());
      trackControl('norm-range');
    });
    this.inputs.normTo.on('change input', () => {
      this.storeValue('normto', this.inputs.normTo.val().toString());
      trackControl('norm-range');
    });

    this.hookExtraOutputControls(doHeightsDebounced);
    this.hookMeshControls();
    this.hookContourControls();

    window.addEventListener('paste', (event : ClipboardEvent) => {
      // @ts-ignore
      let paste = (event.clipboardData || window.clipboardData).getData("text");
      if (paste) {
        if (this.isPasteableText(paste)) {
          const latLng = this.getLatLngFromText(paste);
          console.log('Pasted latLng', latLng);
          trackEvent('coords/paste');

          this.storeValue('latitude', latLng.latitude.toString());
          this.storeValue('longitude', latLng.longitude.toString());
          this.inputs.latitude.val(latLng.latitude);
          this.inputs.longitude.val(latLng.longitude);
          this.map.setView({
            lat: parseFloat(this.inputs.latitude.val().toString()),
            lng: parseFloat(this.inputs.longitude.val().toString())
          });
          this.updatePhysicalDimensions();
          doHeightsDebounced();
        } else {
          console.log('Text was not pasteable', paste);
        }
      }
    });

    this.inputs.latitude.add(this.inputs.longitude).add(this.inputs.zoom).on('blur', () => {
      this.syncInputsFromMap();
    });

    window.addEventListener('hashchange', debounce(50, (event : HashChangeEvent) => {
      // We write the hash with replaceState (which fires no event), so this only
      // runs for external changes: a pasted link, or back/forward.
      if (location.hash !== this.lastWrittenHash) {
        this.lastWrittenHash = location.hash;
        this.insertValuesFromUrlHash();
        this.updateBody(true);
        this.showHideCurrentLayer();
        this.setMapViewFromInputs();
        // The map may not move (e.g. only output zoom/size changed), so refresh the readouts explicitly
        this.updatePhysicalDimensions();
        this.updateTileSummary();
        this.doDisEnableControls();
        doHeightsDebounced();
      }
    }));

    this.doDisEnableControls();
  }
  syncInputsFromMap() {
    // After editing, restore any coordinate/zoom input left empty or invalid
    const center = this.map.getCenter();
    if (!App.isValidNumberInput(this.inputs.latitude)) {
      this.inputs.latitude.val(center.lat);
    }
    if (!App.isValidNumberInput(this.inputs.longitude)) {
      this.inputs.longitude.val(center.lng);
    }
    if (!App.isValidNumberInput(this.inputs.zoom)) {
      this.inputs.zoom.val(this.map.getZoom());
    }
    this.saveLatLngZoomState();
  }
  setMapViewFromInputs() {
    this.map.setView({
      lat: parseFloat(this.inputs.latitude.val().toString()),
      lng: parseFloat(this.inputs.longitude.val().toString())
    }, parseInt(this.inputs.zoom.val().toString()));
  }
  getLatLngFromText(text : string) : LatLng|null {
    const google = /([0-9]{1,3}.?[0-9]*)°? ?(S|N), ?([0-9]{1,3}.?[0-9]*)°? ?(E|W)/;
    const gmatch = text.trim().match(google);
    if (gmatch) {
      let latitude = parseFloat(gmatch[1]);
      let longitude = parseFloat(gmatch[3]);
      if (gmatch[2].toUpperCase() === 'S') {
        latitude = -latitude;
      }
      if (gmatch[4].toUpperCase() === 'W') {
        longitude = -longitude;
      }
      return {
        latitude,
        longitude
      };
    }
    // 32°53′S 64°13′W
    const generic = /([-0-9]{1,3}.?[0-9]*) *, *([-0-9]{1,3}.?[0-9]*)/;
    const genmatch = text.trim().match(generic);
    if (genmatch) {
      let latitude = parseFloat(genmatch[1]);
      let longitude = parseFloat(genmatch[2])
      return {
        latitude,
        longitude
      };
    }
    const degreesMinsSecs = /([0-9]{1,2})[*°] *([0-9]{1,2})[′'] *([0-9.]{1,6})[″"] *(S|N) ?([0-9]{1,3})[*°] *([0-9]{1,2})[′'] *([0-9.]{1,6})[″"] *(E|W)/;
    const dmsmatch = text.trim().match(degreesMinsSecs);
    if (dmsmatch) {
      let latitude  = parseFloat(dmsmatch[1]) + parseFloat(dmsmatch[2])/60 + parseFloat(dmsmatch[3])/(60*60);
      let longitude = parseFloat(dmsmatch[5]) + parseFloat(dmsmatch[6])/60 + parseFloat(dmsmatch[7])/(60*60);
      if (dmsmatch[4].toUpperCase() === 'S') {
        latitude = -latitude;
      }
      if (dmsmatch[8].toUpperCase() === 'W') {
        longitude = -longitude;
      }
      return {
        latitude,
        longitude
      };
    }
    const degreesMins = /([0-9]{1,2})[*°] *([0-9]{1,2})[′'] *(S|N) ?([0-9]{1,3})[*°] *([0-9]{1,2})[′'] *(E|W)/;
    const dmmatch = text.trim().match(degreesMins);
    if (dmmatch) {
      let latitude  = parseFloat(dmmatch[1]) + parseFloat(dmmatch[2])/60;
      let longitude = parseFloat(dmmatch[4]) + parseFloat(dmmatch[5])/60;
      if (dmmatch[3].toUpperCase() === 'S') {
        latitude = -latitude;
      }
      if (dmmatch[6].toUpperCase() === 'W') {
        longitude = -longitude;
      }
      return {
        latitude,
        longitude
      };
    }
    return null;
  }
  isPasteableText(text : string) : boolean {
    return this.getLatLngFromText(text) !== null;
  }
  newState() : ConfigState {
    return {
      x: 0,
      y: 0,
      z: 0,
      latitude: 0,
      longitude: 0,
      zoom: 0,
      width: 0,
      height: 0,
      exactPos: {x:0, y:0, z:0},
      widthInTiles: 0,
      heightInTiles: 0,
      startx: 0,
      starty: 0,
      endx: 0,
      endy: 0,
      bounds: [{latitude:0, longitude:0},{latitude:0, longitude:0}],
      status: 'pending',
      phys: {width: 0, height: 0},
      min: {x: 0, y: 0},
      max: {x: 0, y: 0},
      type: 'heightmap',
      url: ''
    };
  }
  getCurrentState(scaleApprox : number = 1) : ConfigState {
    const state = this.newState();

    const z = parseInt(this.inputs.outputzoom.val().toString());
    const newZ = Math.floor(Math.min(18, Math.max(1, z + Math.log2(scaleApprox))));
    const scale = Math.pow(2, newZ-z);

    state.latitude  = parseFloat(this.inputs.latitude.val().toString());
    state.longitude = parseFloat(this.inputs.longitude.val().toString());
    state.z         = newZ;
    state.zoom      = newZ;
    // Whole pixels: a scaled-down grid (e.g. 2017 px at 1/4) must not end up fractional
    state.width     = Math.max(1, Math.round(parseInt(this.inputs.width.val().toString()) * scale));
    state.height    = Math.max(1, Math.round(parseInt(this.inputs.height.val().toString()) * scale));

    state.exactPos = App.getTileCoordsFromLatLngExact(state.latitude, state.longitude, state.zoom);
    state.widthInTiles = state.width/NextZen.tileWidth;
    state.heightInTiles = state.height/NextZen.tileHeight;

    state.min = App.getTileCoordsFromLatLngExact( 85, -179.999, newZ);
    state.min.x = Math.floor(state.min.x);
    state.min.y = 0;
    state.max = App.getTileCoordsFromLatLngExact(-85,  179.999, newZ);
    state.max.x = Math.ceil(state.max.x);
    state.max.y = Math.floor(state.max.y);

    state.startx = Math.floor(state.exactPos.x - state.widthInTiles/2);
    state.endx   = Math.floor(state.exactPos.x + state.widthInTiles/2);
    state.starty = clamp(Math.floor(state.exactPos.y - state.heightInTiles/2), state.min.y, state.max.y);
    state.endy   = clamp(Math.floor(state.exactPos.y + state.heightInTiles/2), state.min.y, state.max.y);

    state.heightInTiles = clamp(state.exactPos.y + state.heightInTiles/2, state.min.y, state.max.y) - clamp(state.exactPos.y - state.heightInTiles/2, state.min.y, state.max.y);
    state.height = state.heightInTiles * NextZen.tileHeight;

    state.bounds = [
      App.getLatLngFromTileCoords(
        state.exactPos.x - state.widthInTiles/2,
        state.exactPos.y - state.heightInTiles/2,
        state.zoom
      ),
      App.getLatLngFromTileCoords(
        state.exactPos.x + state.widthInTiles/2,
        state.exactPos.y + state.heightInTiles/2,
        state.zoom
      )
    ];


    state.phys = {
      height:0,
      width: 0,
    };

    // Width = difference in longitudes
    state.phys.width = this.getDistanceBetweenLatLngs(state.bounds[0], {
      latitude: state.bounds[0].latitude,
      longitude: state.bounds[1].longitude,
    });

    // Height = difference in latitudes
    state.phys.height = this.getDistanceBetweenLatLngs(state.bounds[0], {
      latitude: state.bounds[1].latitude,
      longitude: state.bounds[0].longitude,
    });

    return state;
  }
  // From https://www.movable-type.co.uk/scripts/latlong.html
  getDistanceBetweenLatLngs(point1 : LatLng, point2 : LatLng) : number {
    const R = this.bodyRadius(); // metres
    const φ1 = point1.latitude * Math.PI/180; // φ, λ in radians
    const φ2 = point2.latitude * Math.PI/180;
    const Δφ = (point2.latitude-point1.latitude) * Math.PI/180;
    const Δλ = (point2.longitude-point1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    return d;
  }
  updateElevationSourceNote() {
    const wantsUpload = (this.inputs.elevSource?.val() ?? '') === 'upload';
    this.els.demUpload?.toggle(wantsUpload);
    if (wantsUpload && !this.elevationSources.upload) {
      this.els.elevSourceNote?.html('Choose a file to use. Until then, AWS Terrain Tiles are used.');
      return;
    }
    const source = this.getElevationSource();
    this.els.elevSourceNote?.html(`${source.attributionHtml}. Output zoom up to ${source.maxZoom}.`);
    if (source.id === 'mapterhorn' || source.id === 'landsea') {
      this.els.elevSourceNote?.append(MAPTERHORN_COVERAGE_HTML);
    }
  }
  uploadBoundsRect : L.Rectangle | null = null;
  async loadDemFile(file : File) {
    const note = this.els.elevSourceNote;
    note.text(`Reading ${file.name}…`);
    try {
      const buffer = await file.arrayBuffer();
      const raster = loadDemFile(buffer, file.name);
      const source = new UploadedDemSource(raster, file.name);
      this.elevationSources.upload = source;
      trackEvent('elevation/upload');
      this.inputs.elevSource.val('upload');
      this.storeValue('elevsource', 'upload');
      const b = source.bounds;
      const bounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);
      this.uploadBoundsRect?.remove();
      this.uploadBoundsRect = L.rectangle(bounds, {color: '#48c78e', weight: 2, fill: false, dashArray: '4 4', interactive: false}).addTo(this.map);
      // Match the output resolution to the file's own detail
      const zoom = Math.max(1, Math.min(source.maxZoom, source.nativeZoom));
      this.inputs.outputzoom.val(zoom);
      this.storeValue('outputzoom', zoom.toString());
      this.map.fitBounds(bounds);
      this.setPositionTo(bounds.getCenter());
      this.updateElevationSourceNote();
      note.append(` Loaded ${raster.width.toLocaleString()} × ${raster.height.toLocaleString()} px, ${Math.round(raster.min)} to ${Math.round(raster.max)} m. Outside the green outline the terrain is flat at the lowest height.`);
      this.doDisEnableControls();
      this.doHeightsDebounced?.();
    } catch (e) {
      console.error('Elevation file failed', e);
      trackEvent('elevation/upload-failed');
      note.text(`Could not use ${file.name}: ${e?.message ?? e}`);
    }
  }
  /** One line saying how detailed the data behind the last export really was. */
  describeElevationDetail(latitude : number, outputZoom : number) : string {
    const source = this.getElevationSource();
    const stats = source.getStats();
    if (stats.bestZoom === null) {
      return '';
    }
    // metresPerPixel() is for Earth; other worlds scale with their radius
    const scale = this.getBody() === 'earth' ? 1 : this.bodyRadius() / 6378137;
    const mpp = (z : number) => metresPerPixel(z, latitude) * scale;
    const fmt = (z : number) => `${localFormatNumber(mpp(z), mpp(z) < 10 ? 1 : 0)} m/px`;
    const detail = stats.bestZoom === stats.worstZoom
      ? `source tiles ~${fmt(stats.bestZoom)}`
      : `source tiles from ~${fmt(stats.bestZoom)} to ~${fmt(stats.worstZoom)} across the area`;
    const upscaled = stats.worstZoom < outputZoom
      ? ` The output (~${fmt(outputZoom)}) is finer than some of the source data, so those parts are smoothly upscaled.`
      : '';
    return `Elevation data: ${source.label}, ${detail}.${upscaled}`;
  }
  getElevationSource() : ElevationSource {
    const id = (this.inputs.elevSource?.val() ?? 'aws').toString() as ElevationSourceId;
    return this.elevationSources[id] ?? this.elevationSources.aws;
  }
  /** Highest output zoom the selected elevation source has real data for. */
  getMaxOutputZoom() : number {
    return this.getElevationSource().maxZoom;
  }
  isOutputZoomTooHigh() : boolean {
    return parseInt(this.inputs.outputzoom.val().toString()) > this.getMaxOutputZoom();
  }
  async fetchImage({x,y,z} : TileCoords, state : ConfigState) : Promise<TileLoadState> {
    if (state.type === 'heightmap') {
      return new Promise((resolve, reject) => {
        this.getElevationSource().getTile(z, x, y).then(heights => {
          resolve({...state, x, y, buffer: new ArrayBuffer(0), heights});
        }).catch(e => {
          for (let r of currentRequests) {
            r.abort();
          }
          if (e && e.type === 'abort') {
            return;
          }
          console.error(e);
          reject({...state, x, y, z});
        });
      });
    }
    return new Promise((resolve, reject) => {
      App.getImageAt({z, y, x}, state).then(buffer => {
        const png = PNG.fromBuffer(buffer);
        if (state.type === 'heightmap') {
          resolve({...state, x, y, buffer, heights: png.terrariumToGrayscale()});
        } else {
          resolve({...state, x, y, buffer, heights: (png.getImageData() as Uint8Array)});
        }
      }).catch(e => {
        for (let r of currentRequests) {
          r.abort();
        }
        if (e.type === 'abort') {
          return;
        }
        console.error(e);
        reject({...state, x, y, z});
      });
    });
  }
  getApproxHeightsForState() {
    if (this.isOutputZoomTooHigh()) {
       this.els.generatorInfo.find('.heights').text('');
       this.els.scaleInfoValues?.html('');
       return;
    }
    let state = this.getCurrentState(1);
    if (state.width > 4000) {
      state = this.getCurrentState(1/8);
    } else if (state.width > 2000) {
      state = this.getCurrentState(1/4);
    } else if (state.width > 1000) {
      state = this.getCurrentState(1/2);
    }
    const plan = this.planFor(state);
    const items = this.buildTileFetchList(plan.fetchState);
    const seamOn = this.getSeamlessOptions().mode !== 'off';
    return promiseAllInBatches((item) => this.fetchImage(item, plan.fetchState), items, 200, 0).then((result : TileLoadState[]) : Promise<void> => {
      //@ts-ignore
      const resultToSend : TileLoadState[] = [];
      for (let s of result) {
        resultToSend.push({
          z: s.z,
          x: s.x,
          y: s.y,
          heights: Comlink.transfer(s.heights, [s.heights.buffer]),
          buffer: s.buffer,
          width: s.width,
          height: s.height,
          exactPos: s.exactPos,
          widthInTiles: s.widthInTiles,
          heightInTiles: s.heightInTiles,
          startx: s.startx,
          starty: s.starty,
          endx: s.endx,
          endy: s.endy,
          status: s.status,
          bounds: s.bounds,
          phys: s.phys,
          min: s.min,
          max: s.max,
          type: s.type,
          url: s.url,
          latitude: s.latitude,
          longitude: s.longitude,
          zoom: s.zoom
        });
      }
      //@ts-ignore
      const terrain : TerrainOps = {edgeStats: seamOn};
      if (this.getSeaLevel()) terrain.seaLevel = this.getSeaLevel();
      return processor.combineImages(resultToSend, NormaliseMode.SmartWindow, undefined, undefined, this.getProcessOptions(state, false, {area: plan.area, terrain}))
      .then((output : NormaliseResult<Float32Array>) => {
        if (seamOn && output.extras?.edges) this.updateSeamlessNote(output.extras.edges);
        const fmt = this.meterFormatter;
        const txt = `, Height range: ${fmt.format(output.minBefore)} to ${fmt.format(output.maxBefore)}`;
        this.els.generatorInfo.find('.heights').text(txt);
        const range = output.maxBefore - output.minBefore;
        const unrealZscaleFactor = 0.001953125;
        const zScale = Math.max(0, unrealZscaleFactor * range * 100);
        const origPixelWidth = parseInt(this.inputs.width.val().toString());
        const xyScale = Math.max(0, (state.phys.width * 100) / origPixelWidth);
        this.els.scaleInfoValues.html(
          `Z <code>${localFormatNumber(zScale, 2)}</code> · XY <code>${localFormatNumber(xyScale, 2)}</code>`
        );
      });
    }).catch(e => {
      console.error('Failed to load images', e);
    }).finally(() => {
      currentRequests = [];
    });
  }
  generate() {
    this.els.generate.prop('disabled', true);
    this.getElevationSource().resetStats();
    this.exportedHeightmaps = [];
    this.exportedMapFiles = [];
    const state = this.getCurrentState();
    this.resetOutput();
    this.pendingOsm = this.fetchOsmForExport(state);
    const tileConfig = this.getTileExportConfig(state.width, state.height);
    if (this.shouldStreamTiles(tileConfig) && !this.needsWholeArea()) {
      return this.generateStreamedTiles(state, tileConfig)
      .catch(e => {
        console.error('Failed to generate tiles', e);
      }).finally(() => {
        this.els.generate.prop('disabled', false);
        currentRequests = [];
      });
    }
    return this.generateStandard(state)
    .catch(e => {
      console.error('Failed to load images', e);
    }).finally(() => {
      this.els.generate.prop('disabled', false);
      currentRequests = [];
    });
  }

  generateStandard(state: ConfigState) {
    const plan = this.planFor(state);
    const fetchState = plan.fetchState;
    const items = this.buildTileFetchList(fetchState);
    return promiseAllInBatches((item) => {
      return this.fetchImage(item, fetchState)
      .then((im) => {
        this.imageLoaded(im);
        return im;
      })
      .catch((e) => {
        this.displayError({text: `Failed to load image at tile x = ${state.x} y = ${state.y} - please try again`});
      });
    }, items, 200, 0).then((result : TileLoadState[]) => {
      return new Promise((resolve, reject)  => {
        this.els.outputText.html('Generating images (should not take much longer)');
        this.showProcessingProgress('Stitching tiles…', 0);
        setTimeout(() => {
          resolve(this.generateOutput(result, state, plan.area));
        },1);
      });
    });
  }

  shouldStreamTiles(config: TileExportConfig) {
    if (!config.enabled) {
      return false;
    }
    if (config.tilesX <= 0 || config.tilesY <= 0) {
      return false;
    }
    if (config.tilesX === 1 && config.tilesY === 1) {
      return false;
    }
    const mode = this.getNormaliseModeValue();
    return mode === NormaliseMode.Off || this.hasManualNormRange();
  }

  shouldZipTiles(_tileCount: number) {
    const zipEnabled = this.tileZipEl?.find('input')?.is(':checked') ?? false;
    return zipEnabled;
  }

  shouldPadTiles() {
    return this.tilePadEl?.find('input')?.is(':checked') ?? false;
  }

  shouldUseUnrealNaming() {
    return this.tileUnrealNameEl?.find('input')?.is(':checked') ?? false;
  }

  async generateStreamedTiles(state: ConfigState, config: TileExportConfig) {
    const slices = this.getTileSliceInfos(state, config);
    if (!slices.length) {
      return Promise.resolve();
    }
    const summary : StreamingSummary = {
      count: 0,
      minBefore: Number.POSITIVE_INFINITY,
      maxBefore: Number.NEGATIVE_INFINITY,
      minAfter: Number.POSITIVE_INFINITY,
      maxAfter: Number.NEGATIVE_INFINITY,
    };
    const useZip = this.shouldZipTiles(slices.length);
    const pad = this.shouldPadTiles();
    const targetTileWidth = pad ? config.tileWidth : undefined;
    const targetTileHeight = pad ? config.tileHeight : undefined;
    const zip = useZip ? new JSZip() : null;
    const mapFiles : {filename: string, blob: Blob}[] = [];
    const osmFeatures = await this.pendingOsm;
    for (let i = 0; i < slices.length; i++) {
      const result = await this.processTileSequential(state, slices[i], i + 1, slices.length, summary, useZip, targetTileWidth, targetTileHeight, osmFeatures);
      if (result) {
        mapFiles.push(...result.maps);
      }
      if (result && zip) {
        zip.file(result.filename, result.blob);
        for (const geo of result.georef) {
          zip.file(geo.filename, geo.blob);
        }
      }
    }
    await this.deliverDerivedMaps(mapFiles, state);
    if (osmFeatures) {
      this.els.outputImage.append($('<p class="elevation-note">').html(osmAttribution));
    }
    if (summary.count > 0) {
      const summaryResult : NormaliseResult<Float32Array> = {
        data: new Float32Array(0),
        minBefore: summary.minBefore,
        maxBefore: summary.maxBefore,
        minAfter: summary.minAfter,
        maxAfter: summary.maxAfter
      };
      this.displayHeightData(summaryResult, state as unknown as TileLoadState);
      this.appendImportScripts(state, summary.minBefore, summary.maxBefore);
      if (useZip && zip) {
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
        const zipFilename = `${base}_heightmap.zip`;
        this.download(zipBlob, zipFilename);
        this.els.outputImage.prepend($('<p>').text(`Saved ${slices.length} tiled files as ${zipFilename}.`));
      } else {
        this.els.outputImage.prepend($('<p>').text(`Saved ${slices.length} tiled files.`));
      }
      this.showResults();
    }
  }

  async processTileSequential(baseState: ConfigState, sliceInfo: TileSliceInfo, index: number, total: number, summary: StreamingSummary, useZip: boolean, targetTileWidth?: number, targetTileHeight?: number, osmFeatures: OsmFeature[] | null = null) {
    this.els.outputText.html(`Processing tile ${index}/${total} (row ${sliceInfo.row}, col ${sliceInfo.column})`);
    const chunkState = this.buildChunkState(baseState, sliceInfo);
    const items = this.buildTileFetchList(chunkState);
    const normRange = this.getNormRangeFromInputs();
    const results = await promiseAllInBatches((item) => this.fetchImage(item, chunkState), items, 200, 0);
    const workerStates = this.prepareWorkerStates(results);
    const output = await processor.combineImages(workerStates, this.getNormaliseModeValue(), normRange, undefined, this.getProcessOptions(chunkState)) as NormaliseResult<Float32Array>;
    this.updateStreamingSummary(summary, output);
    const result = await this.saveChunkResult(output.data, chunkState, sliceInfo, useZip, targetTileWidth, targetTileHeight);
    if (!result) {
      return null;
    }
    const georef = this.buildGeoreferenceFiles(chunkState, result.filename);
    if (!useZip) {
      this.download(result.blob, result.filename);
      this.appendGeoreferenceLinks(georef);
    }
    const allMaps = [...(output.maps ?? []), ...await this.rasterizeOsmFor(osmFeatures, chunkState)];
    const maps = allMaps.length
      ? await this.encodeDerivedMaps(allMaps, chunkState, sliceInfo.width, sliceInfo.height, sliceInfo, targetTileWidth, targetTileHeight)
      : [];
    return {...result, georef, maps};
  }

  isGeoTiff() : boolean {
    return (this.inputs.outputformat?.val()?.toString() ?? '') === 'geotiff';
  }
  getNormaliseModeValue() : NormaliseMode {
    // GeoTIFFs always hold real heights in metres
    if (this.isGeoTiff()) return NormaliseMode.Off;
    const mode = parseInt(this.inputs.smartNormalisationControl?.val()?.toString() || '0', 10);
    return mode as NormaliseMode;
  }

  hasManualNormRange() {
    if (this.isGeoTiff()) return false;
    return (this.inputs.normFrom?.val()?.toString() ?? '') !== '' && (this.inputs.normTo?.val()?.toString() ?? '') !== '';
  }

  getNormRangeFromInputs() : NormRange {
    const norm : NormRange = {from: null, to: null};
    if (this.isGeoTiff()) return norm;
    const fromVal = this.inputs.normFrom?.val()?.toString() ?? '';
    const toVal = this.inputs.normTo?.val()?.toString() ?? '';
    if (fromVal !== '') {
      norm.from = parseFloat(fromVal);
    }
    if (toVal !== '') {
      norm.to = parseFloat(toVal);
    }
    return norm;
  }

  buildTileFetchList(state: ConfigState) : TileCoords[] {
    const items : TileCoords[] = [];
    for (let x = state.startx; x <= state.endx; x++) {
      for (let y = state.starty; y <= state.endy; y++) {
        const nx = roll(x, state.min.x, state.max.x);
        items.push({z: state.z, x: nx, y});
      }
    }
    return items;
  }

  prepareWorkerStates(result: TileLoadState[]) : TileLoadState[] {
    const workerStates : TileLoadState[] = [];
    for (let s of result) {
      workerStates.push({
        ...s,
        heights: Comlink.transfer(s.heights, [s.heights.buffer])
      });
    }
    return workerStates;
  }

  updateStreamingSummary(summary: StreamingSummary, output: NormaliseResult<Float32Array>) {
    summary.count += 1;
    summary.minBefore = Math.min(summary.minBefore, output.minBefore);
    summary.maxBefore = Math.max(summary.maxBefore, output.maxBefore);
    summary.minAfter = Math.min(summary.minAfter, output.minAfter);
    summary.maxAfter = Math.max(summary.maxAfter, output.maxAfter);
  }

  async saveChunkResult(data: Float32Array, state: ConfigState, sliceInfo: TileSliceInfo, useZip: boolean, targetWidth?: number, targetHeight?: number) {
    const formatSelection = this.inputs.outputformat?.val()?.toString() ?? 'png16';
    const pad = this.shouldPadTiles();
    const finalWidth = (pad && targetWidth) ? targetWidth : sliceInfo.width;
    const finalHeight = (pad && targetHeight) ? targetHeight : sliceInfo.height;
    let finalData = data;
    if (pad && targetWidth && targetHeight && (sliceInfo.width < targetWidth || sliceInfo.height < targetHeight)) {
      finalData = new Float32Array(targetWidth * targetHeight);
      for (let y = 0; y < sliceInfo.height; y++) {
        finalData.set(data.subarray(y * sliceInfo.width, (y + 1) * sliceInfo.width), y * targetWidth);
      }
    }
    const paddedState = {...state, width: finalWidth, height: finalHeight};
    const paddedSlice = {...sliceInfo, width: finalWidth, height: finalHeight};
    if (formatSelection === 'geotiff') {
      return this.saveOutputGeoTiff(finalData, paddedState, paddedSlice, {skipDownload: true});
    }
    if (formatSelection === 'exr16' || formatSelection === 'exr32') {
      const pixelType = formatSelection === 'exr16' ? ExrPixelType.Half : ExrPixelType.Float;
      return this.saveOutputExr(finalData, paddedState, pixelType, paddedSlice, {skipDownload: true});
    }
    return this.saveOutputPng(finalData, paddedState, paddedSlice, {suppressPreview: true, skipDownload: true});
  }

  buildChunkState(baseState: ConfigState, sliceInfo: TileSliceInfo) : ConfigState {
    const tilePerPixelX = baseState.widthInTiles / baseState.width;
    const tilePerPixelY = baseState.heightInTiles / baseState.height;
    const chunkWidthInTiles = sliceInfo.width * tilePerPixelX;
    const chunkHeightInTiles = sliceInfo.height * tilePerPixelY;
    const minTileX = baseState.exactPos.x - (baseState.widthInTiles / 2) + sliceInfo.startX * tilePerPixelX;
    const minTileY = baseState.exactPos.y - (baseState.heightInTiles / 2) + sliceInfo.startY * tilePerPixelY;
    const maxTileX = minTileX + chunkWidthInTiles;
    const maxTileY = minTileY + chunkHeightInTiles;
    const exactPos : TileCoords = {
      x: (minTileX + maxTileX) / 2,
      y: (minTileY + maxTileY) / 2,
      z: baseState.z
    };
    const centerLatLng = App.getLatLngFromTileCoords(exactPos.x, exactPos.y, baseState.z);
    const topLeft = App.getLatLngFromTileCoords(minTileX, minTileY, baseState.z);
    const bottomRight = App.getLatLngFromTileCoords(maxTileX, maxTileY, baseState.z);
    const chunkState : ConfigState = {
      ...baseState,
      width: sliceInfo.width,
      height: sliceInfo.height,
      exactPos,
      widthInTiles: chunkWidthInTiles,
      heightInTiles: chunkHeightInTiles,
      latitude: centerLatLng.latitude,
      longitude: centerLatLng.longitude,
      bounds: [topLeft, bottomRight],
      phys: baseState.phys
    };
    chunkState.startx = Math.floor(minTileX);
    chunkState.endx = Math.floor(maxTileX);
    chunkState.starty = clamp(Math.floor(minTileY), baseState.min.y, baseState.max.y);
    chunkState.endy = clamp(Math.floor(maxTileY), baseState.min.y, baseState.max.y);
    chunkState.phys = {
      width: this.getDistanceBetweenLatLngs(topLeft, {latitude: topLeft.latitude, longitude: bottomRight.longitude}),
      height: this.getDistanceBetweenLatLngs(topLeft, {latitude: bottomRight.latitude, longitude: topLeft.longitude})
    };
    return chunkState;
  }

  getTileSliceInfos(state: ConfigState, config: TileExportConfig) : TileSliceInfo[] {
    const columnSegments = this.buildSegments(state.width, config.tileWidth, config.tilesX);
    const rowSegments = this.buildSegments(state.height, config.tileHeight, config.tilesY);
    const totalColumns = columnSegments.length || 1;
    const totalRows = rowSegments.length || 1;
    const slices : TileSliceInfo[] = [];
    rowSegments.forEach((rowSeg, rowIdx) => {
      columnSegments.forEach((colSeg, colIdx) => {
        slices.push({
          width: colSeg.size,
          height: rowSeg.size,
          startX: colSeg.start,
          startY: rowSeg.start,
          row: rowIdx + 1,
          column: colIdx + 1,
          totalRows,
          totalColumns
        });
      });
    });
    return slices;
  }

  buildSegments(total: number, requestedStep: number, maxSegments: number) {
    const segments : {start: number, size: number}[] = [];
    const step = Math.max(1, Math.floor(requestedStep));
    if (step <= 0 || total <= 0) {
      return segments;
    }
    let consumed = 0;
    let index = 0;
    while (consumed < total && index < Math.max(1, maxSegments)) {
      const remaining = total - consumed;
      const size = Math.min(step, remaining);
      segments.push({start: consumed, size});
      consumed += size;
      index++;
    }
    if (!segments.length) {
      segments.push({start: 0, size: total});
    }
    return segments;
  }
  generateAlbedo() {
    this.els.generateAlbedo.prop('disabled', true);
    this.els.generateAlbedo.text('Generating');
    const state = this.getCurrentState();
    this.resetOutput();
    this.showProcessingProgress('Preparing albedo tiles…', 0);
    if (this.getRotation() || this.activeLayerKey() === 'mercury' || this.activeLayerKey() === 'gale') {
      // Rotated areas (and drawn relief layers) go through the canvas renderer
      return this.fetchMapImage(Math.max(state.width, state.height), (msg, pct) => this.showProcessingProgress(msg, pct))
        .then(canvas => {
          const ctx = canvas.getContext('2d')!;
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          return this.saveOutputAlbedo(image, [{...state, width: canvas.width, height: canvas.height}]);
        })
        .then(() => this.showResults())
        .catch(e => {
          console.error('Albedo failed', e);
          this.displayError({text: 'Could not make the albedo image. Please try again.'});
        })
        .finally(() => {
          this.hideProcessingProgress();
          this.els.generateAlbedo.prop('disabled', false);
          this.els.generateAlbedo.text(this.els.generateAlbedo.data('origText') ?? 'Albedo');
        });
    }
    const imageFetches = [];
    const items : (ConfigState & TileCoords & {url: string})[] = [];

    const oldZoom = parseInt(this.inputs.zoom.val().toString());
    this.map.setZoom(parseInt(this.inputs.outputzoom.val().toString()));

    // This little timeout seems to help the map to 'Catch up' for some reason
    setTimeout(() => {
      const layer = this.layers[this.activeLayerKey()].layer as L.TileLayer;
      for (let x = (state.startx - 1); x <= (state.endx+1); x++) {
        for (let y = (state.starty - 1); y <= (state.endy+1); y++) {
          const nx = roll(x, state.min.x, state.max.x);
          const coords = {z: state.z, x: nx, y: y};
          //@ts-ignore
          const url = layer.getTileUrl(coords).replace('@2x', '');
          items.push({...state, ...coords, url: url});
        }
      }
      this.combineUrlsAndDownload(items)
      .then(() => this.showResults())
      .finally(() => {
        this.inputs.zoom.val(oldZoom);
        this.map.setZoom(oldZoom);
        this.els.generateAlbedo.prop('disabled', false);
        this.els.generateAlbedo.text(this.els.generateAlbedo.data('origText') ?? 'Albedo');
      });
    }, 1000);
  }
  /** URL for one tile of a Leaflet layer at any zoom, without moving the map. */
  static tileUrlAt(layer : L.TileLayer, x : number, y : number, z : number) : string {
    // getTileUrl() reads the layer's current zoom rather than coords.z
    const anyLayer = layer as any;
    const previous = anyLayer._tileZoom;
    anyLayer._tileZoom = z;
    try {
      return layer.getTileUrl({x, y, z} as L.Coords).replace('@2x', '');
    } finally {
      anyLayer._tileZoom = previous;
    }
  }
  /**
   * Stitch the current map type into a canvas covering the export area, at the
   * largest zoom whose image is no bigger than `maxSize` on its longer side.
   */
  async fetchMapImage(maxSize : number, onProgress? : (message : string, percent : number) => void) : Promise<HTMLCanvasElement> {
    const full = this.getCurrentState();
    let scale = 1;
    while (Math.max(full.width, full.height) * scale > maxSize && full.z + Math.log2(scale / 2) >= 1) {
      scale /= 2;
    }
    // Prefer more detail than the heightmap when the texture budget allows it
    while (Math.max(full.width, full.height) * scale * 2 <= maxSize && full.z + Math.log2(scale * 2) <= Math.min(18, this.map.getMaxZoom())) {
      scale *= 2;
    }
    const outState = this.getCurrentState(scale);
    const rotation = this.getRotation();
    let state = outState;
    let spec : ResampleSpec | null = null;
    if (rotation) {
      const b = rotatedBounds(outState.width, outState.height, outState.width, outState.height, rotation);
      const fw = Math.ceil(b.maxX - b.minX) + 2, fh = Math.ceil(b.maxY - b.minY) + 2;
      const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
      state = this.deriveState(outState, fw, fh, cx, cy);
      spec = {rotation, gridWidth: outState.width, gridHeight: outState.height, areaWidth: outState.width, areaHeight: outState.height, centreX: fw / 2 - cx, centreY: fh / 2 - cy};
    }
    const layer = this.layers[this.activeLayerKey()]?.layer ?? this.layers.imagery.layer;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(state.width);
    canvas.height = Math.round(state.height);
    const ctx = canvas.getContext('2d');
    const left = state.exactPos.x - state.widthInTiles / 2;
    const top = state.exactPos.y - state.heightInTiles / 2;
    const tiles : {x : number, y : number}[] = [];
    for (let x = state.startx; x <= state.endx; x++) {
      for (let y = state.starty; y <= state.endy; y++) {
        tiles.push({x, y});
      }
    }
    let done = 0;
    await promiseAllInBatches(async (tile : {x : number, y : number}) => {
      const nx = roll(tile.x, state.min.x, state.max.x);
      const drawAt = [Math.round((tile.x - left) * 256), Math.round((tile.y - top) * 256)];
      if (typeof (layer as any).getTileUrl !== 'function') {
        // Layers drawn in the browser (shaded relief for Mercury, Gale crater)
        await new Promise<void>((resolve) => {
          const el = (layer as any).createTile({x: nx, y: tile.y, z: state.z}, () => {
            ctx.drawImage(el, drawAt[0], drawAt[1], 256, 256);
            resolve();
          });
        });
      } else {
        const url = App.tileUrlAt(layer as L.TileLayer, nx, tile.y, state.z);
        try {
          const response = await fetch(url, {mode: 'cors'});
          if (!response.ok) throw new Error(`${response.status}`);
          const bitmap = await createImageBitmap(await response.blob());
          ctx.drawImage(bitmap, drawAt[0], drawAt[1], 256, 256);
          bitmap.close();
        } catch (e) {
          console.warn('Map tile failed', url, e);
        }
      }
      done++;
      onProgress?.(`Downloading map imagery (${done}/${tiles.length})`, done / tiles.length * 100);
    }, tiles, 32, 0);
    if (!spec) return canvas;
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rotated = resampleRotatedRgba(src.data, canvas.width, canvas.height, spec);
    const out = document.createElement('canvas');
    out.width = spec.gridWidth;
    out.height = spec.gridHeight;
    out.getContext('2d')!.putImageData(new ImageData(rotated as any, out.width, out.height), 0, 0);
    return out;
  }
  static canvasToJpeg(canvas : HTMLCanvasElement, quality : number = 0.88) : Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Could not encode texture')); return; }
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)), reject);
      }, 'image/jpeg', quality);
    });
  }
  async combineImagesSimple(states : (ConfigState & TileCoords & {url: string})[]) : Promise<void|ImageData> {
    const tileWidth = 256;
    const increment = 1/tileWidth;

    const extent = {
      x1: states[0].exactPos.x - states[0].widthInTiles/2,
      x2: states[0].exactPos.x + states[0].widthInTiles/2,
      y1: states[0].exactPos.y - states[0].heightInTiles/2,
      y2: states[0].exactPos.y + states[0].heightInTiles/2
    }

    const map : Record<number, Record<number, (ConfigState & TileCoords & {url: string})>> = {};
    let total = 0;
    for (let tile of states) {
      if (!map[tile.x]) {
        map[tile.x] = {};
      }
      map[tile.x][tile.y] = tile;
      total++;
    }
    if (total > 0) {
      this.showProcessingProgress('Stitching albedo tiles (0%)', 0);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d");
    canvas.width  = states[0].width;
    canvas.height = states[0].height;

    const promises : Promise<void>[] = [];
    let completed = 0;
    const updateDownloadProgress = async () => {
      completed += 1;
      const percent = total ? (completed / total) * 100 : 100;
      const label = total ? `Stitching albedo tiles (${completed}/${total})` : 'Stitching albedo tiles';
      this.showProcessingProgress(label, percent);
      this.els.generateAlbedo.text(`Downloaded ${completed}/${Math.max(total, 1)}`);
      await this.maybeYieldUi();
    };
    for (let y = extent.y1; y < extent.y2+1; y ++) {
      for (let x = extent.x1; x < extent.x2+1; x ++) {
        const tile = {
          x: Math.floor(x),
          y: Math.floor(y)
        };
        const px = {
          x: Math.floor((x%1)*tileWidth),
          y: Math.floor((y%1)*tileWidth)
        };
        if (typeof map[tile.x] === 'undefined') {
          console.error("Did not have map tile row", map[tile.x], tile.x, map);
        }
        const tileOb = map[tile.x][tile.y];
        promises.push(new Promise<void>((resolve, reject) => {
          let img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = async () => {
            await updateDownloadProgress();
            const drawAt = {
              x: Math.floor((tile.x - extent.x1) * tileWidth),
              y: Math.floor((tile.y - extent.y1) * tileWidth)
            };
            ctx.drawImage(
              img,
              drawAt.x,
              drawAt.y
            );
            await this.maybeYieldUi();
            resolve();
          };
          img.onerror = reject;
          img.src = tileOb.url;
        }));
      }
    }
    return Promise.all(promises)
    .then(async (r) => {
      await this.maybeYieldUi();
      this.els.generateAlbedo.text('Getting Image Data');
      this.showProcessingProgress('Finalising albedo image…', 100);
      await this.maybeYieldUi();
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }).catch(e => {
      console.error(e);
    });
  }
  async combineUrlsAndDownload(items : (ConfigState  & TileCoords & {url: string})[]) {
    try {
      //@ts-ignore
      const output = await this.combineImagesSimple(items);
      if (output) {
        return this.saveOutputAlbedo(output, items);
      }
    } finally {
      this.hideProcessingProgress();
    }
  }
  async saveOutputAlbedo(output : ImageData, states : ConfigState[]) {
    const s = states[0];
    const formatArgs = {
      lat: s.latitude.toFixed(3).toString().replace(".",'_'),
      lng: s.longitude.toFixed(3).toString().replace(".",'_'),
      zoom: s.zoom,
      w: s.width,
      h: s.height,
      layer: this.layer,
    };
    const fn = format('{lat}_{lng}_{zoom}_{w}_{h}_albedo_{layer}.png', formatArgs);

    this.showProcessingProgress('Encoding albedo PNG…', 100);
    await this.maybeYieldUi(32);
    //@ts-ignore
    const result = UPNG.encode([output.data.buffer], states[0].width, states[0].height, null);

    const blob = new Blob( [ result ] );
    const url = URL.createObjectURL( blob );
    const img : HTMLImageElement = new Image();
    img.src = url;
    // So the Blob can be Garbage Collected
    img.onload = e => URL.revokeObjectURL( url );

    this.els.outputImage.append(img);
    const downloaded = this.download(blob, fn);
    this.appendGeoreferenceLinks(this.buildGeoreferenceFiles(s, fn));
    return downloaded;
  }
  displayError(message : {text: string}) {
    trackEvent('error');
    this.els.outputError.text(message.text);

    const errEl = $(`<article class="message is-danger">
  <div class="message-header">
    <p>Error</p>
    <button class="delete" aria-label="delete"></button>
  </div>
  <div class="message-body">
    ${message.text}
  </div>
</article>`).hide();
    this.els.messageStack?.append(errEl);
    errEl.slideDown();
    setTimeout(() => errEl.slideUp(), 15000);
    errEl.find('.delete').on('click touchend', () => errEl.slideUp());
  }
  async generateOutput(states : TileLoadState[], outState? : ConfigState, area : AreaPlan = {}) {
    return this.generateOutputUsingWorker(states, outState, area);
  }
  async generateOutputUsingWorker(states : TileLoadState[], outState? : ConfigState, area : AreaPlan = {}) {
    const norm = this.getNormRangeFromInputs();
    const progressHandler = Comlink.proxy((update: ProcessorProgressUpdate) => {
      this.updateProcessingProgress(update);
    });
    const target = (outState ?? states[0]) as TileLoadState;
    this.showProcessingProgress('Waiting for OpenStreetMap…', 0);
    const features = await this.pendingOsm;
    //@ts-ignore
    let output : NormaliseResult<Float32Array>;
    try {
      const terrain = this.terrainOpsFor(target, 'heightmap', features);
      if (this.wantsTrees()) {
        this.showProcessingProgress('Downloading tree data…', 0);
        const settings = this.getTreeSettings();
        try {
          const rasters = await this.treeRastersFor(target, settings);
          if (rasters.length) terrain.trees = {settings, rasters};
          else this.displayError({text: 'No tree data was found for this area, so the treemap was skipped.'});
        } catch (e) {
          console.error('Tree data failed', e);
          this.displayError({text: 'The tree data could not be downloaded, so the treemap was skipped. Please try again.'});
        }
      }
      const options = this.getProcessOptions(target, true, {area, terrain});
      //@ts-ignore
      output = await processor.combineImages(states, this.getNormaliseModeValue(), norm, progressHandler, options) as NormaliseResult<Float32Array>;
    } finally {
      this.hideProcessingProgress();
    }
    this.lastExtras = output.extras ?? null;
    this.displayHeightData(output, target);
    const saved = await this.saveOutput(output.data, [target]);
    if (features && this.getOsmLayerIds().length) this.showProcessingProgress('Drawing OpenStreetMap layers…', 100);
    const maps = [...(output.maps ?? []), ...await this.rasterizeOsmFor(features, target)];
    this.hideProcessingProgress();
    if (maps.length) {
      await this.saveDerivedMaps(maps, target);
    }
    await this.deliverExtras(output.extras, target);
    if (features) {
      this.els.outputImage.append($('<p class="elevation-note">').html(osmAttribution));
    }
    this.appendImportScripts(target, output.minBefore, output.maxBefore);
    this.showResults();
    return saved;
  }
  /** Splines, scatter files and notes from the pipeline: one zip plus individual links. */
  async deliverExtras(extras : PipelineExtras | undefined, state : ConfigState) {
    if (!extras) return;
    const lines : string[] = [];
    if (extras.seamAdjust !== undefined) lines.push(`Seamless: heights adjusted by up to ${localFormatNumber(extras.seamAdjust, 1)} m to make the edges meet. Absolute heights near the edges are no longer exact.`);
    if (extras.carve) lines.push(`Carved ${extras.carve.roads} road and rail lines, ${extras.carve.rivers} rivers and streams and ${extras.carve.lakes} lakes into the terrain.`);
    if (extras.shapeFloor !== undefined) lines.push(`Custom shape: outside it the ground is at ${localFormatNumber(extras.shapeFloor, 1)} m (the lowest point inside).`);
    if (extras.paintCoverage) lines.push(`Painted layers: ${extras.paintCoverage.map(c => `${c.name} ${(c.share * 100).toFixed(c.share < 0.1 ? 1 : 0)}%`).join(', ')}. Saved as paint_NN_name weightmaps (they add up to 100%) plus a colour preview.`);
    if (extras.scatterCounts) lines.push(`Scatter: ${extras.scatterCounts.map(c => `${c.count.toLocaleString()} ${c.name.toLowerCase()}${c.capped ? ' (capped)' : ''}`).join(', ')}.`);
    if (extras.splineCount !== undefined) lines.push(`Splines: ${extras.splineCount.toLocaleString()} roads, paths and rivers.`);
    if (extras.trees) {
      const t = extras.trees;
      lines.push(`Treemap: ${t.count.toLocaleString()} trees${t.capped ? ' (capped)' : ''} (${t.conifers.toLocaleString()} conifer, ${t.broadleaf.toLocaleString()} broadleaf; ${t.detected.toLocaleString()} found in canopy heights, ${t.scattered.toLocaleString()} scattered through tree cover). Trees cover ${(t.cover * 100).toFixed(t.cover < 0.1 ? 1 : 0)}% of the area. Data: ${t.sources.join(' + ')}. Saved as trees_density, trees_conifer, trees_broadleaf${t.detected ? ' and trees_canopy_height_0-51m (value ÷ 5 = metres)' : ''} maps plus a CSV and Blender/Unreal scripts. Please credit the tree data (see License Info).`);
    }
    if (extras.sunlight) lines.push(`Sunlight map: ${localFormatNumber(extras.sunlight.min, 0)} to ${localFormatNumber(extras.sunlight.max, 0)} kWh/m² a year (clear sky), white = sunniest.`);
    if (this.getRotation()) lines.push(`Rotated ${Math.round(this.getRotation())}° clockwise. World files include the rotation; GeoTIFFs don't, so use the PNG with its .pgw in GIS.`);
    if (this.getSeaLevel()) lines.push(`Sea level moved ${this.getSeaLevel() > 0 ? 'up' : 'down'} ${Math.abs(this.getSeaLevel())} m: 0 m in these files is the new sea level.`);
    for (const line of lines) this.els.outputText.append($('<p class="extras-note">').text(line));
    const files = extras.files ?? [];
    if (!files.length) return;
    const zip = new JSZip();
    for (const f of files) zip.file(f.filename, f.contents);
    const blob = await zip.generateAsync({type: 'blob'});
    const zipName = `${this.baseName(state)}_${extras.trees ? 'trees_' : ''}splines_scatter.zip`;
    this.download(blob, zipName);
    const p = $('<p class="georefLinks">').text(`Splines and scatter (also saved together as ${zipName}): `);
    files.forEach((file, i) => {
      if (i > 0) p.append(' · ');
      const link = $('<a href="#">').text(file.filename);
      link.on('click', (e) => {
        e.preventDefault();
        this.download(new Blob([file.contents], {type: 'text/plain'}), file.filename);
      });
      p.append(link);
    });
    this.els.outputImage.append(p);
  }
  /** Encode the extra maps for a full (unsliced) export, splitting them into tiles when tiling is on. */
  async saveDerivedMaps(maps : DerivedMap[], state : ConfigState) {
    const config = this.getTileExportConfig(state.width, state.height);
    const files : {filename: string, blob: Blob}[] = [];
    if (!config.enabled || (config.tilesX === 1 && config.tilesY === 1)) {
      files.push(...await this.encodeDerivedMaps(maps, state, state.width, state.height));
    } else {
      const pad = this.shouldPadTiles();
      for (const tile of this.getTileLayout(state.width, state.height, config)) {
        const tileMaps = maps.map(map => ({
          ...map,
          data: App.cropChannels(map.data, state.width, map.channels, tile.startX, tile.startY, tile.width, tile.height),
        }));
        files.push(...await this.encodeDerivedMaps(tileMaps, state, tile.width, tile.height, tile,
          pad ? config.tileWidth : undefined, pad ? config.tileHeight : undefined));
      }
    }
    await this.deliverDerivedMaps(files, state);
  }
  static cropChannels(data : Uint8Array, srcWidth : number, channels : number, x : number, y : number, w : number, h : number) : Uint8Array {
    const out = new Uint8Array(w * h * channels);
    for (let row = 0; row < h; row++) {
      const start = ((y + row) * srcWidth + x) * channels;
      out.set(data.subarray(start, start + w * channels), row * w * channels);
    }
    return out;
  }
  /** Encode maps as 8-bit PNGs, padding to the tile size if asked (matching padded heightmap tiles). */
  async encodeDerivedMaps(maps : DerivedMap[], state : ConfigState, width : number, height : number, tileInfo? : TileSliceInfo, padWidth? : number, padHeight? : number) {
    const outW = padWidth && padWidth > width ? padWidth : width;
    const outH = padHeight && padHeight > height ? padHeight : height;
    // Same base name as the matching heightmap file, so they sort together
    const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs({...state, width: outW, height: outH}));
    const suffix = this.buildTileSuffix(tileInfo);
    const files : {filename: string, blob: Blob}[] = [];
    for (const map of maps) {
      let data = map.data;
      if (outW !== width || outH !== height) {
        data = new Uint8Array(outW * outH * map.channels);
        for (let row = 0; row < height; row++) {
          data.set(map.data.subarray(row * width * map.channels, (row + 1) * width * map.channels), row * outW * map.channels);
        }
      }
      const png = await App.encodeToPng([data], outW, outH, map.channels, 0, 8);
      files.push({filename: `${base}_${map.name}${suffix}.png`, blob: new Blob([png], {type: 'image/png'})});
      this.exportedMapFiles.push(`${base}_${map.name}${suffix}.png`);
      await this.maybeYieldUi();
    }
    return files;
  }
  /** One map downloads as-is; several are bundled into a zip to avoid a burst of download prompts. */
  async deliverDerivedMaps(files : {filename: string, blob: Blob}[], state : ConfigState) {
    if (!files.length) {
      return;
    }
    const list = $('<p class="derivedMaps">').text('Extra maps: ');
    if (files.length === 1) {
      this.download(files[0].blob, files[0].filename);
      list.append(document.createTextNode(files[0].filename));
    } else {
      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.filename, file.blob);
      }
      const zipBlob = await zip.generateAsync({type: 'blob'});
      const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
      const zipFilename = `${base}_maps.zip`;
      this.download(zipBlob, zipFilename);
      list.append(document.createTextNode(`${files.length} files saved as ${zipFilename}`));
    }
    this.els.outputImage.append(list);
  }
  displayHeightData(output : NormaliseResult<Float32Array>, state: TileLoadState) {
    const fmt = this.meterFormatter;
    const range = output.maxBefore - output.minBefore;
    const unrealZscaleFactor = 0.001953125;
    const zScale = unrealZscaleFactor * range * 100;
    const xyScale = ((state.phys.width * 100) / state.width);
    // Start by multiplying 4207 by 100 to convert the height into centimeters. This equals 420,700 cm.
    // Next, multiply this new value by the ratio: 420,700 multiplied by 0.001953125 equals 821.6796875.
    // This gives you a Z scale value of 821.6796875 and results in a heightmap that will go from -210,350 cm to 210,350 cm.
    let txt = `<p>Height range: ${fmt.format(output.minBefore)} to ${fmt.format(output.maxBefore)}</p>
    <p>In Unreal Engine, on import, a z scaling of <code>${localFormatNumber(zScale, 2)}</code> should be used for 1:1 height scaling using a normalised image.</p>
    <p>x and y scales should be set to <code>${localFormatNumber(xyScale, 2)}</code></p>
    <p>For 3D printing, the height range is <code>${this.meterFormatter.format(range)}</code> and height/width ratio is <code>${localFormatNumber(range/state.phys.width, 6)}</code></p>
    <p>i.e. if you printed this 100mm wide, it would have to be <code>${localFormatNumber(range/state.phys.width * 100, 3)}</code>mm tall to be physically accurate</p>
    <p>Projection: <code>EPSG:3857</code> (Web Mercator). See "Bounds &amp; projection" above for the extent to georeference in QGIS/GIS tools.</p>
    `;
    const detail = this.describeElevationDetail(state.latitude, state.zoom);
    if (detail) {
      txt += `<p>${detail}</p><p class="elevation-note">${this.getElevationSource().attributionHtml}</p>`;
    }
    const tiling = this.getTileExportConfig(state.width, state.height);
    if (tiling.enabled) {
      const totalTiles = tiling.tilesX * tiling.tilesY;
      const approxWidth = Math.min(tiling.tileWidth, state.width);
      const approxHeight = Math.min(tiling.tileHeight, state.height);
      txt += `<p>Tiled export: ${tiling.tilesX} × ${tiling.tilesY} tiles (${totalTiles} total), approx <code>${localFormatNumber(approxWidth, 0)} × ${localFormatNumber(approxHeight, 0)}px</code> each (edge tiles adjust as needed).</p>`;
    }
    this.els.outputText.html(txt);
  }
  async saveOutput(output : Float32Array, states : TileLoadState[]) {
    const config = this.getTileExportConfig(states[0].width, states[0].height);
    if (!config.enabled || (config.tilesX === 1 && config.tilesY === 1)) {
      return this.saveSingleOutput(output, states);
    }
    return this.saveTiledOutputs(output, states, config);
  }

  async saveSingleOutput(output : Float32Array, states : TileLoadState[]) {
    const formatSelection = this.inputs.outputformat?.val()?.toString() ?? 'png16';
    let result : {blob: Blob, filename: string};
    if (formatSelection === 'geotiff') {
      result = await this.saveOutputGeoTiff(output, states);
    } else if (formatSelection === 'exr16' || formatSelection === 'exr32') {
      const pixelType = formatSelection === 'exr16' ? ExrPixelType.Half : ExrPixelType.Float;
      result = await this.saveOutputExr(output, states, pixelType);
    } else {
      result = await this.saveOutputPng(output, states);
    }
    this.appendGeoreferenceLinks(this.buildGeoreferenceFiles(states[0], result.filename));
    return result;
  }

  async saveTiledOutputs(output : Float32Array, states : TileLoadState[], config: TileExportConfig) {
    const slices = this.sliceOutputIntoTiles(output, states[0], config);
    if (!slices.length) {
      return this.saveSingleOutput(output, states);
    }
    const formatSelection = this.inputs.outputformat?.val()?.toString() ?? 'png16';
    const useZip = this.shouldZipTiles(slices.length);
    if (useZip) {
      const zip = new JSZip();
      const encodePromises = slices.map((slice : TileSlice) => {
        const tileState = {...states[0], width: slice.width, height: slice.height};
        if (formatSelection === 'geotiff') {
          return this.saveOutputGeoTiff(slice.data, tileState, slice, {skipDownload: true});
        }
        if (formatSelection === 'exr16' || formatSelection === 'exr32') {
          const pixelType = formatSelection === 'exr16' ? ExrPixelType.Half : ExrPixelType.Float;
          return this.saveOutputExr(slice.data, tileState, pixelType, slice, {skipDownload: true});
        }
        return this.saveOutputPng(slice.data, tileState, slice, {suppressPreview: true, skipDownload: true});
      });
      const results = await Promise.all(encodePromises);
      results.forEach((result, i) => {
        zip.file(result.filename, result.blob);
        for (const geo of this.buildGeoreferenceFiles(states[0], result.filename, slices[i].startX, slices[i].startY)) {
          zip.file(geo.filename, geo.blob);
        }
      });
      const zipBlob = await zip.generateAsync({type: 'blob'});
      const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(states[0]));
      const zipFilename = `${base}_heightmap.zip`;
      this.download(zipBlob, zipFilename);
      this.els.outputImage.prepend($('<p>').text(`Saved ${slices.length} tiled files as ${zipFilename}.`));
    } else {
      const encodePromises = slices.map((slice : TileSlice) => {
        const tileState = {...states[0], width: slice.width, height: slice.height};
        if (formatSelection === 'geotiff') {
          return this.saveOutputGeoTiff(slice.data, tileState, slice, {skipDownload: true});
        }
        if (formatSelection === 'exr16' || formatSelection === 'exr32') {
          const pixelType = formatSelection === 'exr16' ? ExrPixelType.Half : ExrPixelType.Float;
          return this.saveOutputExr(slice.data, tileState, pixelType, slice, {skipDownload: true});
        }
        return this.saveOutputPng(slice.data, tileState, slice, {suppressPreview: true, skipDownload: true});
      });
      const results = await Promise.all(encodePromises);
      const geoFiles : {filename: string, blob: Blob}[] = [];
      results.forEach((result, i) => {
        this.download(result.blob, result.filename);
        geoFiles.push(...this.buildGeoreferenceFiles(states[0], result.filename, slices[i].startX, slices[i].startY));
      });
      this.appendGeoreferenceLinks(geoFiles);
      this.els.outputImage.prepend($('<p>').text(`Saved ${slices.length} tiled files.`));
    }
  }

  /** Where each tile sits in the full image. Width/height are the unpadded sizes. */
  getTileLayout(totalWidth : number, totalHeight : number, config : TileExportConfig) : TileSliceInfo[] {
    const layout : TileSliceInfo[] = [];
    const stepX = Math.max(1, Math.floor(config.tileWidth));
    const stepY = Math.max(1, Math.floor(config.tileHeight));
    for (let row = 0; row < config.tilesY; row++) {
      const startY = row * stepY;
      if (startY >= totalHeight) {
        break;
      }
      for (let column = 0; column < config.tilesX; column++) {
        const startX = column * stepX;
        if (startX >= totalWidth) {
          break;
        }
        layout.push({
          width: Math.min(stepX, totalWidth - startX),
          height: Math.min(stepY, totalHeight - startY),
          startX,
          startY,
          row: row + 1,
          column: column + 1,
          totalRows: config.tilesY,
          totalColumns: config.tilesX
        });
      }
    }
    return layout;
  }
  sliceOutputIntoTiles(output : Float32Array, state : TileLoadState, config : TileExportConfig) : TileSlice[] {
    const totalWidth = state.width;
    const pad = this.shouldPadTiles();
    const stepX = Math.max(1, Math.floor(config.tileWidth));
    const stepY = Math.max(1, Math.floor(config.tileHeight));
    return this.getTileLayout(state.width, state.height, config).map(tile => {
      const tileWidth = pad ? stepX : tile.width;
      const tileHeight = pad ? stepY : tile.height;
      const tileData = new Float32Array(tileWidth * tileHeight);
      for (let y = 0; y < tile.height; y++) {
        const srcStart = (tile.startY + y) * totalWidth + tile.startX;
        tileData.set(output.subarray(srcStart, srcStart + tile.width), y * tileWidth);
      }
      return {...tile, data: tileData, width: tileWidth, height: tileHeight};
    });
  }

  buildTileSuffix(tileInfo?: TileSlice | TileSliceInfo) : string {
    if (!tileInfo) {
      return '';
    }
    const useUnreal = this.shouldUseUnrealNaming();
    const rowDigits = Math.max(2, tileInfo.totalRows.toString().length);
    const colDigits = Math.max(2, tileInfo.totalColumns.toString().length);
    const col0 = tileInfo.column - 1;
    const row0 = tileInfo.row - 1;
    if (useUnreal) {
      return `_x${this.padNumber(col0, colDigits)}_y${this.padNumber(row0, rowDigits)}`;
    }
    return `_tile_${this.padNumber(row0, rowDigits)}_${this.padNumber(col0, colDigits)}`;
  }

  padNumber(value : number, digits : number) : string {
    let str = Math.max(0, Math.floor(value)).toString();
    while (str.length < digits) {
      str = '0' + str;
    }
    return str;
  }

  getFilenameArgs(state: ConfigState) {
    return {
      lat: state.latitude.toFixed(3).toString().replace(".",'_'),
      lng: state.longitude.toFixed(3).toString().replace(".",'_'),
      zoom: state.zoom,
      w: state.width,
      h: state.height,
    };
  }

  getOutputState(stateOrStates: TileLoadState[] | TileLoadState | ConfigState) : ConfigState {
    if (Array.isArray(stateOrStates)) {
      return stateOrStates[0];
    }
    return stateOrStates;
  }

  async saveOutputPng(output : Float32Array, stateOrStates : TileLoadState[] | TileLoadState | ConfigState, tileInfo?: TileSlice | TileSliceInfo, options: {suppressPreview?: boolean, skipDownload?: boolean} = {}) {
    const state = this.getOutputState(stateOrStates);
    const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
    const suffix = this.buildTileSuffix(tileInfo);
    const useUnreal = this.shouldUseUnrealNaming();
    const formatLabel = useUnreal ? '' : '_16bit';
    const fn = `${base}${formatLabel}${suffix}.png`;
    this.recordHeightmapFile(fn, state, tileInfo);
    return App.encodeToPng([PNG.Float32ArrayToPng16Bit(output)], state.width, state.height, 1, 0, 16).then(a => {
      const blob = new Blob( [ a ] );
      if (!options.suppressPreview) {
        const url = URL.createObjectURL( blob );
        const img : HTMLImageElement = new Image();
        img.src = url;
        img.onload = e => URL.revokeObjectURL( url );
        this.els.outputImage.append(img);
      } else {
        this.els.outputImage.append($('<p>').text(`Saved ${fn}`));
      }
      if (!options.skipDownload) {
        this.download(blob, fn);
      }
      return {blob, filename: fn};
    });
  }

  async saveOutputExr(output : Float32Array, stateOrStates : TileLoadState[] | TileLoadState | ConfigState, pixelType: ExrPixelType, tileInfo?: TileSlice | TileSliceInfo, options: {skipDownload?: boolean} = {}) {
    const state = this.getOutputState(stateOrStates);
    const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
    const bitSuffix = pixelType === ExrPixelType.Half ? '16bit' : '32bit';
    const suffix = this.buildTileSuffix(tileInfo);
    const fn = `${base}_${bitSuffix}${suffix}.exr`;
    this.recordHeightmapFile(fn, state, tileInfo);
    // With normalisation off (and no manual range) the samples are metres; otherwise 0–65535.
    const inMetres = this.getNormaliseModeValue() === NormaliseMode.Off && !this.hasManualNormRange();
    const exrData = mapHeightSamplesToExr(output, inMetres ? 'metres' : 'normalised');
    const exrBuffer = encodeExr({
      width: state.width,
      height: state.height,
      data: exrData,
      pixelType
    });
    const safeBuffer = exrBuffer.buffer as ArrayBuffer;
    const blob = new Blob([safeBuffer], {type: 'application/octet-stream'});
    const bitLabel = pixelType === ExrPixelType.Half ? '16-bit float' : '32-bit float';
    this.els.outputImage.append($('<p>').text(`Saved ${fn} (${bitLabel} OpenEXR).`));
    if (!options.skipDownload) {
      this.download(blob, fn);
    }
    return {blob, filename: fn};
  }

  async saveOutputGeoTiff(output : Float32Array, stateOrStates : TileLoadState[] | TileLoadState | ConfigState, tileInfo?: TileSlice | TileSliceInfo, options: {skipDownload?: boolean} = {}) {
    const state = this.getOutputState(stateOrStates);
    const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
    const fn = `${base}_metres${this.buildTileSuffix(tileInfo)}.tif`;
    this.recordHeightmapFile(fn, state, tileInfo);
    const origin = this.georeferenceOrigin(state, tileInfo?.startX ?? 0, tileInfo?.startY ?? 0);
    const buffer = encodeGeoTiff({
      width: state.width,
      height: state.height,
      data: output,
      bounds3857: {left: origin.left, top: origin.top, pixelSizeX: origin.pixelSize, pixelSizeY: origin.pixelSize},
      compress: true,
    });
    const blob = new Blob([buffer], {type: 'image/tiff'});
    this.els.outputImage.append($('<p>').text(`Saved ${fn} (32-bit float GeoTIFF, metres, EPSG:3857).`));
    if (!options.skipDownload) {
      this.download(blob, fn);
    }
    return {blob, filename: fn};
  }
  /** Top-left corner and pixel size of an export (or a tile of it) in EPSG:3857 metres. */
  georeferenceOrigin(state : ConfigState, startX : number = 0, startY : number = 0) {
    const earthCircumference = 2 * Math.PI * 6378137;
    const originShift = earthCircumference / 2;
    const tileSizeMetres = earthCircumference / Math.pow(2, state.z);
    const pixelSize = tileSizeMetres / NextZen.tileWidth;
    const leftTileX = state.exactPos.x - state.widthInTiles / 2;
    const topTileY = state.exactPos.y - state.heightInTiles / 2;
    return {
      left: leftTileX * tileSizeMetres - originShift + startX * pixelSize,
      top: originShift - topTileY * tileSizeMetres - startY * pixelSize,
      pixelSize,
    };
  }
  // ESRI WKT for EPSG:3857, so GIS tools (QGIS etc.) pick up the CRS automatically.
  static readonly EPSG3857_PRJ = 'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]';

  /**
   * Build a world file (.pgw/.wld) and .prj for an export, georeferencing it in EPSG:3857.
   * The extent is derived from the exact slippy-map tile coordinates the image was stitched from;
   * one output pixel is 1/256 of a tile at state.z. startX/startY offset into the image for tiles.
   */
  buildGeoreferenceFiles(state : ConfigState, imageFilename : string, startX : number = 0, startY : number = 0) : {filename: string, blob: Blob}[] {
    // GeoTIFFs carry their own georeferencing; EPSG:3857 only describes Earth
    if (/\.tiff?$/i.test(imageFilename) || this.getBody() !== 'earth') {
      return [];
    }
    const earthCircumference = 2 * Math.PI * 6378137;
    const originShift = earthCircumference / 2;
    const tileSizeMetres = earthCircumference / Math.pow(2, state.z);
    const pixelSize = tileSizeMetres / NextZen.tileWidth;
    const leftTileX = state.exactPos.x - state.widthInTiles / 2;
    const topTileY = state.exactPos.y - state.heightInTiles / 2;
    const left = leftTileX * tileSizeMetres - originShift + startX * pixelSize;
    const top = originShift - topTileY * tileSizeMetres - startY * pixelSize;
    // World file: x pixel size, rotation terms, negative y pixel size, then the centre of the top-left pixel.
    let worldValues = [pixelSize, 0, 0, -pixelSize, left + pixelSize / 2, top - pixelSize / 2];
    const rotation = this.getRotation();
    if (rotation) {
      // Rotated grids: pixel (col, row) sits at the centre plus the rotated offset
      const r = rotation * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      const cx = state.exactPos.x * tileSizeMetres - originShift;
      const cy = originShift - state.exactPos.y * tileSizeMetres;
      const du = startX + 0.5 - state.width / 2, dv = startY + 0.5 - state.height / 2;
      worldValues = [pixelSize * c, -pixelSize * s, -pixelSize * s, -pixelSize * c,
        cx + pixelSize * (c * du - s * dv), cy - pixelSize * (s * du + c * dv)];
    }
    const worldFile = worldValues.map(v => v.toFixed(10)).join('\n') + '\n';
    const base = imageFilename.replace(/\.[^.]+$/, '');
    const ext = imageFilename.split('.').pop()?.toLowerCase();
    const worldExt = ext === 'png' ? 'pgw' : 'wld';
    return [
      {filename: `${base}.${worldExt}`, blob: new Blob([worldFile], {type: 'text/plain'})},
      {filename: `${base}.prj`, blob: new Blob([App.EPSG3857_PRJ], {type: 'text/plain'})},
    ];
  }

  recordHeightmapFile(filename : string, state : ConfigState, tileInfo? : TileSlice | TileSliceInfo) {
    this.exportedHeightmaps.push({
      file: filename,
      startX: tileInfo?.startX ?? 0,
      startY: tileInfo?.startY ?? 0,
      width: state.width,
      height: state.height,
    });
  }
  /** Blender/Unreal helper scripts for the export that just finished, as download links. */
  appendImportScripts(state : ConfigState, minHeight : number, maxHeight : number) {
    if (!(this.inputs.importScripts?.is(':checked') ?? true) || !this.exportedHeightmaps.length) {
      return;
    }
    const formatSelection = this.inputs.outputformat?.val()?.toString() ?? 'png16';
    const fileFormat = formatSelection.startsWith('exr') ? 'exr' : formatSelection === 'geotiff' ? 'tif' : 'png';
    const metres = fileFormat === 'tif' || (this.getNormaliseModeValue() === NormaliseMode.Off && !this.hasManualNormRange());
    const norm = this.getNormRangeFromInputs();
    const lo = metres ? minHeight : (typeof norm.from === 'number' && typeof norm.to === 'number' ? norm.from : minHeight);
    const hi = metres ? maxHeight : (typeof norm.from === 'number' && typeof norm.to === 'number' ? norm.to : maxHeight);
    const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
    const files = buildImportScripts({
      name: base,
      width: state.width,
      height: state.height,
      physWidth: state.phys.width,
      physHeight: state.phys.height,
      minHeight: lo,
      maxHeight: hi,
      encoding: metres ? 'metres' : 'normalised',
      format: fileFormat,
      tiles: this.exportedHeightmaps,
      albedoFile: `${base}_albedo_${this.activeLayerKey()}.png`,
      extraFiles: this.exportedMapFiles,
    });
    const p = $('<p class="georefLinks">').text('Import helpers: ');
    files.forEach((file, i) => {
      if (i > 0) p.append(' · ');
      const link = $('<a href="#">').text(file.filename);
      link.on('click', (e) => {
        e.preventDefault();
        trackEvent(`download/script/${file.filename.split('_').slice(-2).join('_')}`);
        this.download(new Blob([file.contents], {type: 'text/plain'}), file.filename);
      });
      p.append(link);
    });
    this.els.outputImage.append(p);
  }
  /** Show download links for georeferencing files (links rather than auto-downloads, to avoid multi-download prompts). */
  appendGeoreferenceLinks(files : {filename: string, blob: Blob}[]) {
    if (!files.length) return;
    const p = $('<p class="georefLinks">').text('Georeferencing (EPSG:3857) for QGIS/GIS: ');
    files.forEach((file, i) => {
      if (i > 0) p.append(' · ');
      const link = $('<a href="#">').text(file.filename);
      link.on('click', (e) => {
        e.preventDefault();
        this.download(file.blob, file.filename);
      });
      p.append(link);
    });
    this.els.outputImage.append(p);
  }

  download(contents : Blob, fn : string) {
    const ext = fn.split('.').pop()?.toLowerCase();
    trackEvent(/_albedo_/.test(fn) ? 'download/albedo' : `download/${ext}`);
    const blobUrl = URL.createObjectURL(contents);

    // Create a link element
    const link = document.createElement("a");

    // Set link's href to point to the Blob URL
    link.href = blobUrl;
    link.download = fn;

    // Append link to the body
    document.body.appendChild(link);

    // Dispatch click event on the link
    // This is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    // Remove link from body
    document.body.removeChild(link);
  }

  resetOutput() {
    this.imagesLoaded = [];
    this.hideProcessingProgress();
    if (!this.els.outputContainer) {
      this.els.messageStack = $('<div class="message-stack">');

      this.els.outputContainer = $('<section class="app-output">');

      this.els.outputTextContainer = $('<div class="app-output-text-container columns">');
      this.els.outputText = $('<div class="app-output-text column">');

      this.els.outputErrorContainer = $('<div class="app-output-text-container columns">');
      this.els.outputError = $('<div class="app-output-text column">');

      this.els.outputImageContainer = $('<div class="app-output-image-container columns">');
      this.els.outputImage = $('<div class="app-output-image column">');

      this.els.outputContainer.append(this.els.outputTextContainer.append(this.els.outputText));
      this.els.outputContainer.append(this.els.outputErrorContainer.append(this.els.outputError));
      this.els.outputContainer.append(this.els.outputImageContainer.append(this.els.outputImage));
      this.els.resultsEmpty = $('<p class="ui-note results-empty">').text('Exports you make show up here, with their scale values, download links and import helpers.');
      this.els.resultsPanel.append(this.els.resultsEmpty, this.els.outputContainer);
      this.els.main.append(this.els.messageStack);
    }
    this.tabs?.badge('results', null);
    this.els.outputText.empty();
    this.els.outputImage.empty();
    this.els.outputError.empty();
    delete this.els.processingProgressContainer;
    delete this.els.processingProgressLabel;
    delete this.els.processingProgressBar;
  }
  ensureProcessingProgressElements() {
    if (this.els.processingProgressContainer && this.els.processingProgressLabel && this.els.processingProgressBar) {
      return;
    }
    const container = $('<div class="processing-progress">').hide();
    const label = $('<p class="processing-progress__label">');
    const bar = $('<progress class="progress is-link" max="100" value="0"></progress>') as JQuery<HTMLProgressElement>;
    container.append(label, bar);
    this.els.progressHost.empty().append(container);
    this.els.processingProgressContainer = container;
    this.els.processingProgressLabel = label;
    this.els.processingProgressBar = bar;
  }
  showProcessingProgress(message : string, percent : number = 0) {
    if (!this.els.outputText) {
      return;
    }
    this.ensureProcessingProgressElements();
    this.els.processingProgressLabel?.text(message);
    this.els.processingProgressBar?.attr('value', `${Math.max(0, Math.min(100, percent))}`);
    this.els.processingProgressContainer?.show();
  }
  updateProcessingProgress(update : ProcessorProgressUpdate) {
    const total = update.total || 1;
    const percent = Math.max(0, Math.min(100, (update.completed / total) * 100));
    const phase = update.phase === 'normalise' ? 'Normalising data' : update.phase === 'maps' ? 'Computing extra maps' : 'Stitching tiles';
    this.showProcessingProgress(`${phase} (${Math.round(percent)}%)`, percent);
  }
  hideProcessingProgress() {
    this.els.processingProgressContainer?.hide();
  }
  /** Point at the Results tab once an export has finished. */
  showResults() {
    this.els.resultsEmpty?.hide();
    this.tabs.badge('results', 'new');
    this.tabs.show('results');
  }
  async yieldToBrowser() {
    // requestAnimationFrame never fires in a background tab, which would stall
    // an export when the user switches away; the timeout keeps it moving.
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      window.requestAnimationFrame(finish);
      setTimeout(finish, 50);
    });
  }
  async maybeYieldUi(minIntervalMs: number = 16) {
    const now = window.performance?.now ? window.performance.now() : Date.now();
    if (now - this.lastUiYieldTimestamp < minIntervalMs) {
      return;
    }
    this.lastUiYieldTimestamp = now;
    await this.yieldToBrowser();
  }
  imageLoaded(state : ConfigState) {
    this.imagesLoaded.push(state);
    this.doOutputText(state);
  }
  doOutputText(state : ConfigState) {
    const widthInTiles = (state.endx - state.startx)+1;
    const heightInTiles = (state.endy - state.starty)+1;

    const totalTiles = widthInTiles * heightInTiles;
    this.els.outputText.text(`Loaded ${this.imagesLoaded.length} / ${totalTiles} tiles`);
  }

  getNumericInputValue(input?: JQuery<HTMLInputElement | HTMLSelectElement>) : number {
    if (!input || typeof input.val !== 'function') {
      return 0;
    }
    const value = input.val();
    if (value === undefined || value === null) {
      return 0;
    }
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  }

  static isFocused(input : JQuery<HTMLElement>) : boolean {
    return !!input && input[0] === document.activeElement;
  }
  static isValidNumberInput(input : JQuery<HTMLInputElement|HTMLSelectElement>) : boolean {
    const el = input[0];
    if (el.validity && el.validity.badInput) return false;
    const raw = (input.val() ?? '').toString().trim();
    return raw !== '' && !isNaN(parseFloat(raw));
  }
  static createInput(attrs : Record<string, string> = {type: 'text', class: 'input'}) : JQuery<HTMLInputElement> {
    attrs = {type: 'text', class: 'input', ...attrs};
    return $('<input>').attr(attrs) as JQuery<HTMLInputElement>;
  }
  static createLabel(text: string, attrs : Record<string, string> = {class: 'label'}) : JQuery<HTMLInputElement> {
    attrs = {class: 'label', ...attrs};
    return $(`<label>${text}</label>`).attr(attrs) as JQuery<HTMLInputElement>;
  }
  static toRad(n : number) {
    return (n * Math.PI / 180);
  }
  static getTileCoordsFromLatLng(latitude : number, longitude : number, zoom : number) : TileCoords
  {
    const res = App.getTileCoordsFromLatLngExact(latitude, longitude, zoom);
    return {
      x: Math.floor(res.x),
      y: Math.floor(res.y),
      z: Math.floor(res.z),
    }
  }
  static getTileCoordsFromLatLngExact(latitude : number, longitude : number, zoom : number) : TileCoords
  {
    if (zoom !== Math.floor(zoom)) {
      throw new Error(`Zoom must be an integer, got ${zoom}`);
    }
    const x = ((longitude + 180)%360) / 360 * (1 << zoom);
    const y = (1 - Math.log(Math.tan(App.toRad(latitude)) + 1 / Math.cos(App.toRad(latitude))) / Math.PI) / 2 * (1 << zoom);
    return {
      x,
      y,
      z: zoom
    };
  }
  static getLatLngFromTileCoords(x : number, y : number, z : number) : {latitude: number, longitude: number}
  {
    if (z !== Math.floor(z)) {
      throw new Error(`Zoom must be an integer, got ${z}`);
    }
    let n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return {
      latitude: (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))),
      longitude: (x / Math.pow(2,z) * 360 - 180)
    };
  }
  static async getImageAt({x, y, z} : TileCoords, state : ConfigState) : Promise<ArrayBuffer> {
    if (state.type === 'albedo') {
      return App.getImageAsBuffer(format(state.url, {x,y,z}));
    }
    return App.getImageAsBuffer(NextZen.getUrl({x,y,z}));
  }
  static async getImageAsBuffer(im : string, retryWithCacheBust: boolean = false) : Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      currentRequests.push(xhr);
      
      // Add cache-busting if this is a retry
      let url = im;
      if (retryWithCacheBust) {
        const separator = im.includes('?') ? '&' : '?';
        url = `${im}${separator}_cb=${Date.now()}`;
        console.warn(`Retrying image fetch with cache bust: ${url}`);
      }
      
      xhr.open("GET", url);
      
      // Add cache-busting headers on retry
      if (retryWithCacheBust) {
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.setRequestHeader('Expires', '0');
      }
      
      xhr.responseType = "arraybuffer";

      // xhr.addEventListener('loadstart', handleEvent);
      xhr.addEventListener('load', () => {
        // Validate response
        const isValidResponse = xhr.status === 200 && 
                               xhr.response && 
                               xhr.response.byteLength > 0;
        
        if (isValidResponse) {
          resolve(xhr.response);
        } else {
          // Bad response detected
          const error = new Error(
            `Invalid response: status ${xhr.status}, size ${xhr.response?.byteLength || 0}`
          );
          
          // If this wasn't already a retry, try again with cache busting
          if (!retryWithCacheBust) {
            console.warn('Bad response detected, retrying with cache bust...', error.message);
            // Remove failed XHR from tracking before retrying
            const index = currentRequests.indexOf(xhr);
            if (index > -1) {
              currentRequests.splice(index, 1);
            }
            App.getImageAsBuffer(im, true).then(resolve).catch(reject);
          } else {
            // Already retried, give up
            console.error('Retry with cache bust also failed', error.message);
            reject(error);
          }
        }
      });
      // xhr.addEventListener('loadend', handleEvent);
      xhr.addEventListener('progress', (e) => {
        if (e.type === 'error') {
          reject(e);
        }
      });
      xhr.addEventListener('error', reject);
      xhr.addEventListener('abort', reject);
      try {
        xhr.send();
      } catch (e) {
        reject(e);
      }
    });
  }

  // debug - might delete l8er
  static async getPngFromUrl(im : string) : Promise<PNG> {
    return App.getImageAsBuffer(im).then(ab => PNG.fromBuffer(ab));
  }
  static async encodeToPng(
    bufs : Uint8Array[],
    width : number,
    height : number,
    colourChannel : number,
    alphaChannel : number,
    depth : number,
    dels: Del[] = null,
    tabs: UPNG.ImageTabs = {}
  ) : Promise<any> {
    return UPNG.encodeLL(bufs, width, height, colourChannel, alphaChannel, depth, dels, tabs)
  }

}