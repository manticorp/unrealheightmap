var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import PNG from "./png";
import NextZen from "./nextzen";
import UPNG from "./UPNG";
import * as $ from "jquery";
import { debounce } from "ts-debounce";
import * as L from "leaflet";
import "leaflet-providers";
var App = /** @class */ (function () {
    function App(_a) {
        var container = _a.container;
        this.els = {};
        this.inputs = {};
        this.imagesLoaded = [];
        this.defaultSizes = [
            '8129 x 8129',
            '4033 x 4033',
            '2017 x 2017',
            '1009 x 1009',
            '505 x 505',
            '253 x 253',
            '127 x 127',
        ];
        this.layers = {};
        this.layer = 'topo';
        this.container = container;
        this.createMapLayers();
        this.createAppElements();
        this.insertSavedValues();
        this.createMap();
        this.hookControls();
    }
    App.prototype.createAppElements = function () {
        this.els.container = $(this.container);
        this.els.inputContainer = $('<div class="input-container">');
        this.els.container.append(this.els.inputContainer);
        this.createInputOptions();
        this.createOutputOptions();
        this.createDefaultOptions();
        this.createSubmitButton();
        this.resetOutput();
    };
    App.prototype.showHideCurrentLayer = function () {
        this.layer = this.inputs.maptype.val();
        for (var _i = 0, _a = Object.entries(this.layers); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], layer = _b[1];
            if (key == this.layer) {
                layer.addTo(this.map);
            }
            else {
                layer.removeFrom(this.map);
            }
        }
    };
    App.prototype.createMapLayers = function () {
        this.layers.topo = L.tileLayer.provider('Esri.WorldTopoMap');
        this.layers.nextzen = L.tileLayer(NextZen.getApiKeyedUrl(), {
            attribution: '&copy; NextZen',
            maxZoom: 15
        });
    };
    App.prototype.createMap = function () {
        var _this = this;
        $('#map').height(512);
        var curLatLng = [parseFloat(this.inputs.latitude.val().toString()), parseFloat(this.inputs.longitude.val().toString())];
        this.map = L.map('map', {
            center: curLatLng,
            zoom: parseInt(this.inputs.zoom.val().toString())
        });
        this.layers.topo.addTo(this.map);
        var icon = L.icon({
            iconUrl: '/im/marker.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
        });
        this.mapMarker = L.marker(curLatLng, { icon: icon });
        this.mapMarker.addTo(this.map);
        this.map.on('click', function (e) {
            _this.map.setView(e.latlng);
            _this.inputs.latitude.val(e.latlng.lat);
            _this.inputs.longitude.val(e.latlng.lng);
            _this.inputs.zoom.val(_this.map.getZoom());
            _this.mapMarker.setLatLng(e.latlng);
            _this.saveLatLngZoomState();
            _this.redrawRect();
        });
        this.map.on('move', function (e) {
            var center = _this.map.getCenter();
            _this.inputs.latitude.val(center.lat);
            _this.inputs.longitude.val(center.lng);
            _this.inputs.zoom.val(_this.map.getZoom());
            _this.mapMarker.setLatLng(center);
            _this.saveLatLngZoomState();
            _this.redrawRect();
        });
        this.redrawRect();
    };
    App.prototype.redrawRect = function () {
        var state = this.getCurrentState();
        var bounds = [
            [
                state.bounds[0].latitude,
                state.bounds[0].longitude
            ], [
                state.bounds[1].latitude,
                state.bounds[1].longitude
            ]
        ];
        if (!this.boundingRect) {
            this.boundingRect = L.rectangle(bounds, { color: "#ff7800", weight: 1 }).addTo(this.map);
        }
        this.boundingRect.setBounds(bounds);
    };
    App.prototype.createInputOptions = function () {
        // input options
        this.inputs.latitude = App.createInput({
            name: 'latitude',
            placeholder: 'Latitude',
            type: 'number',
            min: '-90',
            max: '90',
            value: '0'
        });
        this.inputs.longitude = App.createInput({
            name: 'longitude',
            placeholder: 'Longitude',
            type: 'number',
            min: '-180',
            max: '180',
            value: '0'
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
        this.inputs.maptype = $('<select>');
        for (var _i = 0, _a = Object.keys(this.layers); _i < _a.length; _i++) {
            var type = _a[_i];
            this.inputs.maptype.append("<option value=\"".concat(type, "\">").concat(type, "</option>"));
        }
        this.els.columnsLatLngZoom = $('<div class="columns">');
        this.els.columnLat = $('<div class="column field">');
        this.els.columnLng = $('<div class="column field">');
        this.els.columnZoom = $('<div class="column field">');
        this.els.columnOutputZoom = $('<div class="column field">');
        this.els.columnMaptype = $('<div class="column field">');
        this.els.latitudeControl = $('<div class="control">').append(this.inputs.latitude);
        this.els.longitudeControl = $('<div class="control">').append(this.inputs.longitude);
        this.els.zoomControl = $('<div class="control">').append(this.inputs.zoom);
        this.els.outputzoomControl = $('<div class="control">').append(this.inputs.outputzoom);
        this.els.maptypeControl = $('<div class="control">').append($('<div class="select">').append(this.inputs.maptype));
        this.els.columnLat.append(App.createLabel('Latitude', { for: 'latitude' }));
        this.els.columnLat.append(this.els.latitudeControl);
        this.els.columnLng.append(App.createLabel('Longitude', { for: 'latitude' }));
        this.els.columnLng.append(this.els.longitudeControl);
        this.els.columnZoom.append(App.createLabel('Zoom', { for: 'zoom' }));
        this.els.columnZoom.append(this.els.zoomControl);
        this.els.columnOutputZoom.append(App.createLabel('Output Zoom', { for: 'outputzoom' }));
        this.els.columnOutputZoom.append(this.els.outputzoomControl);
        this.els.columnMaptype.append(App.createLabel('Map Type', { for: 'maptype' }));
        this.els.columnMaptype.append(this.els.maptypeControl);
        this.els.columnsLatLngZoom.append(this.els.columnLat);
        this.els.columnsLatLngZoom.append(this.els.columnLng);
        this.els.columnsLatLngZoom.append(this.els.columnZoom);
        this.els.columnsLatLngZoom.append(this.els.columnOutputZoom);
        this.els.columnsLatLngZoom.append(this.els.columnMaptype);
        this.els.inputContainer.append(this.els.columnsLatLngZoom);
    };
    App.prototype.createOutputOptions = function () {
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
        this.els.widthControl = $('<div class="control">').append(this.inputs.width);
        this.els.heightControl = $('<div class="control">').append(this.inputs.height);
        this.els.columnWidth.append(App.createLabel('Output Width (px)', { for: 'width' }));
        this.els.columnWidth.append(this.els.widthControl);
        this.els.columnHeight.append(App.createLabel('Output Height (px)', { for: 'height' }));
        this.els.columnHeight.append(this.els.heightControl);
        this.els.columnsOutput.append(this.els.columnWidth);
        this.els.columnsOutput.append(this.els.columnHeight);
        this.els.inputContainer.append(this.els.columnsOutput);
    };
    App.prototype.createDefaultOptions = function () {
        // defaultSize options
        this.inputs.defaultSize = $('<select>');
        this.inputs.defaultSize.append("<option></option>");
        for (var _i = 0, _a = this.defaultSizes; _i < _a.length; _i++) {
            var size = _a[_i];
            this.inputs.defaultSize.append("<option value=\"".concat(size, "\">").concat(size, "</option>"));
        }
        this.els.columnsDefaultSizes = $('<div class="columns">');
        this.els.columnSize = $('<div class="column field">');
        this.els.defaultSizeControl = $('<div class="control">').append($('<div class="select">').append(this.inputs.defaultSize));
        this.els.columnSize.append(App.createLabel('Default UE5 Landscape Sizes', { for: 'width' }));
        this.els.columnSize.append(this.els.defaultSizeControl);
        this.els.columnsDefaultSizes.append(this.els.columnSize);
        this.els.inputContainer.append(this.els.columnsDefaultSizes);
    };
    App.prototype.createSubmitButton = function () {
        this.els.generate = $('<button class="button is-primary">Generate</button>');
        this.els.inputContainer.append($('<div class="columns">').append($('<div class="column">').append($('<div class="field is-grouped">').append($('<div class="control">').append(this.els.generate)))));
    };
    App.prototype.insertSavedValues = function () {
        var keys = [
            'latitude',
            'longitude',
            'zoom',
            'outputzoom',
            'width',
            'height'
        ];
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            var val = localStorage.getItem(key);
            if (val) {
                var value = JSON.parse(val);
                var input = this.inputs[key];
                if (value.data && input) {
                    input.val(value.data);
                }
            }
        }
    };
    App.prototype.storeValue = function (key, data, expires) {
        if (expires === void 0) { expires = null; }
        expires = expires || ((new Date()).getTime()) + (1000 * 60 * 60 * 24 * 30);
        var storedItem = { key: key, data: data, expires: expires };
        localStorage.setItem(key, JSON.stringify(storedItem));
    };
    App.prototype.saveLatLngZoomState = function () {
        this.storeValue('latitude', this.inputs.latitude.val().toString());
        this.storeValue('longitude', this.inputs.longitude.val().toString());
        this.storeValue('zoom', this.inputs.zoom.val().toString());
    };
    App.prototype.hookControls = function () {
        var _this = this;
        this.inputs.defaultSize.on('change input', debounce(function () {
            var val = _this.inputs.defaultSize.val();
            if (val && typeof val === 'string' && val.trim() !== '') {
                var parts = val.split(" x ");
                if (parts.length === 2) {
                    _this.inputs.width.val(parts[0]);
                    _this.inputs.height.val(parts[1]);
                }
            }
            _this.storeValue('width', _this.inputs.width.val().toString());
            _this.storeValue('height', _this.inputs.height.val().toString());
            _this.redrawRect();
        }, 100, { isImmediate: true }));
        this.els.generate.on('click touchend', debounce(function () {
            _this.generate();
        }, 100, { isImmediate: true }));
        this.inputs.latitude.on('change input', debounce(function () {
            _this.storeValue('latitude', _this.inputs.latitude.val().toString());
            _this.redrawRect();
        }, 60));
        this.inputs.longitude.on('change input', debounce(function () {
            _this.storeValue('longitude', _this.inputs.longitude.val().toString());
            _this.redrawRect();
        }, 60));
        this.inputs.zoom.on('change input', debounce(function () {
            _this.storeValue('zoom', _this.inputs.zoom.val().toString());
            _this.redrawRect();
        }, 60));
        this.inputs.outputzoom.on('change input', debounce(function () {
            _this.storeValue('outputzoom', _this.inputs.outputzoom.val().toString());
            _this.redrawRect();
        }, 60));
        this.inputs.width.on('change input', debounce(function () {
            _this.storeValue('width', _this.inputs.width.val().toString());
            _this.redrawRect();
        }, 60));
        this.inputs.height.on('change input', debounce(function () {
            _this.storeValue('height', _this.inputs.height.val().toString());
            _this.redrawRect();
        }, 60));
    };
    App.prototype.newState = function () {
        return {
            x: 0,
            y: 0,
            z: 0,
            latitude: 0,
            longitude: 0,
            zoom: 0,
            width: 0,
            height: 0,
            exactPos: { x: 0, y: 0, z: 0 },
            widthInTiles: 0,
            heightInTiles: 0,
            startx: 0,
            starty: 0,
            endx: 0,
            endy: 0,
            bounds: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }],
            status: 'pending'
        };
    };
    App.prototype.getCurrentState = function () {
        this.state = this.state || this.newState();
        this.state.latitude = parseFloat(this.inputs.latitude.val().toString());
        this.state.longitude = parseFloat(this.inputs.longitude.val().toString());
        this.state.z = parseInt(this.inputs.outputzoom.val().toString());
        this.state.zoom = parseInt(this.inputs.outputzoom.val().toString());
        this.state.width = parseInt(this.inputs.width.val().toString());
        this.state.height = parseInt(this.inputs.height.val().toString());
        this.state.exactPos = App.getTileCoordsFromLatLngExact(this.state.latitude, this.state.longitude, this.state.zoom);
        this.state.widthInTiles = this.state.width / NextZen.tileWidth;
        this.state.heightInTiles = this.state.height / NextZen.tileWidth;
        this.state.startx = Math.floor(this.state.exactPos.x - this.state.widthInTiles / 2);
        this.state.starty = Math.floor(this.state.exactPos.y - this.state.heightInTiles / 2);
        this.state.endx = Math.floor(this.state.exactPos.x + this.state.widthInTiles / 2);
        this.state.endy = Math.floor(this.state.exactPos.y + this.state.heightInTiles / 2);
        this.state.bounds = [
            App.getLatLngFromTileCoords(this.state.exactPos.x - this.state.widthInTiles / 2, this.state.exactPos.y - this.state.heightInTiles / 2, this.state.zoom),
            App.getLatLngFromTileCoords(this.state.exactPos.x + this.state.widthInTiles / 2, this.state.exactPos.y + this.state.heightInTiles / 2, this.state.zoom)
        ];
        return this.state;
    };
    App.prototype.generate = function () {
        var _this = this;
        this.getCurrentState();
        this.resetOutput();
        var imageFetches = [];
        this.state.status = 'loading';
        var _loop_1 = function (x) {
            var _loop_2 = function (y) {
                imageFetches.push(new Promise(function (resolve, reject) {
                    return App.getImageAt(__assign(__assign({}, _this.state), { x: x, y: y })).then(function (buffer) {
                        _this.imageLoaded(__assign(__assign({}, _this.state), { x: x, y: y }));
                        var png = PNG.fromBuffer(buffer);
                        resolve(__assign(__assign({}, _this.state), { x: x, y: y, buffer: buffer, png: png, heights: png.terrariumToGrayscaleArray() }));
                    });
                }));
            };
            for (var y = this_1.state.starty; y <= this_1.state.endy; y++) {
                _loop_2(y);
            }
        };
        var this_1 = this;
        for (var x = this.state.startx; x <= this.state.endx; x++) {
            _loop_1(x);
        }
        return Promise.all(imageFetches).then(function (result) {
            return _this.generateOutput(result);
        });
    };
    App.prototype.generateOutput = function (states) {
        var _this = this;
        var output = new Float32Array(states[0].width * states[0].height);
        var increment = 1 / NextZen.tileWidth;
        var map = {};
        for (var _i = 0, states_1 = states; _i < states_1.length; _i++) {
            var tile = states_1[_i];
            if (!map[tile.x]) {
                map[tile.x] = {};
            }
            map[tile.x][tile.y] = tile;
        }
        var extent = {
            x1: states[0].exactPos.x - states[0].widthInTiles / 2,
            x2: states[0].exactPos.x + states[0].widthInTiles / 2,
            y1: states[0].exactPos.y - states[0].heightInTiles / 2,
            y2: states[0].exactPos.y + states[0].heightInTiles / 2
        };
        var i = 0;
        var last = 0;
        for (var y = extent.y1; y < extent.y2; y += increment) {
            for (var x = extent.x1; x < extent.x2; x += increment) {
                var tile = {
                    x: Math.floor(x),
                    y: Math.floor(y)
                };
                var px = {
                    x: Math.floor((x % 1) * NextZen.tileWidth),
                    y: Math.floor((y % 1) * NextZen.tileWidth)
                };
                var idx = px.y * NextZen.tileWidth + px.x;
                var cur = map[tile.x][tile.y].heights[idx];
                if (!last) {
                    last = map[tile.x][tile.y].heights[idx];
                }
                if (Math.abs(last - cur) > 10) {
                    // console.log({last, cur, x, y, i, tile, idx, map: map[tile.x][tile.y]});
                    // throw new Error('BLAGH');
                }
                output[i++] = cur;
                last = cur;
            }
        }
        output = PNG.normaliseTypedArray(output);
        App.encodeToPng([PNG.Float32ArrayToPng16Bit(output)], states[0].width, states[0].height, 1, 0, 16).then(function (a) {
            var blob = new Blob([a]);
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.src = url;
            // So the Blob can be Garbage Collected
            img.onload = function (e) { return URL.revokeObjectURL(url); };
            _this.els.outputImage.append(img);
            var blobUrl = URL.createObjectURL(blob);
            // Create a link element
            var link = document.createElement("a");
            // Set link's href to point to the Blob URL
            link.href = blobUrl;
            link.download = 'grays.png';
            // Append link to the body
            document.body.appendChild(link);
            // Dispatch click event on the link
            // This is necessary as link.click() does not work on the latest firefox
            link.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            // Remove link from body
            document.body.removeChild(link);
        });
    };
    App.prototype.resetOutput = function () {
        this.imagesLoaded = [];
        if (!this.els.outputContainer) {
            this.els.outputContainer = $('<section class="app-output">');
            this.els.outputTextContainer = $('<div class="app-output-text-container columns">');
            this.els.outputText = $('<div class="app-output-text column">');
            this.els.outputImageContainer = $('<div class="app-output-image-container columns">');
            this.els.outputImage = $('<div class="app-output-image column">');
            this.els.outputContainer.append(this.els.outputTextContainer.append(this.els.outputText));
            this.els.outputContainer.append(this.els.outputImageContainer.append(this.els.outputImage));
            this.els.container.append(this.els.outputContainer);
        }
        this.els.outputText.empty();
        this.els.outputImage.empty();
    };
    App.prototype.imageLoaded = function (_a) {
        var x = _a.x, y = _a.y, z = _a.z;
        this.imagesLoaded.push({ x: x, y: y, z: z });
        this.doOutputText();
    };
    App.prototype.doOutputText = function () {
        var widthInTiles = (this.state.endx - this.state.startx) + 1;
        var heightInTiles = (this.state.endy - this.state.starty) + 1;
        var totalTiles = widthInTiles * heightInTiles;
        this.els.outputText.text("Loaded ".concat(this.imagesLoaded.length, " / ").concat(totalTiles, " tiles"));
    };
    App.createInput = function (attrs) {
        if (attrs === void 0) { attrs = { type: 'text', class: 'input' }; }
        attrs = __assign({ type: 'text', class: 'input' }, attrs);
        return $('<input>').attr(attrs);
    };
    App.createLabel = function (text, attrs) {
        if (attrs === void 0) { attrs = { class: 'label' }; }
        attrs = __assign({ class: 'label' }, attrs);
        return $("<label>".concat(text, "</label>")).attr(attrs);
    };
    App.toRad = function (n) {
        return (n * Math.PI / 180);
    };
    App.getTileCoordsFromLatLng = function (latitude, longitude, zoom) {
        var res = App.getTileCoordsFromLatLngExact(latitude, longitude, zoom);
        return {
            x: Math.floor(res.x),
            y: Math.floor(res.y),
            z: Math.floor(res.z),
        };
    };
    App.getTileCoordsFromLatLngExact = function (latitude, longitude, zoom) {
        if (zoom !== Math.floor(zoom)) {
            throw new Error("Zoom must be an integer, got ".concat(zoom));
        }
        var x = (longitude + 180) / 360 * (1 << zoom);
        var y = (1 - Math.log(Math.tan(App.toRad(latitude)) + 1 / Math.cos(App.toRad(latitude))) / Math.PI) / 2 * (1 << zoom);
        return {
            x: x,
            y: y,
            z: zoom
        };
    };
    App.getLatLngFromTileCoords = function (x, y, z) {
        if (z !== Math.floor(z)) {
            throw new Error("Zoom must be an integer, got ".concat(z));
        }
        var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return {
            latitude: (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))),
            longitude: (x / Math.pow(2, z) * 360 - 180)
        };
    };
    App.getImageAtLatLng = function (_a) {
        var latitude = _a.latitude, longitude = _a.longitude, zoom = _a.zoom;
        return __awaiter(this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_b) {
                tx = App.getTileCoordsFromLatLng(latitude, longitude, zoom);
                return [2 /*return*/, App.getImageAsBuffer(NextZen.getUrl(tx))];
            });
        });
    };
    App.getImageAt = function (_a) {
        var x = _a.x, y = _a.y, z = _a.z;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                return [2 /*return*/, App.getImageAsBuffer(NextZen.getUrl({ x: x, y: y, z: z }))];
            });
        });
    };
    App.getImageAsBuffer = function (im) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", im);
                        xhr.responseType = "arraybuffer";
                        // xhr.addEventListener('loadstart', handleEvent);
                        xhr.addEventListener('load', function () { return resolve(xhr.response); });
                        // xhr.addEventListener('loadend', handleEvent);
                        // xhr.addEventListener('progress', handleEvent);
                        xhr.addEventListener('error', reject);
                        xhr.addEventListener('abort', reject);
                        xhr.send();
                    })];
            });
        });
    };
    // debug - might delete l8er
    App.getPngFromUrl = function (im) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, App.getImageAsBuffer(im).then(function (ab) { return PNG.fromBuffer(ab); })];
            });
        });
    };
    App.getUpngFromUrl = function (im) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, App.getImageAsBuffer(im).then(function (ab) { return UPNG.toRGBA8(UPNG.decode(ab)).map(function (a) { return new Uint8Array(a); }); })];
            });
        });
    };
    App.getUpngDecodeFromUrl = function (im) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, App.getImageAsBuffer(im).then(function (ab) { return UPNG.decode(ab); })];
            });
        });
    };
    App.getUpngDecodeImageFromUrl = function (im) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, App.getImageAsBuffer(im).then(function (ab) { return UPNG.decode(ab); }).then(function (dec) { return UPNG.decodeImage(dec.data, dec.width, dec.height, dec); })];
            });
        });
    };
    App.encodeToPng = function (bufs, width, height, colourChannel, alphaChannel, depth, dels, tabs) {
        if (dels === void 0) { dels = null; }
        if (tabs === void 0) { tabs = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, UPNG.encodeLL(bufs, width, height, colourChannel, alphaChannel, depth, dels, tabs)];
            });
        });
    };
    App.cache = {};
    return App;
}());
export default App;
//# sourceMappingURL=app.js.map