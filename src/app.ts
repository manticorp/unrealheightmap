import PNG from "./png";
import NextZen from "./nextzen";
import UPNG from "./UPNG";
import * as $ from "jquery";
import { throttle, debounce } from 'throttle-debounce';
import * as  L from "leaflet";
import "leaflet-providers";
import {format} from "./helpers";

import * as Comlink from 'comlink';
import {NormaliseResult, TypedArrayToStlArgs, typedArrayToStlDefaults} from './processor';

const worker = new Worker("public/dist/js/processor.js");
const processor = Comlink.wrap(worker);

import {
  TypedArray,
  TileCoords,
  LatLng,
  LatLngZoom,
  ConfigState,
  TileLoadState,
  NormaliseMode,
  roll,
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

let currentRequests: XMLHttpRequest[] = [];

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
  meterFormatter : Intl.NumberFormat;
  map : L.Map;
  mapMarker : L.Marker;
  boundingRect : L.Rectangle;
  layers: Record<string, any> = {};
  layer: string  = 'topo';
  savedKeys : string[] = [
      'latitude',
      'longitude',
      'zoom',
      'outputzoom',
      'width',
      'height'
  ];
  constructor({container} : AppArgs) {
    this.container = container;
    this.meterFormatter = new Intl.NumberFormat(undefined, {style:'unit', unit: 'meter'});
    this.createMapLayers();
    this.createAppElements();
    this.insertSavedValues();
    this.createMap();
    this.hookControls();
  }
  createAppElements() {
    this.els.container = $(this.container);
    this.els.inputContainer = $('<div class="input-container">');
    this.els.container.append(this.els.inputContainer);

    this.createInputOptions();
    this.createOutputOptions();
    this.createSubmitButton();
    this.resetOutput();
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
    this.layers.otm = {
      layer: L.tileLayer.provider('OpenTopoMap'),
      label: 'Open Topo Map'
    };
    this.layers.watercolor = {
      layer: L.tileLayer.provider('Stamen.Watercolor'),
      label: 'Watercolor'
    };
    this.layers.nextzen = {
      layer: L.tileLayer(
        NextZen.getApiKeyedUrl(),
        {
          attribution: '&copy; NextZen',
          maxZoom: 15
        }
      ),
      label: 'Terrarium (used for the export)'
    };
  }
  createMap() {
    $('#map').height(512);

    const curLatLng : L.LatLngExpression = [parseFloat(this.inputs.latitude.val().toString()), parseFloat(this.inputs.longitude.val().toString())];

    this.map = L.map('map', {
      center: curLatLng,
      zoom: parseInt(this.inputs.zoom.val().toString())
    });

    this.layers.topo.layer.addTo(this.map);

    const icon = L.icon({
      iconUrl: 'public/im/marker.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    this.mapMarker = L.marker(curLatLng, {icon});
    this.mapMarker.addTo(this.map);

    const doHeightsDebounced = debounce(50, () => {
      this.getApproxHeightsForState();
    });

    this.map.on('click', debounce(100, (e) => {
      this.map.setView(e.latlng);
      this.inputs.latitude.val(e.latlng.lat);
      this.inputs.longitude.val(e.latlng.lng);
      this.inputs.zoom.val(this.map.getZoom());
      this.mapMarker.setLatLng(e.latlng);
      this.saveLatLngZoomState();
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.map.on('move', throttle(1000/60, (e) => {
      const center = this.map.getCenter();
      const nlat = center.lat + 90;
      const lat = (((nlat % 180) + 180) % 180) - 90;
      const nlng = center.lng + 180;
      const lng = (((nlng % 360) + 360) % 360) - 180;
      this.inputs.latitude.val(lat);
      this.inputs.longitude.val(lng);
      this.inputs.zoom.val(this.map.getZoom());
      this.mapMarker.setLatLng(center);
      this.saveLatLngZoomState();
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.map.on('moveend', doHeightsDebounced);

    this.updatePhysicalDimensions();
    this.showHideCurrentLayer();
    doHeightsDebounced();
  }
  updatePhysicalDimensions() {
    let state = this.getCurrentState();
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
      this.boundingRect = L.rectangle(bounds, {color: "#ff7800", weight: 1}).addTo(this.map);
    }
    this.boundingRect.setBounds(bounds);

    const units = state.phys.width > 1000 ? 'km' : 'm';
    const precision = state.phys.width > 100000 ? 0 : 1;
    const w = state.phys.width > 1000 ? state.phys.width/1000 : state.phys.width;
    const h = state.phys.height > 1000 ? state.phys.height/1000 : state.phys.height;

    const res = Math.max(state.phys.width/state.width, state.phys.height/state.height);
    const resunit = 'm';
    const resprecision = res > 10 ? 1 : 2;

    this.els.generate.html(`Generate (${w.toFixed(precision)} x ${h.toFixed(precision)}${units} - ${res.toFixed(resprecision)}${resunit}/px resolution<span class="heights"></span>)`);
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
      max: '15',
      step: '1',
      value: '13'
    });

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
    this.els.columnOutputZoom.append(App.createLabel('Output Zoom', {for:'outputzoom'}));
    this.els.columnOutputZoom.append(this.els.outputzoomControl);
    this.els.columnMaptype.append(App.createLabel('Map Preview Type', {for:'maptype'}));
    this.els.columnMaptype.append(this.els.maptypeControl);

    this.els.columnsLatLngZoom.append(this.els.columnLat);
    this.els.columnsLatLngZoom.append(this.els.columnLng);
    this.els.columnsLatLngZoom.append(this.els.columnZoom);
    this.els.columnsLatLngZoom.append(this.els.columnOutputZoom);
    this.els.columnsLatLngZoom.append(this.els.columnMaptype);

    this.els.inputContainer.append(this.els.columnsLatLngZoom);
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

    this.els.columnsOutput = $('<div class="columns">');
    this.els.columnWidth = $('<div class="column field">');
    this.els.columnHeight = $('<div class="column field">');

    this.els.widthControl  = $('<div class="control">').append(this.inputs.width);
    this.els.heightControl = $('<div class="control">').append(this.inputs.height);

    this.els.columnWidth.append(App.createLabel('Output Width (px)', {for:'width'}));
    this.els.columnWidth.append(this.els.widthControl);
    this.els.columnHeight.append(App.createLabel('Output Height (px)', {for:'height'}));
    this.els.columnHeight.append(this.els.heightControl);

    this.els.columnsOutput.append(this.els.columnWidth);
    this.els.columnsOutput.append(this.els.columnHeight);

    this.els.inputContainer.append(this.els.columnsOutput);

    // defaultSize options

    this.inputs.defaultSize = $('<select>') as JQuery<HTMLSelectElement>;

    this.inputs.defaultSize.append(`<option></option>`);
    for (let size of this.defaultSizes) {
      this.inputs.defaultSize.append(`<option value="${size}">${size}</option>`);
    }

    this.els.columnsDefaultSizes = $('<div class="columns">');
    this.els.columnSize = $('<div class="column field">');

    this.els.defaultSizeControl  = $('<div class="control">').append($('<div class="select is-fullwidth">').append(this.inputs.defaultSize));

    this.els.columnSize.append(App.createLabel('Default UE5 Landscape Sizes', {for:'width'}));
    this.els.columnSize.append(this.els.defaultSizeControl);

    this.els.columnsOutput.append(this.els.columnSize);

    this.els.inputContainer.append(this.els.columnsDefaultSizes);

    this.els.smartNormalisationControl = $(`
    <label class="label">Normalisation Mode</label>
    <div class="control">
      <div class="select is-fullwidth">
        <select name="smart-normalisation-control">
          <option value=0>Off</option>
          <option value=1>Regular</option>
          <option value=3 selected>Smart</option>
        </select>
      </div>
    </div>`);
    this.els.columnsOutput.append(
      $('<div class="column field">').append(this.els.smartNormalisationControl)
    );

    this.inputs.smartNormalisationControl = this.els.smartNormalisationControl.find('select');

  }
  createSubmitButton() {
    this.els.generate = $('<button class="button is-primary">Generate</button>');
    this.els.inputContainer.append(
      $('<div class="columns">').append(
        $('<div class="column">').append(
          $('<div class="field">').append(
            $('<div class="control">').append(this.els.generate)
          )
        )
      )
    );
  }
  getInputState() {
    const state : Record<string,any> = {};
    for (let key of this.savedKeys) {
      const input = this.inputs[key];
      if (input) {
        state[key] = input.val();
      }
    }
    return state;
  }
  insertSavedValues() {
    for (let key of this.savedKeys) {
      let val = localStorage.getItem(key);
      if (val) {
        let value = JSON.parse(val) as StoredItemValue;
        const input = this.inputs[key];
        if (value.data && input) {
          input.val(value.data);
        }
      }
    }
    this.insertValuesFromUrlHash();
  }
  insertValuesFromUrlHash() {
    const state = this.parseHash(location.hash);
    for (let [key, value] of Object.entries(state)) {
      const input = this.inputs[key];
      if (value && input) {
        input.val(value);
      }
    }
  }
  parseHash(hashstr : string) {
    const pairs = hashstr.replace(/^#/,'').replace(/^\//, '').split('/');
    const out : Record<string,string> = {};
    for (let i = 0; i < pairs.length; i+=2) {
      out[pairs[i]] = pairs[i+1];
    }
    return out;
  }
  objectToHash(hashobj : Record<string,any>) {
    return '#' + Object.entries(hashobj).flat().join("/");
  }
  storeValue(key : string, data : string, expires : number = null) {
    expires = expires || ((new Date()).getTime())+(1000*60*60*24*30);
    let storedItem : StoredItemValue = {key, data, expires};
    localStorage.setItem(key, JSON.stringify(storedItem));
    location.hash = this.objectToHash(this.getInputState());
  }
  saveLatLngZoomState() {
    this.storeValue('latitude', this.inputs.latitude.val().toString());
    this.storeValue('longitude', this.inputs.longitude.val().toString());
    this.storeValue('zoom', this.inputs.zoom.val().toString());
  }
  hookControls() {
    const doHeightsDebounced = debounce(50, () => {
      this.getApproxHeightsForState();
    });
    this.inputs.defaultSize.on('change input', debounce(100, () => {
      const val = this.inputs.defaultSize.val();
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
      doHeightsDebounced();
    }));

    this.els.generate.on('click touchend', debounce(100, () => {
      this.generate();
    }));

    this.inputs.maptype.on('change input', debounce(30, () => {
      this.storeValue('maptype', this.inputs.maptype.val().toString());
      this.showHideCurrentLayer();
      doHeightsDebounced();
    }));

    this.inputs.latitude.on('change input', debounce(30, () => {
      this.storeValue('latitude', this.inputs.latitude.val().toString());
      this.map.setView({
        lat: parseFloat(this.inputs.latitude.val().toString()),
        lng: parseFloat(this.inputs.longitude.val().toString())
      });
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.inputs.longitude.on('change input', debounce(30, () => {
      this.storeValue('longitude', this.inputs.longitude.val().toString());
      this.map.setView({
        lat: parseFloat(this.inputs.latitude.val().toString()),
        lng: parseFloat(this.inputs.longitude.val().toString())
      });
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.inputs.zoom.on('change input', debounce(30, () => {
      this.storeValue('zoom', this.inputs.zoom.val().toString());
      this.map.setZoom(parseInt(this.inputs.zoom.val().toString()));
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.inputs.outputzoom.on('change input', debounce(30, () => {
      this.storeValue('outputzoom', this.inputs.outputzoom.val().toString());
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.inputs.width.on('change input', debounce(30, () => {
      this.storeValue('width', this.inputs.width.val().toString());
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));

    this.inputs.height.on('change input', debounce(30, () => {
      this.storeValue('height', this.inputs.height.val().toString());
      this.updatePhysicalDimensions();
      doHeightsDebounced();
    }));
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
      max: {x: 0, y: 0}
    };
  }
  getCurrentState(scaleApprox : number = 1) : ConfigState {
    const state = this.newState();

    const z = parseInt(this.inputs.outputzoom.val().toString());
    const newZ = Math.floor(Math.min(15, Math.max(1, z + Math.log2(scaleApprox))));
    const scale = Math.pow(2, newZ-z);

    state.latitude  = parseFloat(this.inputs.latitude.val().toString());
    state.longitude = parseFloat(this.inputs.longitude.val().toString());
    state.z         = newZ;
    state.zoom      = newZ;
    state.width     = parseInt(this.inputs.width.val().toString()) * scale;
    state.height    = parseInt(this.inputs.height.val().toString()) * scale;

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

    const latWidth = Math.abs(state.bounds[1].latitude - state.bounds[0].latitude);
    const lngWidth = Math.abs(state.bounds[1].longitude - state.bounds[0].longitude);
    state.phys = {
      height: (1000 * 110.574 * latWidth),
      width:  (1000 * 110.574 * lngWidth),
    };

    return state;
  }
  getApproxHeightsForState() {
    let state = this.getCurrentState(1);
    if (state.width > 4000) {
      state = this.getCurrentState(1/8);
    } else if (state.width > 2000) {
      state = this.getCurrentState(1/4);
    } else if (state.width > 1000) {
      state = this.getCurrentState(1/2);
    }
    const imageFetches = [];
    for (let x = state.startx; x <= state.endx; x++) {
      for (let y = state.starty; y <= state.endy; y++) {
        imageFetches.push(new Promise((resolve, reject) => {
          const nx = roll(x, state.min.x, state.max.x);
          return App.getImageAt({z: state.z, x: nx, y: y}).then(buffer => {
            const png = PNG.fromBuffer(buffer);
            resolve({...state, x, y, buffer, png, heights: png.terrariumToGrayscale()});
          }).catch(e => {
            if (e.type === 'abort') {
              return;
            }
            console.error(e);
            reject({...state, x, y, nx});
          });
        }));
      }
    }
    return Promise.all(imageFetches).then((result : TileLoadState[]) : Promise<void> => {
      //@ts-ignore
      return processor.combineImages(result, NormaliseMode.SmartWindow)
      .then((output : NormaliseResult<Float32Array>) => {
        const fmt = this.meterFormatter;
        const txt = `, Height range: ${fmt.format(output.minBefore)} to ${fmt.format(output.maxBefore)}`;
        this.els.generate.find('.heights').text(txt);
      });
    }).catch(e => {
      console.error('Failed to load images', e);
    }).finally(() => {
      this.els.generate.prop('disabled', false);
      currentRequests = [];
    });
  }
  generate() {
    this.els.generate.prop('disabled', true);
    const state = this.getCurrentState();
    console.log('generate', state);
    this.resetOutput();

    const imageFetches = [];
    currentRequests = [];
    for (let x = state.startx; x <= state.endx; x++) {
      for (let y = state.starty; y <= state.endy; y++) {
        imageFetches.push(new Promise((resolve, reject) => {
          const nx = roll(x, state.min.x, state.max.x);
          return App.getImageAt({z: state.z, x: nx, y: y}).then(buffer => {
            this.imageLoaded({...state, x, y});
            const png = PNG.fromBuffer(buffer);
            resolve({...state, x, y, buffer, png, heights: png.terrariumToGrayscale()});
          }).catch(e => {
            for (let r of currentRequests) {
              r.abort();
            }
            if (e.type === 'abort') {
              return;
            }
            console.error(e);
            this.displayError({text: `Failed to load image at tile x = ${x} y = ${y} - please try again`});
            reject({...state, x, y});
          });
        }));
      }
    }
    return Promise.all(imageFetches).then((result : TileLoadState[]) => {
      return new Promise((resolve, reject)  => {
        this.els.outputText.html('Generating images (should not take much longer)');
        setTimeout(() => {
          resolve(this.generateOutput(result));
        },1);
      });
    }).catch(e => {
      console.error('Failed to load images', e);
      this.displayError({text: 'Failed to load images'});
    }).finally(() => {
      this.els.generate.prop('disabled', false);
      currentRequests = [];
    });
  }
  displayError(message : {text: string}) {
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
  async generateOutputUsingWorker(states : TileLoadState[]) {
    //@ts-ignore
    const output = await processor.combineImages(states, this.inputs.smartNormalisationControl.val()) as NormaliseResult<Float32Array>;
    this.displayHeightData(output, states[0]);
    return this.saveOutput(output.data, states);
  }
  displayHeightData(output : NormaliseResult<Float32Array>, state: TileLoadState) {
    const fmt = this.meterFormatter;
    const range = output.maxBefore - output.minBefore;
    const unrealZscaleFactor = 0.001953125;
    const zScale = unrealZscaleFactor * range * 100;
    const xyScale = ((state.phys.width * 100) / state.width);
    // Start by multiplying 4207 by 100 to convert the height into centimeters. This equals 420,700 cm.
    // Next, multiply this new value by the ratio: 420,700 multiplied by 0.001953125 equals 821.6796875‬.
    // This gives you a Z scale value of 821.6796875‬ and results in a heightmap that will go from -210,350 cm to 210,350 cm.
    const txt = `<p>Height range: ${fmt.format(output.minBefore)} to ${fmt.format(output.maxBefore)}</p>
    <p>In Unreal Engine, on import, a z scaling of <code>${zScale.toFixed(2)}</code> should be used for 1:1 height scaling using a normalised image.</p>
    <p>x and y scales should be set to <code>${xyScale.toFixed(2)}</code></p>`;
    this.els.outputText.html(txt);
  }
  async generateOutput(states : TileLoadState[]) {
    return this.generateOutputUsingWorker(states);
  }
  async saveOutput(output : Float32Array, states : TileLoadState[]) {
    const s = states[0];
    const formatArgs = {
      lat: s.latitude.toFixed(3).toString().replace(".",'_'),
      lng: s.longitude.toFixed(3).toString().replace(".",'_'),
      zoom: s.zoom,
      w: s.width,
      h: s.height,
    };
    const fn = format('{lat}_{lng}_{zoom}_{w}_{h}.png', formatArgs);

    return App.encodeToPng([PNG.Float32ArrayToPng16Bit(output)], states[0].width, states[0].height, 1, 0, 16).then(a => {
      const blob = new Blob( [ a ] );
      const url = URL.createObjectURL( blob );
      const img : HTMLImageElement = new Image();
      img.src = url;
      // So the Blob can be Garbage Collected
      img.onload = e => URL.revokeObjectURL( url );

      this.els.outputImage.append(img);
      this.download(blob, fn);
    });
  }

  download(contents : Blob, fn : string) {
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

  static async getImageAt({x, y, z} : TileCoords) : Promise<ArrayBuffer> {
    return App.getImageAsBuffer(NextZen.getUrl({x,y,z}));
  }
  static async getImageAsBuffer(im : string) : Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      currentRequests.push(xhr);
      xhr.open("GET", im);
      // xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      // xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
      xhr.responseType = "arraybuffer";

      // xhr.addEventListener('loadstart', handleEvent);
      xhr.addEventListener('load', () => resolve(xhr.response));
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
  async typedArrayToStl(
    points: TypedArray,
    widthpx : number,
    heightpx : number,
    {width, depth, height} : TypedArrayToStlArgs = typedArrayToStlDefaults
  ) {
    //@ts-ignore
    return await processor.typedArrayToStl(points, widthpx, heightpx, {width, depth, height});
  }
}