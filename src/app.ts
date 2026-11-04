import PNG from "./png";
import NextZen from "./nextzen";
import UPNG from "./UPNG";
import { encodeExr, ExrPixelType } from "./exr";
import { mapHeightSamplesToExr } from "./exr-conversion";
import $ from "jquery";
import { throttle, debounce } from 'throttle-debounce';
import * as  L from "leaflet";
import "leaflet-providers";
import {format, promiseAllInBatches} from "./helpers";
import {trackEvent, trackControl} from "./analytics";
import tippy from 'tippy.js';
import JSZip from 'jszip';
import {SETTINGS, SettingKey, SettingValues, buildHash, parseHash} from "./url-state";
import {DerivedMap, DerivedMapOptions, NormalMapConvention, ProcessOptions, parseHeightBands, wantsDerivedMaps} from "./derived-maps";
import {PlaceSearch} from "./place-search";
import {MeshFormat, MeshOptions, MeshScale, MeshInput, defaultMeshOptions, estimateFileBytes, meshGridSize, triangleCount} from "./mesh";
import type {TerrainPreview, PreviewMeshData} from "./preview3d";
import {AwsTerrainSource, ElevationSource, ElevationSourceId, MapterhornSource, metresPerPixel} from "./elevation";

import * as Comlink from 'comlink';
import {
  NormaliseResult,
  NormRange,
  normDefaults,
  normMaxRange,
  ProcessorWorker,
  ProcessorProgressUpdate
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

const deafultTippyOptions = {
  interactive: true,
  allowHTML: true,
  theme: 'light'
};

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
  boundingRect : L.Rectangle;
  layers: Record<string, {layer:L.TileLayer, label:string}> = {};
  layer: string  = 'topo';
  lastWrittenHash: string = '';
  doHeightsDebounced: () => void;
  lastUiYieldTimestamp: number = 0;
  tileZipEl: JQuery<HTMLLabelElement>;
  tilePadEl: JQuery<HTMLLabelElement>;
  tileUnrealNameEl: JQuery<HTMLLabelElement>;
  placeSearch: PlaceSearch;
  preview: TerrainPreview | null = null;
  previewCache: {key: string, input: MeshInput} | null = null;
  previewBusy: boolean = false;
  elevationSources: Record<ElevationSourceId, ElevationSource> = {
    aws: new AwsTerrainSource((z, x, y) => App.getImageAsBuffer(NextZen.getUrl({x, y, z})).then(buffer => PNG.fromBuffer(buffer).terrariumToGrayscale())),
    mapterhorn: new MapterhornSource(),
  };
  constructor({container} : AppArgs) {
    this.container = container;
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
    this.els.inputContainer = $('<div class="input-container">');
    this.els.container.append(this.els.inputContainer);

    this.createSubmitButton();
    this.createSearchBar();
    this.createInputOptions();
    this.createOutputOptions();
    this.createExtraOutputOptions();
    this.createMeshOptions();
    this.resetOutput();
  }
  createSearchBar() {
    this.els.searchRow = $('<div class="columns search-row">');
    const searchColumn = $('<div class="column field">')
      .append(App.createLabel('Search for a place', {for: 'place-search'}));
    this.placeSearch = new PlaceSearch({
      onSelect: (place) => {
        trackEvent('search/select');
        if (place.bounds) {
          this.map.fitBounds(place.bounds, {maxZoom: 14});
        } else {
          this.map.setView(place.center, Math.max(this.map.getZoom(), 11));
        }
        this.setPositionTo(this.map.getCenter());
      },
      parseCoordinates: (text) => {
        const latLng = this.getLatLngFromText(text);
        return latLng ? {lat: latLng.latitude, lng: latLng.longitude} : null;
      },
    });
    searchColumn.append(this.placeSearch.el);

    this.els.copyLink = $('<button class="button" type="button">Copy share link</button>');
    tippy(this.els.copyLink[0], {
      ...deafultTippyOptions,
      content: 'Copies a link to this exact location and export settings. The address bar also stays up to date, so you can bookmark it.',
    });
    this.els.copyLink.on('click', () => this.copyShareLink());
    const copyColumn = $('<div class="column is-narrow field">')
      .append($('<label class="label">&nbsp;</label>'))
      .append($('<div class="control">').append(this.els.copyLink));

    this.els.searchRow.append(searchColumn).append(copyColumn);
    this.els.inputContainer.append(this.els.searchRow);
  }
  async copyShareLink() {
    this.writeHash();
    trackEvent('share/copy-link');
    const url = location.href;
    const original = 'Copy share link';
    try {
      await navigator.clipboard.writeText(url);
      this.els.copyLink.text('Link copied!');
    } catch (e) {
      // Clipboard can be blocked (e.g. non-secure context): fall back to a prompt
      window.prompt('Copy this link:', url);
    }
    setTimeout(() => this.els.copyLink.text(original), 2000);
  }
  showHideCurrentLayer() {
    this.layer = this.inputs.maptype.val().toString();
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
    $('#map').height(512);
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

    this.map.on('click', debounce(100, (e) => {
      trackEvent('map/click');
      this.setPositionTo(e.latlng);
    }));

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
    this.doHeightsDebounced();
  }
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
    const distance: [number, number] = [
      Math.abs(state.bounds[0].latitude - state.bounds[1].latitude),
      Math.abs(state.bounds[0].longitude - state.bounds[1].longitude),
    ];
    const newLatLng : L.LatLngLiteral = {
      lat: state.latitude + (up * distance[0]),
      lng: state.longitude + (right * distance[1])
    }
    this.setPositionTo(newLatLng);
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
    const mapHeight = Math.min(768, Math.max(256, window.innerHeight));
    $('#map').height(mapHeight);
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
    if (!this.boundingRect) {
      this.boundingRect = L.rectangle(bounds, {color: "#ff7800", weight: 1, fillOpacity: 0.1}).addTo(this.map);
    }
    this.boundingRect.setBounds(bounds);
    this.arrows[0].setLatLng(this.latLngBetween(bounds[0], [bounds[0][0], bounds[1][1]]));
    this.arrows[1].setLatLng(this.latLngBetween(bounds[0], [bounds[1][0], bounds[0][1]]));
    this.arrows[2].setLatLng(this.latLngBetween([bounds[1][0], bounds[0][1]], bounds[1]));
    this.arrows[3].setLatLng(this.latLngBetween([bounds[0][0], bounds[1][1]], bounds[1]));
    this.positionOutputZoomControls(bounds);

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
    </select>`) as JQuery<HTMLSelectElement>;
    this.els.elevSourceNote = $('<p class="elevation-note">');

    this.inputs.maptype = $('<select>') as JQuery<HTMLSelectElement>;
    for (let [type, layer] of Object.entries(this.layers)) {
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
<p>See <a href="https://mapterhorn.com" target="_blank" rel="noopener">mapterhorn.com</a> for coverage.</p></div>`);
    this.els.columnElevSource = $('<div class="column field">')
      .append(elevSourceLabel)
      .append($('<div class="control">').append($('<div class="select is-fullwidth">').append(this.inputs.elevSource)))
      .append(this.els.elevSourceNote);

    this.els.columnsLatLngZoom.append(this.els.columnLat);
    this.els.columnsLatLngZoom.append(this.els.columnLng);
    // this.els.columnsLatLngZoom.append(this.els.columnZoom);
    this.els.columnsLatLngZoom.append(this.els.columnOutputZoom);
    this.els.columnsLatLngZoom.append(this.els.columnElevSource);
    this.els.columnsLatLngZoom.append(this.els.columnMaptype);

    this.els.inputContainer.append(this.els.columnsLatLngZoom);

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

    this.els.columnsOutputPrimary
      .append(widthColumn)
      .append(heightColumn)
      .append(defaultSizeColumn)
      .append(outputFormatColumn)
      .append(normalisationColumn);

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

    this.els.columnsOutputSecondary
      .append(tileModeColumn)
      .append(this.els.tileSizeColumn)
      .append(this.els.tileCountColumn)
      .append(normFromColumn)
      .append(normToColumn);

    this.inputs.smartNormalisationControl = this.els.smartNormalisationControl.find('select');
    this.inputs.normFrom = this.els.normFrom.find('input');
    this.inputs.normTo = this.els.normTo.find('input');

    this.els.inputContainer.append(this.els.columnsOutputPrimary);
    this.els.inputContainer.append(this.els.columnsOutputSecondary);

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
    this.inputs.slopeMap = slope.input;
    this.inputs.curvatureMap = curvature.input;

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
      .append(App.withInfo(curvature.label, 'Mid-grey is flat, brighter is ridges and peaks, darker is valleys and gullies. Good for erosion, snow or moss masks.'));

    const bandsColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Height Bands (m)', {for: 'heightbands'}), 'Comma-separated heights in metres. Each one splits the terrain into another layer mask, e.g. "500, 1500" gives below 500 m, 500 to 1500 m and above 1500 m. The masks blend smoothly at each edge and add up to full white, so they work as Unreal landscape layer weightmaps.'))
      .append($('<div class="control">').append(this.inputs.heightBands));

    this.els.extraMapsSummary = $('<p class="extra-maps-note">');
    const summaryColumn = $('<div class="column field">')
      .append($('<label class="label">Extra Outputs</label>'))
      .append(this.els.extraMapsSummary);

    this.els.columnsOutputExtra = $('<div class="columns columns-output columns-output--extra">')
      .append(waterColumn)
      .append(mapsColumn)
      .append(bandsColumn)
      .append(summaryColumn);
    this.els.inputContainer.append(this.els.columnsOutputExtra);
    this.updateExtraMapsSummary();
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
    watch('heightbands', this.inputs.heightBands);
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
      waterMask: this.inputs.waterMask?.is(':checked') ?? false,
      heightBands: parseHeightBands(this.inputs.heightBands?.val()?.toString() ?? ''),
    };
  }
  /** Options for the worker: water handling plus any extra maps, sized for this export. */
  getProcessOptions(state : ConfigState, includeMaps : boolean = true) : ProcessOptions {
    return {
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

    const select = (input : JQuery<HTMLElement>) => $('<div class="control">').append($('<div class="select is-fullwidth">').append(input));
    const control = (input : JQuery<HTMLElement>) => $('<div class="control">').append(input);

    const formatColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('3D Model Format', {for: 'meshformat'}), 'STL for slicers and 3D printing. OBJ for Blender and most 3D apps (Y up, with UVs, so you can drape the albedo or normal map on it). GLB is a single-file glTF for game engines and the web.'))
      .append(select(this.inputs.meshFormat))
      .append(App.withInfo(App.createLabel('Mesh Resolution', {for: 'meshres'}), 'Vertices along the longer side. Higher is more detailed but larger and slower. 512 is plenty for most prints.'))
      .append(select(this.inputs.meshRes));

    this.els.baseThicknessLabel = App.createLabel('Base Thickness (mm)', {for: 'basethickness'});
    this.els.baseThicknessColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Shape', {for: 'meshsolid'}), '"Solid with base" closes the model with walls and a flat bottom so it can be printed. "Top surface only" is just the terrain skin, which is what you usually want in Blender or an engine.'))
      .append(select(this.inputs.meshSolid))
      .append(App.withInfo(this.els.baseThicknessLabel, 'Extra material under the lowest point of the terrain, so thin areas still print solidly.'))
      .append(control(this.inputs.baseThickness));

    this.els.printWidthColumn = $('<div class="field">')
      .append(App.withInfo(App.createLabel('Print Width (mm)', {for: 'printwidth'}), 'Length of the longer side of the printed model. Heights scale with it, so the model stays true to life (before exaggeration).'))
      .append(control(this.inputs.printWidth));
    const scaleColumn = $('<div class="column field">')
      .append(App.withInfo(App.createLabel('Scale', {for: 'meshscale'}), 'Print size scales the model to a width in millimetres. Real world keeps it 1:1 in metres.'))
      .append(select(this.inputs.meshScale))
      .append(this.els.printWidthColumn);

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
    this.els.previewToolbar.append(this.els.previewInfo, this.els.previewRefresh, this.els.previewReset, this.els.previewClose);
    this.els.previewContainer.append(this.els.previewToolbar, this.els.previewCanvas, this.els.previewStatus);

    this.els.inputContainer.append($('<h3 class="subtitle is-5 mesh-heading">3D Model</h3>'));
    this.els.inputContainer.append(this.els.columnsMesh);
    this.els.inputContainer.append(this.els.previewContainer);
    this.toggleMeshInputs();
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
    ];
    const rebuildPreview = debounce(150, () => this.rebuildPreviewMesh(false));
    for (const [key, input] of meshKeys) {
      input.on('change input', debounce(30, () => {
        const value = this.readSetting(key) ?? '';
        this.storeValue(key, value);
        if (input.is('select')) {
          trackControl(key, value);
        }
        this.toggleMeshInputs();
        this.updateMeshEstimate();
        rebuildPreview();
      }));
    }
    this.els.meshButton.on('click', debounce(100, () => {
      trackEvent(`generate/mesh/${this.inputs.meshFormat.val()}/${this.getMeshOptions().solid ? 'solid' : 'surface'}`);
      this.exportMesh();
    }));
    this.els.previewButton.on('click', debounce(100, () => {
      trackEvent('preview/3d');
      this.openPreview();
    }));
    this.els.previewRefresh.on('click', () => this.refreshPreview());
    this.els.previewReset.on('click', () => this.preview?.frameMesh());
    this.els.previewClose.on('click', () => this.closePreview());
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
    this.els.meshEstimate.text(`${grid.width} × ${grid.height} vertices, ${localFormatNumber(tris, 0)} triangles, ~${localFormatNumber(mb, mb < 10 ? 1 : 0)} MB. Footprint ${footprint}.`);
    this.els.meshEstimate.toggleClass('is-warning', mb > 250);
  }
  /**
   * Fetch real heights in metres for the current area, at a zoom just detailed
   * enough for `targetResolution` samples on the longer side. Water flattening
   * is applied; normalisation is not.
   */
  async fetchRawHeights(targetResolution : number, onProgress? : (message : string, percent : number) => void) : Promise<MeshInput & {zoom: number}> {
    const full = this.getCurrentState();
    // Drop whole zoom levels while the grid stays at least as big as needed
    let scale = 1;
    while (Math.max(full.width, full.height) * scale / 2 >= targetResolution && full.z + Math.log2(scale / 2) >= 1) {
      scale /= 2;
    }
    const state = this.getCurrentState(scale);
    const items = this.buildTileFetchList(state);
    let loaded = 0;
    const results = await promiseAllInBatches((item) => this.fetchImage(item, state).then(r => {
      loaded++;
      onProgress?.(`Downloading terrain tiles (${loaded}/${items.length})`, loaded / items.length * 80);
      return r;
    }), items, 200, 0);
    onProgress?.('Stitching terrain…', 85);
    const output = await processor.combineImages(
      this.prepareWorkerStates(results),
      NormaliseMode.Off,
      normDefaults,
      undefined,
      this.getProcessOptions(state, false)
    ) as NormaliseResult<Float32Array>;
    const width = Math.round(state.width);
    return {
      heights: output.data,
      width,
      height: Math.floor(output.data.length / width),
      physWidth: state.phys.width,
      physHeight: state.phys.height,
      zoom: state.z,
    };
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
      const input = await this.fetchRawHeights(opts.resolution, (msg, pct) => this.showProcessingProgress(msg, pct));
      this.showProcessingProgress(`Building ${meshFormat.toUpperCase()} mesh…`, 92);
      const state = this.getCurrentState();
      const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
      const name = `${base}_terrain_${opts.solid ? 'solid' : 'surface'}`;
      const result = await processor.buildMeshFile(input, opts, meshFormat, name);
      this.hideProcessingProgress();
      const filename = `${name}.${meshFormat}`;
      const blob = new Blob([result.buffer], {type: meshFormat === 'obj' ? 'text/plain' : 'application/octet-stream'});
      this.download(blob, filename);
      const sizeMb = blob.size / (1024 * 1024);
      const unitsText = result.units === 'mm' ? 'millimetres' : 'metres';
      this.els.outputText.html('');
      this.els.outputText.append($('<p>').text(
        `Saved ${filename}: ${result.gridWidth} × ${result.gridHeight} vertices, ${localFormatNumber(result.triangles, 0)} triangles, ${localFormatNumber(sizeMb, 1)} MB. Units: ${unitsText}.`
      ));
      this.els.outputText.append($('<p>').html(`${this.describeElevationDetail(state.latitude, input.zoom)} ${this.getElevationSource().attributionHtml}`));
      if (meshFormat !== 'stl') {
        this.els.outputText.append($('<p>').text('Y is up and the model is centred on the origin. UVs cover the top surface 0–1, so an albedo or normal map exported for the same area lines up directly.'));
      }
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
    return [s.elevsource, s.latitude, s.longitude, s.outputzoom, s.width, s.height, s.waterlevel, s.flattenwater]
      .map(v => v ?? '').join('|');
  }
  async openPreview() {
    this.els.previewContainer.show();
    this.els.previewContainer[0].scrollIntoView({behavior: 'smooth', block: 'nearest'});
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
  closePreview() {
    this.els.previewContainer.hide();
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
        (msg) => this.els.previewStatus.text(msg));
      this.previewCache = {key, input};
      await this.rebuildPreviewMesh(true);
    } catch (e) {
      console.error('Preview failed', e);
      this.els.previewStatus.text('Could not load terrain for the preview. Please try again.').show();
    } finally {
      this.previewBusy = false;
      currentRequests = [];
    }
  }
  async rebuildPreviewMesh(reframe : boolean) {
    if (!this.preview || !this.previewCache || !this.els.previewContainer.is(':visible')) return;
    const opts = this.getMeshOptions();
    const previewOpts : MeshOptions = {...opts, resolution: Math.min(384, opts.resolution)};
    const cache = this.previewCache.input;
    // Send a copy: the cache is reused for later option changes
    const data = await processor.buildPreviewMesh({...cache, heights: cache.heights.slice(0)}, previewOpts) as PreviewMeshData & {gridWidth: number, gridHeight: number};
    const flatten = this.inputs.flattenWater?.is(':checked') ?? false;
    const showWater = flatten || (this.inputs.waterMask?.is(':checked') ?? false);
    this.preview.setMesh(data, {waterLevel: showWater ? this.getWaterLevel() : null}, reframe);
    const stale = this.previewCache.key !== this.getPreviewKey();
    this.els.previewInfo.text(`Preview ${data.gridWidth} × ${data.gridHeight}${stale ? ' · area changed, press Refresh' : ''}. Drag to orbit, right-drag to pan, scroll to zoom.`);
    this.els.previewStatus.hide();
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
    this.els.generate = $('<button class="button is-primary is-large">Generate Heightmap</button>');
    this.els.generateAlbedo = $('<button class="button is-secondary is-large" data-orig-text="Generate Albedo">Generate Albedo</button>');

    tippy(this.els.generate[0], {
      ...deafultTippyOptions,
      content: 'Start the heightmap exporting process. This will export the orange area in the preview as a heightmap.',
    });
    tippy(this.els.generateAlbedo[0], {
      ...deafultTippyOptions,
      content: 'Use this to export the visible map in the preview. This is good for exporting satellite imagery or textures for texturing your map afterwards.',
    });
    this.els.inputContainer.append(
      $('<div class="columns">')
      .append(
        $('<div class="column">').append(
          $('<div class="field">').append(
            $('<div class="control buttons">')
            .append(this.els.generate)
            .append(this.els.generateAlbedo)
          )
        )
      )
      .append(this.els.generatedColumn)
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
      heightbands: this.inputs.heightBands,
      meshformat: this.inputs.meshFormat,
      meshres: this.inputs.meshRes,
      meshsolid: this.inputs.meshSolid,
      basethickness: this.inputs.baseThickness,
      meshscale: this.inputs.meshScale,
      printwidth: this.inputs.printWidth,
      exaggeration: this.inputs.exaggeration,
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
  }
  insertValuesFromUrlHash() {
    const values = parseHash(location.hash);
    if (!Object.keys(values).length) {
      return;
    }
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
    }));

    this.els.generateAlbedo.on('click touchend', debounce(100, () => {
      trackEvent(`generate/albedo/${this.inputs.maptype.val()}`);
      this.generateAlbedo();
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

    this.inputs.elevSource.on('change', () => {
      const value = this.inputs.elevSource.val().toString();
      this.storeValue('elevsource', value);
      trackControl('elevsource', value);
      this.updateElevationSourceNote();
      this.doDisEnableControls();
      doHeightsDebounced();
    });
    this.updateElevationSourceNote();

    this.inputs.outputformat.on('change input', debounce(30, () => {
      this.storeValue('outputformat', this.inputs.outputformat.val().toString());
      trackControl('outputformat', this.inputs.outputformat.val().toString());
    }));

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
    const R = 6371e3; // metres
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
    const source = this.getElevationSource();
    this.els.elevSourceNote?.html(`${source.attributionHtml}. Output zoom up to ${source.maxZoom}.`);
  }
  /** One line saying how detailed the data behind the last export really was. */
  describeElevationDetail(latitude : number, outputZoom : number) : string {
    const source = this.getElevationSource();
    const stats = source.getStats();
    if (stats.bestZoom === null) {
      return '';
    }
    const fmt = (z : number) => `${localFormatNumber(metresPerPixel(z, latitude), metresPerPixel(z, latitude) < 10 ? 1 : 0)} m/px`;
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
    const imageFetches = [];
    const items : TileCoords[] = [];
    for (let x = state.startx; x <= state.endx; x++) {
      for (let y = state.starty; y <= state.endy; y++) {
        const nx = roll(x, state.min.x, state.max.x);
        items.push({z: state.z, x: nx, y: y});
      }
    }
    return promiseAllInBatches((item) => this.fetchImage(item, state), items, 200, 0).then((result : TileLoadState[]) : Promise<void> => {
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
      return processor.combineImages(resultToSend, NormaliseMode.SmartWindow, undefined, undefined, this.getProcessOptions(state, false))
      .then((output : NormaliseResult<Float32Array>) => {
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
    const state = this.getCurrentState();
    this.resetOutput();
    const tileConfig = this.getTileExportConfig(state.width, state.height);
    if (this.shouldStreamTiles(tileConfig)) {
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
    const items : TileCoords[] = [];
    for (let x = state.startx; x <= state.endx; x++) {
      for (let y = state.starty; y <= state.endy; y++) {
        const nx = roll(x, state.min.x, state.max.x);
        items.push({z: state.z, x: nx, y: y});
      }
    }
    return promiseAllInBatches((item) => {
      return this.fetchImage(item, state)
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
          resolve(this.generateOutput(result));
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
    for (let i = 0; i < slices.length; i++) {
      const result = await this.processTileSequential(state, slices[i], i + 1, slices.length, summary, useZip, targetTileWidth, targetTileHeight);
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
    if (summary.count > 0) {
      const summaryResult : NormaliseResult<Float32Array> = {
        data: new Float32Array(0),
        minBefore: summary.minBefore,
        maxBefore: summary.maxBefore,
        minAfter: summary.minAfter,
        maxAfter: summary.maxAfter
      };
      this.displayHeightData(summaryResult, state as unknown as TileLoadState);
      if (useZip && zip) {
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const base = format('{lat}_{lng}_{zoom}_{w}_{h}', this.getFilenameArgs(state));
        const zipFilename = `${base}_heightmap.zip`;
        this.download(zipBlob, zipFilename);
        this.els.outputImage.prepend($('<p>').text(`Saved ${slices.length} tiled files as ${zipFilename}.`));
      } else {
        this.els.outputImage.prepend($('<p>').text(`Saved ${slices.length} tiled files.`));
      }
    }
  }

  async processTileSequential(baseState: ConfigState, sliceInfo: TileSliceInfo, index: number, total: number, summary: StreamingSummary, useZip: boolean, targetTileWidth?: number, targetTileHeight?: number) {
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
    const maps = output.maps?.length
      ? await this.encodeDerivedMaps(output.maps, chunkState, sliceInfo.width, sliceInfo.height, sliceInfo, targetTileWidth, targetTileHeight)
      : [];
    return {...result, georef, maps};
  }

  getNormaliseModeValue() : NormaliseMode {
    const mode = parseInt(this.inputs.smartNormalisationControl?.val()?.toString() || '0', 10);
    return mode as NormaliseMode;
  }

  hasManualNormRange() {
    return (this.inputs.normFrom?.val()?.toString() ?? '') !== '' && (this.inputs.normTo?.val()?.toString() ?? '') !== '';
  }

  getNormRangeFromInputs() : NormRange {
    const norm : NormRange = {from: null, to: null};
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
    const imageFetches = [];
    const items : (ConfigState & TileCoords & {url: string})[] = [];

    const oldZoom = parseInt(this.inputs.zoom.val().toString());
    this.map.setZoom(parseInt(this.inputs.outputzoom.val().toString()));

    // This little timeout seems to help the map to 'Catch up' for some reason
    setTimeout(() => {
      const layer = this.layers[this.inputs.maptype.val().toString()].layer;
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
      .finally(() => {
        this.inputs.zoom.val(oldZoom);
        this.map.setZoom(oldZoom);
        this.els.generateAlbedo.prop('disabled', false);
        this.els.generateAlbedo.text(this.els.generateAlbedo.data('originalText') ?? 'Generate Albedo');
      });
    }, 1000);
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
  async generateOutput(states : TileLoadState[]) {
    return this.generateOutputUsingWorker(states);
  }
  async generateOutputUsingWorker(states : TileLoadState[]) {
    const norm : NormRange = {from : null, to : null}
    if (this.inputs.normFrom.val() !== "") {
      norm.from = parseFloat(this.inputs.normFrom.val().toString());
    }
    if (this.inputs.normTo.val() !== "") {
      norm.to = parseFloat(this.inputs.normTo.val().toString());
    }
    const progressHandler = Comlink.proxy((update: ProcessorProgressUpdate) => {
      this.updateProcessingProgress(update);
    });
    //@ts-ignore
    let output : NormaliseResult<Float32Array>;
    try {
      //@ts-ignore
      output = await processor.combineImages(states, this.inputs.smartNormalisationControl.val(), norm, progressHandler, this.getProcessOptions(states[0])) as NormaliseResult<Float32Array>;
    } finally {
      this.hideProcessingProgress();
    }
    this.displayHeightData(output, states[0]);
    const saved = await this.saveOutput(output.data, states);
    if (output.maps?.length) {
      await this.saveDerivedMaps(output.maps, states[0]);
    }
    return saved;
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
    if (formatSelection === 'exr16' || formatSelection === 'exr32') {
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
    const exrData = mapHeightSamplesToExr(output);
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

  // ESRI WKT for EPSG:3857, so GIS tools (QGIS etc.) pick up the CRS automatically.
  static readonly EPSG3857_PRJ = 'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]';

  /**
   * Build a world file (.pgw/.wld) and .prj for an export, georeferencing it in EPSG:3857.
   * The extent is derived from the exact slippy-map tile coordinates the image was stitched from;
   * one output pixel is 1/256 of a tile at state.z. startX/startY offset into the image for tiles.
   */
  buildGeoreferenceFiles(state : ConfigState, imageFilename : string, startX : number = 0, startY : number = 0) : {filename: string, blob: Blob}[] {
    const earthCircumference = 2 * Math.PI * 6378137;
    const originShift = earthCircumference / 2;
    const tileSizeMetres = earthCircumference / Math.pow(2, state.z);
    const pixelSize = tileSizeMetres / NextZen.tileWidth;
    const leftTileX = state.exactPos.x - state.widthInTiles / 2;
    const topTileY = state.exactPos.y - state.heightInTiles / 2;
    const left = leftTileX * tileSizeMetres - originShift + startX * pixelSize;
    const top = originShift - topTileY * tileSizeMetres - startY * pixelSize;
    // World file: x pixel size, rotation terms, negative y pixel size, then the centre of the top-left pixel.
    const worldFile = [
      pixelSize,
      0,
      0,
      -pixelSize,
      left + pixelSize / 2,
      top - pixelSize / 2,
    ].map(v => v.toFixed(10)).join('\n') + '\n';
    const base = imageFilename.replace(/\.[^.]+$/, '');
    const ext = imageFilename.split('.').pop()?.toLowerCase();
    const worldExt = ext === 'png' ? 'pgw' : 'wld';
    return [
      {filename: `${base}.${worldExt}`, blob: new Blob([worldFile], {type: 'text/plain'})},
      {filename: `${base}.prj`, blob: new Blob([App.EPSG3857_PRJ], {type: 'text/plain'})},
    ];
  }

  /** Show download links for georeferencing files (links rather than auto-downloads, to avoid multi-download prompts). */
  appendGeoreferenceLinks(files : {filename: string, blob: Blob}[]) {
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
      this.els.container.append(this.els.outputContainer);
      this.els.container.append(this.els.messageStack);
    }
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
    this.els.outputText.append(container);
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
    const phase = update.phase === 'normalise' ? 'Normalising data' : 'Stitching tiles';
    this.showProcessingProgress(`${phase} (${Math.round(percent)}%)`, percent);
  }
  hideProcessingProgress() {
    this.els.processingProgressContainer?.hide();
  }
  async yieldToBrowser() {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
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