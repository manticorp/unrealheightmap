/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/helpers.ts"
/*!************************!*\
  !*** ./src/helpers.ts ***!
  \************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NormaliseMode: () => (/* binding */ NormaliseMode),
/* harmony export */   clamp: () => (/* binding */ clamp),
/* harmony export */   format: () => (/* binding */ format),
/* harmony export */   localFormatNumber: () => (/* binding */ localFormatNumber),
/* harmony export */   modWithNeg: () => (/* binding */ modWithNeg),
/* harmony export */   promiseAllInBatches: () => (/* binding */ promiseAllInBatches),
/* harmony export */   roll: () => (/* binding */ roll),
/* harmony export */   roundDigits: () => (/* binding */ roundDigits)
/* harmony export */ });
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var format = function (str, obj) {
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        str = str.replace("{".concat(key, "}"), value.toString());
    }
    return str;
};
var NormaliseMode;
(function (NormaliseMode) {
    NormaliseMode[NormaliseMode["Off"] = 0] = "Off";
    NormaliseMode[NormaliseMode["Regular"] = 1] = "Regular";
    NormaliseMode[NormaliseMode["Smart"] = 2] = "Smart";
    NormaliseMode[NormaliseMode["SmartWindow"] = 3] = "SmartWindow";
    NormaliseMode[NormaliseMode["Fixed"] = 4] = "Fixed";
})(NormaliseMode || (NormaliseMode = {}));
var roll = function (num, min, max) {
    if (min === void 0) { min = 0; }
    if (max === void 0) { max = 1; }
    return modWithNeg(num - min, max - min) + min;
};
var modWithNeg = function (x, mod) { return ((x % mod) + mod) % mod; };
var clamp = function (num, min, max) {
    if (min === void 0) { min = 0; }
    if (max === void 0) { max = 1; }
    return Math.max(min, Math.min(max, num));
};
/**
 * Same as Promise.all(items.map(item => task(item))), but it waits for
 * the first {batchSize} promises to finish before starting the next batch.
 *
 * @template A
 * @template B
 * @param {function(A): B} task The task to run for each item.
 * @param {A[]} items Arguments to pass to the task for each call.
 * @param {int} batchSize
 * @returns {Promise<B[]>}
 */
function promiseAllInBatches(task, items, batchSize, to) {
    if (to === void 0) { to = 0; }
    return __awaiter(this, void 0, void 0, function () {
        var position, results, itemsForBatch, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    position = 0;
                    results = [];
                    _b.label = 1;
                case 1:
                    if (!(position < items.length)) return [3 /*break*/, 5];
                    itemsForBatch = items.slice(position, position + batchSize);
                    _a = [__spreadArray([], results, true)];
                    return [4 /*yield*/, Promise.all(itemsForBatch.map(function (item) { return task(item); }))];
                case 2:
                    results = __spreadArray.apply(void 0, _a.concat([_b.sent(), true]));
                    position += batchSize;
                    if (!(to > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, to); })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4: return [3 /*break*/, 1];
                case 5: return [2 /*return*/, results];
            }
        });
    });
}
function roundDigits(num, scale) {
    if (!("" + num).includes("e")) {
        return +(Math.round(parseFloat(num + "e+" + scale)) + "e-" + scale);
    }
    else {
        var arr = ("" + num).split("e");
        var sig = "";
        if (+arr[1] + scale > 0) {
            sig = "+";
        }
        return +(Math.round(parseFloat(+arr[0] + "e" + sig + (+arr[1] + scale))) + "e-" + scale);
    }
}
function localFormatNumber(num, scale) {
    return roundDigits(num, scale).toLocaleString();
}


/***/ },

/***/ "./node_modules/comlink/dist/esm/comlink.mjs"
/*!***************************************************!*\
  !*** ./node_modules/comlink/dist/esm/comlink.mjs ***!
  \***************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createEndpoint: () => (/* binding */ createEndpoint),
/* harmony export */   expose: () => (/* binding */ expose),
/* harmony export */   finalizer: () => (/* binding */ finalizer),
/* harmony export */   proxy: () => (/* binding */ proxy),
/* harmony export */   proxyMarker: () => (/* binding */ proxyMarker),
/* harmony export */   releaseProxy: () => (/* binding */ releaseProxy),
/* harmony export */   transfer: () => (/* binding */ transfer),
/* harmony export */   transferHandlers: () => (/* binding */ transferHandlers),
/* harmony export */   windowEndpoint: () => (/* binding */ windowEndpoint),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const finalizer = Symbol("Comlink.finalizer");
const throwMarker = Symbol("Comlink.thrown");
const isObject = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
/**
 * Internal transfer handle to handle objects marked to proxy.
 */
const proxyTransferHandler = {
    canHandle: (val) => isObject(val) && val[proxyMarker],
    serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port1);
        return [port2, [port2]];
    },
    deserialize(port) {
        port.start();
        return wrap(port);
    },
};
/**
 * Internal transfer handler to handle thrown exceptions.
 */
const throwTransferHandler = {
    canHandle: (value) => isObject(value) && throwMarker in value,
    serialize({ value }) {
        let serialized;
        if (value instanceof Error) {
            serialized = {
                isError: true,
                value: {
                    message: value.message,
                    name: value.name,
                    stack: value.stack,
                },
            };
        }
        else {
            serialized = { isError: false, value };
        }
        return [serialized, []];
    },
    deserialize(serialized) {
        if (serialized.isError) {
            throw Object.assign(new Error(serialized.value.message), serialized.value);
        }
        throw serialized.value;
    },
};
/**
 * Allows customizing the serialization of certain values.
 */
const transferHandlers = new Map([
    ["proxy", proxyTransferHandler],
    ["throw", throwTransferHandler],
]);
function isAllowedOrigin(allowedOrigins, origin) {
    for (const allowedOrigin of allowedOrigins) {
        if (origin === allowedOrigin || allowedOrigin === "*") {
            return true;
        }
        if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
            return true;
        }
    }
    return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
    ep.addEventListener("message", function callback(ev) {
        if (!ev || !ev.data) {
            return;
        }
        if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
            console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
            return;
        }
        const { id, type, path } = Object.assign({ path: [] }, ev.data);
        const argumentList = (ev.data.argumentList || []).map(fromWireValue);
        let returnValue;
        try {
            const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
            const rawValue = path.reduce((obj, prop) => obj[prop], obj);
            switch (type) {
                case "GET" /* MessageType.GET */:
                    {
                        returnValue = rawValue;
                    }
                    break;
                case "SET" /* MessageType.SET */:
                    {
                        parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
                        returnValue = true;
                    }
                    break;
                case "APPLY" /* MessageType.APPLY */:
                    {
                        returnValue = rawValue.apply(parent, argumentList);
                    }
                    break;
                case "CONSTRUCT" /* MessageType.CONSTRUCT */:
                    {
                        const value = new rawValue(...argumentList);
                        returnValue = proxy(value);
                    }
                    break;
                case "ENDPOINT" /* MessageType.ENDPOINT */:
                    {
                        const { port1, port2 } = new MessageChannel();
                        expose(obj, port2);
                        returnValue = transfer(port1, [port1]);
                    }
                    break;
                case "RELEASE" /* MessageType.RELEASE */:
                    {
                        returnValue = undefined;
                    }
                    break;
                default:
                    return;
            }
        }
        catch (value) {
            returnValue = { value, [throwMarker]: 0 };
        }
        Promise.resolve(returnValue)
            .catch((value) => {
            return { value, [throwMarker]: 0 };
        })
            .then((returnValue) => {
            const [wireValue, transferables] = toWireValue(returnValue);
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
            if (type === "RELEASE" /* MessageType.RELEASE */) {
                // detach and deactive after sending release response above.
                ep.removeEventListener("message", callback);
                closeEndPoint(ep);
                if (finalizer in obj && typeof obj[finalizer] === "function") {
                    obj[finalizer]();
                }
            }
        })
            .catch((error) => {
            // Send Serialization Error To Caller
            const [wireValue, transferables] = toWireValue({
                value: new TypeError("Unserializable return value"),
                [throwMarker]: 0,
            });
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
        });
    });
    if (ep.start) {
        ep.start();
    }
}
function isMessagePort(endpoint) {
    return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
    if (isMessagePort(endpoint))
        endpoint.close();
}
function wrap(ep, target) {
    const pendingListeners = new Map();
    ep.addEventListener("message", function handleMessage(ev) {
        const { data } = ev;
        if (!data || !data.id) {
            return;
        }
        const resolver = pendingListeners.get(data.id);
        if (!resolver) {
            return;
        }
        try {
            resolver(data);
        }
        finally {
            pendingListeners.delete(data.id);
        }
    });
    return createProxy(ep, pendingListeners, [], target);
}
function throwIfProxyReleased(isReleased) {
    if (isReleased) {
        throw new Error("Proxy has been released and is not useable");
    }
}
function releaseEndpoint(ep) {
    return requestResponseMessage(ep, new Map(), {
        type: "RELEASE" /* MessageType.RELEASE */,
    }).then(() => {
        closeEndPoint(ep);
    });
}
const proxyCounter = new WeakMap();
const proxyFinalizers = "FinalizationRegistry" in globalThis &&
    new FinalizationRegistry((ep) => {
        const newCount = (proxyCounter.get(ep) || 0) - 1;
        proxyCounter.set(ep, newCount);
        if (newCount === 0) {
            releaseEndpoint(ep);
        }
    });
function registerProxy(proxy, ep) {
    const newCount = (proxyCounter.get(ep) || 0) + 1;
    proxyCounter.set(ep, newCount);
    if (proxyFinalizers) {
        proxyFinalizers.register(proxy, ep, proxy);
    }
}
function unregisterProxy(proxy) {
    if (proxyFinalizers) {
        proxyFinalizers.unregister(proxy);
    }
}
function createProxy(ep, pendingListeners, path = [], target = function () { }) {
    let isProxyReleased = false;
    const proxy = new Proxy(target, {
        get(_target, prop) {
            throwIfProxyReleased(isProxyReleased);
            if (prop === releaseProxy) {
                return () => {
                    unregisterProxy(proxy);
                    releaseEndpoint(ep);
                    pendingListeners.clear();
                    isProxyReleased = true;
                };
            }
            if (prop === "then") {
                if (path.length === 0) {
                    return { then: () => proxy };
                }
                const r = requestResponseMessage(ep, pendingListeners, {
                    type: "GET" /* MessageType.GET */,
                    path: path.map((p) => p.toString()),
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, pendingListeners, [...path, prop]);
        },
        set(_target, prop, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
            // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, pendingListeners, {
                type: "SET" /* MessageType.SET */,
                path: [...path, prop].map((p) => p.toString()),
                value,
            }, transferables).then(fromWireValue);
        },
        apply(_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last = path[path.length - 1];
            if (last === createEndpoint) {
                return requestResponseMessage(ep, pendingListeners, {
                    type: "ENDPOINT" /* MessageType.ENDPOINT */,
                }).then(fromWireValue);
            }
            // We just pretend that `bind()` didn’t happen.
            if (last === "bind") {
                return createProxy(ep, pendingListeners, path.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, pendingListeners, {
                type: "APPLY" /* MessageType.APPLY */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
        construct(_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, pendingListeners, {
                type: "CONSTRUCT" /* MessageType.CONSTRUCT */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
    });
    registerProxy(proxy, ep);
    return proxy;
}
function myFlat(arr) {
    return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
    const processed = argumentList.map(toWireValue);
    return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
const transferCache = new WeakMap();
function transfer(obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
}
function proxy(obj) {
    return Object.assign(obj, { [proxyMarker]: true });
}
function windowEndpoint(w, context = globalThis, targetOrigin = "*") {
    return {
        postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
        addEventListener: context.addEventListener.bind(context),
        removeEventListener: context.removeEventListener.bind(context),
    };
}
function toWireValue(value) {
    for (const [name, handler] of transferHandlers) {
        if (handler.canHandle(value)) {
            const [serializedValue, transferables] = handler.serialize(value);
            return [
                {
                    type: "HANDLER" /* WireValueType.HANDLER */,
                    name,
                    value: serializedValue,
                },
                transferables,
            ];
        }
    }
    return [
        {
            type: "RAW" /* WireValueType.RAW */,
            value,
        },
        transferCache.get(value) || [],
    ];
}
function fromWireValue(value) {
    switch (value.type) {
        case "HANDLER" /* WireValueType.HANDLER */:
            return transferHandlers.get(value.name).deserialize(value.value);
        case "RAW" /* WireValueType.RAW */:
            return value.value;
    }
}
function requestResponseMessage(ep, pendingListeners, msg, transfers) {
    return new Promise((resolve) => {
        const id = generateUUID();
        pendingListeners.set(id, resolve);
        if (ep.start) {
            ep.start();
        }
        ep.postMessage(Object.assign({ id }, msg), transfers);
    });
}
function generateUUID() {
    return new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
        .join("-");
}


//# sourceMappingURL=comlink.mjs.map


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./src/processor.ts ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   normDefaults: () => (/* binding */ normDefaults),
/* harmony export */   normMaxRange: () => (/* binding */ normMaxRange),
/* harmony export */   typedArrayToStlDefaults: () => (/* binding */ typedArrayToStlDefaults)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! comlink */ "./node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _helpers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./helpers */ "./src/helpers.ts");


var typedArrayToStlDefaults = {
    width: 100,
    depth: 100,
    height: 10,
};
var normMaxRange = { from: -10929, to: 8848 };
var normDefaults = { from: null, to: null };
var processor = {
    normaliseTypedArray: function (inp, norm) {
        var bpe = 2;
        if (!Array.isArray(inp)) {
            if (inp instanceof Float32Array) {
                bpe = 2;
            }
            else {
                bpe = inp.BYTES_PER_ELEMENT;
            }
        }
        // For some reason, typescript does not think the reduce function as
        // used below is compatible with all typedarrays
        //@ts-ignore
        var max = (typeof norm.to === 'number') ? norm.to : inp.reduce(function (prev, cur) { return Math.max(prev, cur); }, 0);
        //@ts-ignore
        var min = (typeof norm.from === 'number') ? norm.from : inp.reduce(function (prev, cur) { return Math.min(prev, cur); }, max);
        var newMax = Math.pow(2, bpe * 8);
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
            if (a >= max)
                inp[index] = newMax;
            else if (a <= min)
                inp[index] = newMin;
            else
                inp[index] = (((a - min) / sub) * nsub + newMin);
        });
        return {
            data: inp,
            minBefore: min,
            maxBefore: max,
            minAfter: newMin,
            maxAfter: newMax,
        };
    },
    normaliseTypedArraySmart: function (inp, norm) {
        var bpe = 2;
        if (!Array.isArray(inp)) {
            if (inp instanceof Float32Array) {
                bpe = 2;
            }
            else {
                bpe = inp.BYTES_PER_ELEMENT;
            }
        }
        var n = inp.length;
        var numStdDeviations = 10;
        // For some reason, typescript does not think the reduce function as
        // used below is compatible with all typedarrays
        //@ts-ignore
        var mean = inp.reduce(function (a, b) { return a + b; }) / n;
        //@ts-ignore
        var stddev = Math.sqrt(inp.map(function (x) { return Math.pow(x - mean, 2); }).reduce(function (a, b) { return a + b; }) / n);
        //@ts-ignore
        var actualMax = inp.reduce(function (prev, cur) { return Math.max(prev, cur); }, 0);
        var max = (typeof norm.to === 'number') ? norm.to : Math.min(mean + stddev * numStdDeviations, actualMax);
        //@ts-ignore
        var actualMin = inp.reduce(function (prev, cur) { return Math.min(prev, cur); }, max);
        var min = (typeof norm.from === 'number') ? norm.from : Math.max(mean - stddev * numStdDeviations, actualMin);
        var newMax = Math.pow(2, bpe * 8);
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
            if (a >= max)
                inp[index] = newMax;
            else if (a <= min)
                inp[index] = newMin;
            else
                inp[index] = (((a - min) / sub) * nsub + newMin);
        });
        return {
            data: inp,
            minBefore: actualMin,
            maxBefore: actualMax,
            minAfter: newMin,
            maxAfter: newMax,
        };
    },
    normaliseTypedArraySmartWindow: function (inp, norm) {
        var bpe = 2;
        if (!Array.isArray(inp)) {
            if (inp instanceof Float32Array) {
                bpe = 2;
            }
            else {
                bpe = inp.BYTES_PER_ELEMENT;
            }
        }
        var n = inp.length;
        var numStdDeviations = 10;
        // For some reason, typescript does not think the reduce function as
        // used below is compatible with all typedarrays
        //@ts-ignore
        var mean = inp.reduce(function (a, b) { return a + b; }) / n;
        //@ts-ignore
        var stddev = Math.sqrt(inp.map(function (x) { return Math.pow(x - mean, 2); }).reduce(function (a, b) { return a + b; }) / n);
        var exclude = 0.0005;
        var copy = inp.slice(0);
        copy.sort();
        var offset = Math.ceil(copy.length * exclude);
        var length = Math.floor(copy.length * (1 - exclude * 2));
        var windowedCopy = copy.subarray(offset, length);
        //@ts-ignore
        var actualMax = copy[copy.length - 1];
        var windowedMax = windowedCopy[windowedCopy.length - 1];
        //@ts-ignore
        var actualMin = copy[0];
        var windowedMin = windowedCopy[0];
        var max = (typeof norm.to === 'number') ? norm.to : (windowedMax + stddev) > actualMax ? actualMax : windowedMax;
        var min = (typeof norm.from === 'number') ? norm.from : (windowedMin - stddev) < actualMin ? actualMin : windowedMin;
        var newMax = Math.pow(2, bpe * 8) - 1;
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
            if (a >= max)
                inp[index] = newMax;
            else if (a <= min)
                inp[index] = newMin;
            else
                inp[index] = (((a - min) / sub) * nsub + newMin);
        });
        return {
            data: inp,
            minBefore: min,
            maxBefore: max,
            minAfter: newMin,
            maxAfter: newMax,
        };
    },
    combineImages: function (states, normaliseMode, norm, progress) {
        if (normaliseMode === void 0) { normaliseMode = _helpers__WEBPACK_IMPORTED_MODULE_1__.NormaliseMode.Regular; }
        if (norm === void 0) { norm = normDefaults; }
        var area = states[0].width * states[0].height;
        var output = new Float32Array(area);
        var tileWidth = 256;
        var increment = 1 / tileWidth;
        var reportProgress = function (phase, completed, total) {
            if (typeof progress === 'function') {
                progress({ phase: phase, completed: completed, total: total });
            }
        };
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
        var totalRows = states[0].height || 0;
        var rowInterval = Math.max(1, Math.floor(totalRows / 50));
        var processedRows = 0;
        var i = 0;
        for (var y = extent.y1; y < extent.y2; y += increment) {
            for (var x = extent.x1; x < extent.x2; x += increment) {
                var tile = {
                    x: Math.floor(x),
                    y: Math.floor(y)
                };
                var px = {
                    x: Math.floor((x % 1) * tileWidth),
                    y: Math.floor((y % 1) * tileWidth)
                };
                var idx = px.y * tileWidth + px.x;
                if (typeof map[tile.x] === 'undefined') {
                    throw new Error("x value ".concat(tile.x, " was undefined"));
                }
                else if (typeof map[tile.x][tile.y] === 'undefined') {
                    throw new Error("y value ".concat(tile.y, " was undefined"));
                }
                else {
                    output[i++] = map[tile.x][tile.y].heights[idx];
                }
            }
            processedRows++;
            if (processedRows % rowInterval === 0 || processedRows === totalRows) {
                reportProgress('stitch', processedRows, Math.max(1, totalRows));
            }
        }
        var result = {
            data: output,
            minBefore: Math.pow(2, 32),
            maxBefore: 0,
            minAfter: Math.pow(2, 32),
            maxAfter: 0,
        };
        reportProgress('normalise', 0, 1);
        if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_1__.NormaliseMode.Regular ||
            (typeof norm.from == 'number' &&
                typeof norm.to == 'number')) {
            result = this.normaliseTypedArray(output, norm);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_1__.NormaliseMode.Smart) {
            result = this.normaliseTypedArraySmart(output, norm);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_1__.NormaliseMode.SmartWindow) {
            result = this.normaliseTypedArraySmartWindow(output, norm);
        }
        else {
            for (var i_1 = 0; i_1 < output.length; i_1++) {
                result.maxAfter = Math.max(output[i_1], result.maxAfter);
                result.minAfter = Math.min(output[i_1], result.minAfter);
            }
            result.maxBefore = result.maxAfter;
            result.minBefore = result.minAfter;
        }
        reportProgress('normalise', 1, 1);
        return result;
    },
    typedArrayToStl: function (points, widthpx, heightpx, _a) {
        var _b = _a === void 0 ? typedArrayToStlDefaults : _a, width = _b.width, depth = _b.depth, height = _b.height;
        var dataLength = ((widthpx) * (heightpx)) * 50;
        console.log(points.length, dataLength);
        var size = 80 + 4 + dataLength;
        var result = new ArrayBuffer(dataLength);
        var dv = new DataView(result);
        dv.setUint32(80, (widthpx - 1) * (heightpx - 1), true);
        //@ts-ignore
        var max = points.reduce(function (acc, point) { return Math.max(point, acc); }, 0);
        var o = function (x, y) { return (y * widthpx) + x; };
        var n = function (p1, p2, p3) {
            var A = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
            var B = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
            return [
                A[1] * B[2] - A[2] * B[1],
                A[2] * B[0] - A[0] * B[2],
                A[0] * B[1] - A[1] * B[0]
            ];
        };
        var pt = function (tris, off) {
            tris.flat().forEach(function (flt, i) {
                dv.setFloat32(off + (i * 4), flt, true);
            });
            // dv.setUint16(off+48, 0, true);
        };
        var off = 84;
        for (var x = 0; x < (widthpx - 1); x += 2) {
            for (var y = 0; y < (heightpx - 1); y++) {
                var tri1 = [
                    [0, 0, 0],
                    [x, y, points[o(x, y)] / max],
                    [x + 1, y, points[o(x + 1, y)] / max],
                    [x, y + 1, points[o(x, y + 1)] / max], // v3
                ];
                // tri1[0] = n(tri1[1], tri1[2], tri1[3]);
                pt(tri1, off);
                off += 50;
                var tri2 = [
                    [0, 0, 0],
                    [x + 1, y, points[o(x + 1, y)] / max],
                    [x + 1, y + 1, points[o(x + 1, y + 1)] / max],
                    [x, y + 1, points[o(x, y + 1)] / max], // v3
                ];
                // tri2[0] = n(tri2[1], tri2[2], tri2[3]);
                pt(tri2, off);
                off += 50;
            }
        }
        return result;
    }
};
comlink__WEBPACK_IMPORTED_MODULE_0__.expose(processor);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LENBQUMsR0FBQyxDQUFDLEVBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQztvQkFDaEMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQztvQkFDbEMsQ0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLO2lCQUN4QyxDQUFDO2dCQUNGLDBDQUEwQztnQkFDMUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDZCxHQUFHLElBQUksRUFBRSxDQUFDO2FBQ1g7U0FDRjtRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQUlELDJDQUFjLENBQUMsU0FBUyxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL3NyYy9oZWxwZXJzLnRzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyLy4vbm9kZV9tb2R1bGVzL2NvbWxpbmsvZGlzdC9lc20vY29tbGluay5tanMiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL3NyYy9wcm9jZXNzb3IudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGZvcm1hdCA9IChzdHIgOiBzdHJpbmcsIG9iaiA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ3xudW1iZXI+KSA6IHN0cmluZyA9PiB7XHJcbiAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9iaikpIHtcclxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKGB7JHtrZXl9fWAsIHZhbHVlLnRvU3RyaW5nKCkpO1xyXG4gIH1cclxuICByZXR1cm4gc3RyO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVHlwZWRBcnJheSA9XHJcbiAgfCBJbnQ4QXJyYXlcclxuICB8IFVpbnQ4QXJyYXlcclxuICB8IFVpbnQ4Q2xhbXBlZEFycmF5XHJcbiAgfCBJbnQxNkFycmF5XHJcbiAgfCBVaW50MTZBcnJheVxyXG4gIHwgSW50MzJBcnJheVxyXG4gIHwgVWludDMyQXJyYXlcclxuICB8IEZsb2F0MzJBcnJheVxyXG4gIHwgRmxvYXQ2NEFycmF5O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaWxlQ29vcmRzIHtcclxuICB4OiBudW1iZXIsXHJcbiAgeTogbnVtYmVyLFxyXG4gIHo6IG51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgTGF0TG5nIHtcclxuICBsYXRpdHVkZTogbnVtYmVyLFxyXG4gIGxvbmdpdHVkZTogbnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBMYXRMbmdab29tIGV4dGVuZHMgTGF0TG5nIHtcclxuICB6b29tOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29uZmlnU3RhdGUgPSBUaWxlQ29vcmRzICYgTGF0TG5nWm9vbSAmIHtcclxuICB3aWR0aCA6IG51bWJlcixcclxuICBoZWlnaHQgOiBudW1iZXIsXHJcbiAgZXhhY3RQb3MgOiBUaWxlQ29vcmRzLFxyXG4gIHdpZHRoSW5UaWxlcyA6IG51bWJlcixcclxuICBoZWlnaHRJblRpbGVzIDogbnVtYmVyLFxyXG4gIHN0YXJ0eDogbnVtYmVyLFxyXG4gIHN0YXJ0eTogbnVtYmVyLFxyXG4gIGVuZHg6IG51bWJlcixcclxuICBlbmR5OiBudW1iZXIsXHJcbiAgc3RhdHVzOiBzdHJpbmcsXHJcbiAgYm91bmRzOiBbTGF0TG5nLCBMYXRMbmddLFxyXG4gIHBoeXM6IHt3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcn0sXHJcbiAgbWluOiB7eTogbnVtYmVyLCB4OiBudW1iZXJ9LFxyXG4gIG1heDoge3k6IG51bWJlciwgeDogbnVtYmVyfSxcclxuICB0eXBlOiAnYWxiZWRvJ3wnaGVpZ2h0bWFwJyxcclxuICB1cmw6IHN0cmluZyxcclxufTtcclxuXHJcbmltcG9ydCBQTkcgZnJvbSBcIi4vcG5nXCI7XHJcblxyXG5leHBvcnQgdHlwZSBUaWxlTG9hZFN0YXRlID0gQ29uZmlnU3RhdGUgJiB7eDogbnVtYmVyLCB5OiBudW1iZXIsIGhlaWdodHM6IEZsb2F0MzJBcnJheXxVaW50OEFycmF5LCBidWZmZXI6IEFycmF5QnVmZmVyfTtcclxuXHJcbmV4cG9ydCBlbnVtIE5vcm1hbGlzZU1vZGUge1xyXG4gIE9mZiA9IDAsXHJcbiAgUmVndWxhciA9IDEsXHJcbiAgU21hcnQgPSAyLFxyXG4gIFNtYXJ0V2luZG93ID0gMyxcclxuICBGaXhlZCA9IDQsXHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCByb2xsID0gKG51bTogbnVtYmVyLCBtaW46IG51bWJlciA9IDAsIG1heDogbnVtYmVyID0gMSkgID0+IG1vZFdpdGhOZWcobnVtIC0gbWluLCBtYXggLSBtaW4pICsgbWluO1xyXG5leHBvcnQgY29uc3QgbW9kV2l0aE5lZyA9ICAoeDogbnVtYmVyLCBtb2Q6IG51bWJlcikgPT4gKCh4ICUgbW9kKSArIG1vZCkgJSBtb2Q7XHJcbmV4cG9ydCBjb25zdCBjbGFtcCA9IChudW0gOiBudW1iZXIsIG1pbjogbnVtYmVyID0gMCwgbWF4OiBudW1iZXIgPSAxKSA9PiBNYXRoLm1heChtaW4sIE1hdGgubWluKG1heCwgbnVtKSk7XHJcblxyXG4vKipcclxuICogU2FtZSBhcyBQcm9taXNlLmFsbChpdGVtcy5tYXAoaXRlbSA9PiB0YXNrKGl0ZW0pKSksIGJ1dCBpdCB3YWl0cyBmb3JcclxuICogdGhlIGZpcnN0IHtiYXRjaFNpemV9IHByb21pc2VzIHRvIGZpbmlzaCBiZWZvcmUgc3RhcnRpbmcgdGhlIG5leHQgYmF0Y2guXHJcbiAqXHJcbiAqIEB0ZW1wbGF0ZSBBXHJcbiAqIEB0ZW1wbGF0ZSBCXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oQSk6IEJ9IHRhc2sgVGhlIHRhc2sgdG8gcnVuIGZvciBlYWNoIGl0ZW0uXHJcbiAqIEBwYXJhbSB7QVtdfSBpdGVtcyBBcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgdGFzayBmb3IgZWFjaCBjYWxsLlxyXG4gKiBAcGFyYW0ge2ludH0gYmF0Y2hTaXplXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPEJbXT59XHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbWlzZUFsbEluQmF0Y2hlczxULCBCPih0YXNrIDogKGl0ZW0gOiBUKSA9PiBQcm9taXNlPEI+fEIsIGl0ZW1zIDogVFtdLCBiYXRjaFNpemUgOiBudW1iZXIsIHRvIDogbnVtYmVyID0gMCkgOiBQcm9taXNlPEJbXT4ge1xyXG4gICAgbGV0IHBvc2l0aW9uID0gMDtcclxuICAgIGxldCByZXN1bHRzIDogQltdID0gW107XHJcbiAgICB3aGlsZSAocG9zaXRpb24gPCBpdGVtcy5sZW5ndGgpIHtcclxuICAgICAgICBjb25zdCBpdGVtc0ZvckJhdGNoID0gaXRlbXMuc2xpY2UocG9zaXRpb24sIHBvc2l0aW9uICsgYmF0Y2hTaXplKTtcclxuICAgICAgICByZXN1bHRzID0gWy4uLnJlc3VsdHMsIC4uLmF3YWl0IFByb21pc2UuYWxsKGl0ZW1zRm9yQmF0Y2gubWFwKGl0ZW0gPT4gdGFzayhpdGVtKSkpXTtcclxuICAgICAgICBwb3NpdGlvbiArPSBiYXRjaFNpemU7XHJcbiAgICAgICAgaWYgKHRvID4gMCkge1xyXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgdG8pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJvdW5kRGlnaXRzKG51bSA6IG51bWJlciwgc2NhbGUgOiBudW1iZXIpIDogbnVtYmVyIHtcclxuICBpZighKFwiXCIgKyBudW0pLmluY2x1ZGVzKFwiZVwiKSkge1xyXG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZChwYXJzZUZsb2F0KG51bSArIFwiZStcIiArIHNjYWxlKSkgICsgXCJlLVwiICsgc2NhbGUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgYXJyID0gKFwiXCIgKyBudW0pLnNwbGl0KFwiZVwiKTtcclxuICAgIHZhciBzaWcgPSBcIlwiXHJcbiAgICBpZigrYXJyWzFdICsgc2NhbGUgPiAwKSB7XHJcbiAgICAgIHNpZyA9IFwiK1wiO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZChwYXJzZUZsb2F0KCthcnJbMF0gKyBcImVcIiArIHNpZyArICgrYXJyWzFdICsgc2NhbGUpKSkgKyBcImUtXCIgKyBzY2FsZSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9jYWxGb3JtYXROdW1iZXIobnVtIDogbnVtYmVyLCBzY2FsZSA6IG51bWJlcikgOiBzdHJpbmcge1xyXG4gIHJldHVybiByb3VuZERpZ2l0cyhudW0sIHNjYWxlKS50b0xvY2FsZVN0cmluZygpO1xyXG59IiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcbiAqL1xuY29uc3QgcHJveHlNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnByb3h5XCIpO1xuY29uc3QgY3JlYXRlRW5kcG9pbnQgPSBTeW1ib2woXCJDb21saW5rLmVuZHBvaW50XCIpO1xuY29uc3QgcmVsZWFzZVByb3h5ID0gU3ltYm9sKFwiQ29tbGluay5yZWxlYXNlUHJveHlcIik7XG5jb25zdCBmaW5hbGl6ZXIgPSBTeW1ib2woXCJDb21saW5rLmZpbmFsaXplclwiKTtcbmNvbnN0IHRocm93TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay50aHJvd25cIik7XG5jb25zdCBpc09iamVjdCA9ICh2YWwpID0+ICh0eXBlb2YgdmFsID09PSBcIm9iamVjdFwiICYmIHZhbCAhPT0gbnVsbCkgfHwgdHlwZW9mIHZhbCA9PT0gXCJmdW5jdGlvblwiO1xuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGUgdG8gaGFuZGxlIG9iamVjdHMgbWFya2VkIHRvIHByb3h5LlxuICovXG5jb25zdCBwcm94eVRyYW5zZmVySGFuZGxlciA9IHtcbiAgICBjYW5IYW5kbGU6ICh2YWwpID0+IGlzT2JqZWN0KHZhbCkgJiYgdmFsW3Byb3h5TWFya2VyXSxcbiAgICBzZXJpYWxpemUob2JqKSB7XG4gICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDEpO1xuICAgICAgICByZXR1cm4gW3BvcnQyLCBbcG9ydDJdXTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplKHBvcnQpIHtcbiAgICAgICAgcG9ydC5zdGFydCgpO1xuICAgICAgICByZXR1cm4gd3JhcChwb3J0KTtcbiAgICB9LFxufTtcbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlciB0byBoYW5kbGUgdGhyb3duIGV4Y2VwdGlvbnMuXG4gKi9cbmNvbnN0IHRocm93VHJhbnNmZXJIYW5kbGVyID0ge1xuICAgIGNhbkhhbmRsZTogKHZhbHVlKSA9PiBpc09iamVjdCh2YWx1ZSkgJiYgdGhyb3dNYXJrZXIgaW4gdmFsdWUsXG4gICAgc2VyaWFsaXplKHsgdmFsdWUgfSkge1xuICAgICAgICBsZXQgc2VyaWFsaXplZDtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHNlcmlhbGl6ZWQgPSB7XG4gICAgICAgICAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiB2YWx1ZS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBzdGFjazogdmFsdWUuc3RhY2ssXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZXJpYWxpemVkID0geyBpc0Vycm9yOiBmYWxzZSwgdmFsdWUgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3NlcmlhbGl6ZWQsIFtdXTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplKHNlcmlhbGl6ZWQpIHtcbiAgICAgICAgaWYgKHNlcmlhbGl6ZWQuaXNFcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3Ioc2VyaWFsaXplZC52YWx1ZS5tZXNzYWdlKSwgc2VyaWFsaXplZC52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgc2VyaWFsaXplZC52YWx1ZTtcbiAgICB9LFxufTtcbi8qKlxuICogQWxsb3dzIGN1c3RvbWl6aW5nIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzLlxuICovXG5jb25zdCB0cmFuc2ZlckhhbmRsZXJzID0gbmV3IE1hcChbXG4gICAgW1wicHJveHlcIiwgcHJveHlUcmFuc2ZlckhhbmRsZXJdLFxuICAgIFtcInRocm93XCIsIHRocm93VHJhbnNmZXJIYW5kbGVyXSxcbl0pO1xuZnVuY3Rpb24gaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBvcmlnaW4pIHtcbiAgICBmb3IgKGNvbnN0IGFsbG93ZWRPcmlnaW4gb2YgYWxsb3dlZE9yaWdpbnMpIHtcbiAgICAgICAgaWYgKG9yaWdpbiA9PT0gYWxsb3dlZE9yaWdpbiB8fCBhbGxvd2VkT3JpZ2luID09PSBcIipcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93ZWRPcmlnaW4gaW5zdGFuY2VvZiBSZWdFeHAgJiYgYWxsb3dlZE9yaWdpbi50ZXN0KG9yaWdpbikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGV4cG9zZShvYmosIGVwID0gZ2xvYmFsVGhpcywgYWxsb3dlZE9yaWdpbnMgPSBbXCIqXCJdKSB7XG4gICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gY2FsbGJhY2soZXYpIHtcbiAgICAgICAgaWYgKCFldiB8fCAhZXYuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBldi5vcmlnaW4pKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEludmFsaWQgb3JpZ2luICcke2V2Lm9yaWdpbn0nIGZvciBjb21saW5rIHByb3h5YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBpZCwgdHlwZSwgcGF0aCB9ID0gT2JqZWN0LmFzc2lnbih7IHBhdGg6IFtdIH0sIGV2LmRhdGEpO1xuICAgICAgICBjb25zdCBhcmd1bWVudExpc3QgPSAoZXYuZGF0YS5hcmd1bWVudExpc3QgfHwgW10pLm1hcChmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgbGV0IHJldHVyblZhbHVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gcGF0aC5zbGljZSgwLCAtMSkucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gcGF0aC5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkdFVFwiIC8qIE1lc3NhZ2VUeXBlLkdFVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiU0VUXCIgLyogTWVzc2FnZVR5cGUuU0VUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRbcGF0aC5zbGljZSgtMSlbMF1dID0gZnJvbVdpcmVWYWx1ZShldi5kYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiQVBQTFlcIiAvKiBNZXNzYWdlVHlwZS5BUFBMWSAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZS5hcHBseShwYXJlbnQsIGFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkNPTlNUUlVDVFwiIC8qIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgcmF3VmFsdWUoLi4uYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcHJveHkodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJFTkRQT0lOVFwiIC8qIE1lc3NhZ2VUeXBlLkVORFBPSU5UICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvc2Uob2JqLCBwb3J0Mik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRyYW5zZmVyKHBvcnQxLCBbcG9ydDFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFByb21pc2UucmVzb2x2ZShyZXR1cm5WYWx1ZSlcbiAgICAgICAgICAgIC5jYXRjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbigocmV0dXJuVmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmV0dXJuVmFsdWUpO1xuICAgICAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB3aXJlVmFsdWUpLCB7IGlkIH0pLCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09PSBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovKSB7XG4gICAgICAgICAgICAgICAgLy8gZGV0YWNoIGFuZCBkZWFjdGl2ZSBhZnRlciBzZW5kaW5nIHJlbGVhc2UgcmVzcG9uc2UgYWJvdmUuXG4gICAgICAgICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgICAgICAgICAgICAgIGlmIChmaW5hbGl6ZXIgaW4gb2JqICYmIHR5cGVvZiBvYmpbZmluYWxpemVyXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9ialtmaW5hbGl6ZXJdKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgLy8gU2VuZCBTZXJpYWxpemF0aW9uIEVycm9yIFRvIENhbGxlclxuICAgICAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZSh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUeXBlRXJyb3IoXCJVbnNlcmlhbGl6YWJsZSByZXR1cm4gdmFsdWVcIiksXG4gICAgICAgICAgICAgICAgW3Rocm93TWFya2VyXTogMCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB3aXJlVmFsdWUpLCB7IGlkIH0pLCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICAgIGVwLnN0YXJ0KCk7XG4gICAgfVxufVxuZnVuY3Rpb24gaXNNZXNzYWdlUG9ydChlbmRwb2ludCkge1xuICAgIHJldHVybiBlbmRwb2ludC5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk1lc3NhZ2VQb3J0XCI7XG59XG5mdW5jdGlvbiBjbG9zZUVuZFBvaW50KGVuZHBvaW50KSB7XG4gICAgaWYgKGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpKVxuICAgICAgICBlbmRwb2ludC5jbG9zZSgpO1xufVxuZnVuY3Rpb24gd3JhcChlcCwgdGFyZ2V0KSB7XG4gICAgY29uc3QgcGVuZGluZ0xpc3RlbmVycyA9IG5ldyBNYXAoKTtcbiAgICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBoYW5kbGVNZXNzYWdlKGV2KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gZXY7XG4gICAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5pZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc29sdmVyID0gcGVuZGluZ0xpc3RlbmVycy5nZXQoZGF0YS5pZCk7XG4gICAgICAgIGlmICghcmVzb2x2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzb2x2ZXIoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICBwZW5kaW5nTGlzdGVuZXJzLmRlbGV0ZShkYXRhLmlkKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgcGVuZGluZ0xpc3RlbmVycywgW10sIHRhcmdldCk7XG59XG5mdW5jdGlvbiB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1JlbGVhc2VkKSB7XG4gICAgaWYgKGlzUmVsZWFzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJveHkgaGFzIGJlZW4gcmVsZWFzZWQgYW5kIGlzIG5vdCB1c2VhYmxlXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJlbGVhc2VFbmRwb2ludChlcCkge1xuICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBuZXcgTWFwKCksIHtcbiAgICAgICAgdHlwZTogXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLyxcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgY2xvc2VFbmRQb2ludChlcCk7XG4gICAgfSk7XG59XG5jb25zdCBwcm94eUNvdW50ZXIgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgcHJveHlGaW5hbGl6ZXJzID0gXCJGaW5hbGl6YXRpb25SZWdpc3RyeVwiIGluIGdsb2JhbFRoaXMgJiZcbiAgICBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKGVwKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApIC0gMTtcbiAgICAgICAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICAgICAgICBpZiAobmV3Q291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgIH1cbiAgICB9KTtcbmZ1bmN0aW9uIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKSB7XG4gICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgKyAxO1xuICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgICAgIHByb3h5RmluYWxpemVycy5yZWdpc3Rlcihwcm94eSwgZXAsIHByb3h5KTtcbiAgICB9XG59XG5mdW5jdGlvbiB1bnJlZ2lzdGVyUHJveHkocHJveHkpIHtcbiAgICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgICAgIHByb3h5RmluYWxpemVycy51bnJlZ2lzdGVyKHByb3h5KTtcbiAgICB9XG59XG5mdW5jdGlvbiBjcmVhdGVQcm94eShlcCwgcGVuZGluZ0xpc3RlbmVycywgcGF0aCA9IFtdLCB0YXJnZXQgPSBmdW5jdGlvbiAoKSB7IH0pIHtcbiAgICBsZXQgaXNQcm94eVJlbGVhc2VkID0gZmFsc2U7XG4gICAgY29uc3QgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCB7XG4gICAgICAgIGdldChfdGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgaWYgKHByb3AgPT09IHJlbGVhc2VQcm94eSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJQcm94eShwcm94eSk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdMaXN0ZW5lcnMuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgaXNQcm94eVJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3AgPT09IFwidGhlblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRoZW46ICgpID0+IHByb3h5IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBwZW5kaW5nTGlzdGVuZXJzLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIgLyogTWVzc2FnZVR5cGUuR0VUICovLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByLnRoZW4uYmluZChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgcGVuZGluZ0xpc3RlbmVycywgWy4uLnBhdGgsIHByb3BdKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0KF90YXJnZXQsIHByb3AsIHJhd1ZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgLy8gRklYTUU6IEVTNiBQcm94eSBIYW5kbGVyIGBzZXRgIG1ldGhvZHMgYXJlIHN1cHBvc2VkIHRvIHJldHVybiBhXG4gICAgICAgICAgICAvLyBib29sZWFuLiBUbyBzaG93IGdvb2Qgd2lsbCwgd2UgcmV0dXJuIHRydWUgYXN5bmNocm9ub3VzbHkgwq9cXF8o44OEKV8vwq9cbiAgICAgICAgICAgIGNvbnN0IFt2YWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyYXdWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwgcGVuZGluZ0xpc3RlbmVycywge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiU0VUXCIgLyogTWVzc2FnZVR5cGUuU0VUICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IFsuLi5wYXRoLCBwcm9wXS5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBhcHBseShfdGFyZ2V0LCBfdGhpc0FyZywgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgY29uc3QgbGFzdCA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChsYXN0ID09PSBjcmVhdGVFbmRwb2ludCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBwZW5kaW5nTGlzdGVuZXJzLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiRU5EUE9JTlRcIiAvKiBNZXNzYWdlVHlwZS5FTkRQT0lOVCAqLyxcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gV2UganVzdCBwcmV0ZW5kIHRoYXQgYGJpbmQoKWAgZGlkbuKAmXQgaGFwcGVuLlxuICAgICAgICAgICAgaWYgKGxhc3QgPT09IFwiYmluZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBwZW5kaW5nTGlzdGVuZXJzLCBwYXRoLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBwZW5kaW5nTGlzdGVuZXJzLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJBUFBMWVwiIC8qIE1lc3NhZ2VUeXBlLkFQUExZICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnN0cnVjdChfdGFyZ2V0LCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBwZW5kaW5nTGlzdGVuZXJzLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJDT05TVFJVQ1RcIiAvKiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICB9KTtcbiAgICByZWdpc3RlclByb3h5KHByb3h5LCBlcCk7XG4gICAgcmV0dXJuIHByb3h5O1xufVxuZnVuY3Rpb24gbXlGbGF0KGFycikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBhcnIpO1xufVxuZnVuY3Rpb24gcHJvY2Vzc0FyZ3VtZW50cyhhcmd1bWVudExpc3QpIHtcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBhcmd1bWVudExpc3QubWFwKHRvV2lyZVZhbHVlKTtcbiAgICByZXR1cm4gW3Byb2Nlc3NlZC5tYXAoKHYpID0+IHZbMF0pLCBteUZsYXQocHJvY2Vzc2VkLm1hcCgodikgPT4gdlsxXSkpXTtcbn1cbmNvbnN0IHRyYW5zZmVyQ2FjaGUgPSBuZXcgV2Vha01hcCgpO1xuZnVuY3Rpb24gdHJhbnNmZXIob2JqLCB0cmFuc2ZlcnMpIHtcbiAgICB0cmFuc2ZlckNhY2hlLnNldChvYmosIHRyYW5zZmVycyk7XG4gICAgcmV0dXJuIG9iajtcbn1cbmZ1bmN0aW9uIHByb3h5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgeyBbcHJveHlNYXJrZXJdOiB0cnVlIH0pO1xufVxuZnVuY3Rpb24gd2luZG93RW5kcG9pbnQodywgY29udGV4dCA9IGdsb2JhbFRoaXMsIHRhcmdldE9yaWdpbiA9IFwiKlwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcG9zdE1lc3NhZ2U6IChtc2csIHRyYW5zZmVyYWJsZXMpID0+IHcucG9zdE1lc3NhZ2UobXNnLCB0YXJnZXRPcmlnaW4sIHRyYW5zZmVyYWJsZXMpLFxuICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogY29udGV4dC5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRvV2lyZVZhbHVlKHZhbHVlKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgaGFuZGxlcl0gb2YgdHJhbnNmZXJIYW5kbGVycykge1xuICAgICAgICBpZiAoaGFuZGxlci5jYW5IYW5kbGUodmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBbc2VyaWFsaXplZFZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IGhhbmRsZXIuc2VyaWFsaXplKHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkhBTkRMRVJcIiAvKiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIgKi8sXG4gICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzZXJpYWxpemVkVmFsdWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0cmFuc2ZlcmFibGVzLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBcIlJBV1wiIC8qIFdpcmVWYWx1ZVR5cGUuUkFXICovLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyQ2FjaGUuZ2V0KHZhbHVlKSB8fCBbXSxcbiAgICBdO1xufVxuZnVuY3Rpb24gZnJvbVdpcmVWYWx1ZSh2YWx1ZSkge1xuICAgIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgICAgICBjYXNlIFwiSEFORExFUlwiIC8qIFdpcmVWYWx1ZVR5cGUuSEFORExFUiAqLzpcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2ZlckhhbmRsZXJzLmdldCh2YWx1ZS5uYW1lKS5kZXNlcmlhbGl6ZSh2YWx1ZS52YWx1ZSk7XG4gICAgICAgIGNhc2UgXCJSQVdcIiAvKiBXaXJlVmFsdWVUeXBlLlJBVyAqLzpcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS52YWx1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBwZW5kaW5nTGlzdGVuZXJzLCBtc2csIHRyYW5zZmVycykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgICAgICBwZW5kaW5nTGlzdGVuZXJzLnNldChpZCwgcmVzb2x2ZSk7XG4gICAgICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgICAgICAgZXAuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKHsgaWQgfSwgbXNnKSwgdHJhbnNmZXJzKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpIHtcbiAgICByZXR1cm4gbmV3IEFycmF5KDQpXG4gICAgICAgIC5maWxsKDApXG4gICAgICAgIC5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpLnRvU3RyaW5nKDE2KSlcbiAgICAgICAgLmpvaW4oXCItXCIpO1xufVxuXG5leHBvcnQgeyBjcmVhdGVFbmRwb2ludCwgZXhwb3NlLCBmaW5hbGl6ZXIsIHByb3h5LCBwcm94eU1hcmtlciwgcmVsZWFzZVByb3h5LCB0cmFuc2ZlciwgdHJhbnNmZXJIYW5kbGVycywgd2luZG93RW5kcG9pbnQsIHdyYXAgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbWxpbmsubWpzLm1hcFxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRpZiAoIShtb2R1bGVJZCBpbiBfX3dlYnBhY2tfbW9kdWxlc19fKSkge1xuXHRcdGRlbGV0ZSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRcdHZhciBlID0gbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIiArIG1vZHVsZUlkICsgXCInXCIpO1xuXHRcdGUuY29kZSA9ICdNT0RVTEVfTk9UX0ZPVU5EJztcblx0XHR0aHJvdyBlO1xuXHR9XG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCAqIGFzIENvbWxpbmsgZnJvbSBcImNvbWxpbmtcIjtcclxuXHJcbmltcG9ydCB7XHJcbiAgVHlwZWRBcnJheSxcclxuICBUaWxlQ29vcmRzLFxyXG4gIExhdExuZyxcclxuICBMYXRMbmdab29tLFxyXG4gIENvbmZpZ1N0YXRlLFxyXG4gIFRpbGVMb2FkU3RhdGUsXHJcbiAgTm9ybWFsaXNlTW9kZVxyXG4gIH0gZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuaW1wb3J0IFBORyBmcm9tIFwiLi9wbmdcIjtcclxuXHJcbmV4cG9ydCB0eXBlIE5vcm1hbGlzZVJlc3VsdDxUPiA9IHtcclxuICBkYXRhOiBULFxyXG4gIG1pbkJlZm9yZTogbnVtYmVyLFxyXG4gIG1heEJlZm9yZTogbnVtYmVyLFxyXG4gIG1pbkFmdGVyOiBudW1iZXIsXHJcbiAgbWF4QWZ0ZXI6IG51bWJlclxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgUHJvY2Vzc29yUHJvZ3Jlc3NQaGFzZSA9ICdzdGl0Y2gnIHwgJ25vcm1hbGlzZSc7XHJcblxyXG5leHBvcnQgdHlwZSBQcm9jZXNzb3JQcm9ncmVzc1VwZGF0ZSA9IHtcclxuICBwaGFzZTogUHJvY2Vzc29yUHJvZ3Jlc3NQaGFzZTtcclxuICBjb21wbGV0ZWQ6IG51bWJlcjtcclxuICB0b3RhbDogbnVtYmVyO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVHlwZWRBcnJheVRvU3RsQXJncyA9IHtcclxuICB3aWR0aCA6IG51bWJlcixcclxuICBkZXB0aCA6IG51bWJlcixcclxuICBoZWlnaHQ6IG51bWJlclxyXG59O1xyXG5leHBvcnQgY29uc3QgdHlwZWRBcnJheVRvU3RsRGVmYXVsdHMgOiBUeXBlZEFycmF5VG9TdGxBcmdzID0ge1xyXG4gIHdpZHRoIDogMTAwLFxyXG4gIGRlcHRoIDogMTAwLFxyXG4gIGhlaWdodCA6IDEwLFxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgdmVjMyA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcclxuZXhwb3J0IHR5cGUgdHJpdmVjMyA9IFt2ZWMzLCB2ZWMzLCB2ZWMzLCB2ZWMzXTtcclxuXHJcbmV4cG9ydCB0eXBlIE5vcm1SYW5nZSA9IHtmcm9tIDogbnVtYmVyfG51bGx8dW5kZWZpbmVkLCB0byA6IG51bWJlcnxudWxsfHVuZGVmaW5lZH07XHJcbmV4cG9ydCBjb25zdCBub3JtTWF4UmFuZ2UgOiBOb3JtUmFuZ2UgPSB7ZnJvbTogLTEwOTI5LCB0bzogODg0OH07XHJcbmV4cG9ydCBjb25zdCBub3JtRGVmYXVsdHMgOiBOb3JtUmFuZ2UgPSB7ZnJvbTogbnVsbCwgdG86IG51bGx9O1xyXG5cclxuY29uc3QgcHJvY2Vzc29yID0ge1xyXG4gIG5vcm1hbGlzZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXl8bnVtYmVyW10+KGlucCA6IFQsIG5vcm06IE5vcm1SYW5nZSkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1heChwcmV2LCBjdXIpLCAwKTtcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWluID0gKHR5cGVvZiBub3JtLmZyb20gPT09ICdudW1iZXInKSA/IG5vcm0uZnJvbSA6IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5taW4ocHJldiwgY3VyKSwgbWF4KTtcclxuICAgIGNvbnN0IG5ld01heCA9IE1hdGgucG93KDIsIGJwZSAqIDgpO1xyXG4gICAgY29uc3QgbmV3TWluID0gMDtcclxuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcclxuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XHJcbiAgICBjb25zdCBmYWN0b3IgPSBuZXdNYXgvKG1heCAtIHN1Yik7XHJcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xyXG4gICAgICBlbHNlIGlmIChhIDw9IG1pbikgaW5wW2luZGV4XSA9IG5ld01pbjtcclxuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IG1pbixcclxuICAgICAgbWF4QmVmb3JlOiBtYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgbm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBULCBub3JtOiBOb3JtUmFuZ2UpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxyXG5cclxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcclxuXHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1lYW4gPSBpbnAucmVkdWNlKChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA9PiBhICsgYikgLyBuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5tYXgocHJldiwgY3VyKSwgMCk7XHJcbiAgICBjb25zdCBtYXggPSAodHlwZW9mIG5vcm0udG8gPT09ICdudW1iZXInKSA/IG5vcm0udG8gOiBNYXRoLm1pbihtZWFuK3N0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1heCk7XHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1pbiA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5taW4ocHJldiwgY3VyKSwgbWF4KTtcclxuICAgIGNvbnN0IG1pbiA9ICh0eXBlb2Ygbm9ybS5mcm9tID09PSAnbnVtYmVyJykgPyBub3JtLmZyb20gOiBNYXRoLm1heChtZWFuLXN0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1pbik7XHJcblxyXG4gICAgY29uc3QgbmV3TWF4ID0gTWF0aC5wb3coMiwgYnBlICogOCk7XHJcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xyXG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xyXG4gICAgY29uc3QgbnN1YiA9IG5ld01heCAtIG5ld01pbjtcclxuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcclxuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBpZiAoYSA+PSBtYXgpIGlucFtpbmRleF0gPSBuZXdNYXg7XHJcbiAgICAgIGVsc2UgaWYgKGEgPD0gbWluKSBpbnBbaW5kZXhdID0gbmV3TWluO1xyXG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogYWN0dWFsTWluLFxyXG4gICAgICBtYXhCZWZvcmU6IGFjdHVhbE1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBub3JtYWxpc2VUeXBlZEFycmF5U21hcnRXaW5kb3c8VCBleHRlbmRzIFR5cGVkQXJyYXk+KGlucCA6IFQsIG5vcm06IE5vcm1SYW5nZSkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnN0IG4gPSBpbnAubGVuZ3RoXHJcblxyXG4gICAgY29uc3QgbnVtU3RkRGV2aWF0aW9ucyA9IDEwO1xyXG5cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWVhbiA9IGlucC5yZWR1Y2UoKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpID0+IGEgKyBiKSAvIG5cclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3Qgc3RkZGV2ID0gTWF0aC5zcXJ0KGlucC5tYXAoeCA9PiBNYXRoLnBvdyh4IC0gbWVhbiwgMikpLnJlZHVjZSgoYSwgYikgPT4gYSArIGIpIC8gbilcclxuXHJcbiAgICBjb25zdCBleGNsdWRlID0gMC4wMDA1O1xyXG4gICAgY29uc3QgY29weSA9IGlucC5zbGljZSgwKTtcclxuICAgIGNvcHkuc29ydCgpO1xyXG4gICAgY29uc3Qgb2Zmc2V0ID0gTWF0aC5jZWlsKGNvcHkubGVuZ3RoICogZXhjbHVkZSk7XHJcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmZsb29yKGNvcHkubGVuZ3RoICogKDEtZXhjbHVkZSoyKSk7XHJcbiAgICBjb25zdCB3aW5kb3dlZENvcHkgPSBjb3B5LnN1YmFycmF5KG9mZnNldCwgbGVuZ3RoKTtcclxuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGNvcHlbY29weS5sZW5ndGgtMV07XHJcbiAgICBjb25zdCB3aW5kb3dlZE1heCA9IHdpbmRvd2VkQ29weVt3aW5kb3dlZENvcHkubGVuZ3RoLTFdO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBjb3B5WzBdO1xyXG4gICAgY29uc3Qgd2luZG93ZWRNaW4gPSB3aW5kb3dlZENvcHlbMF07XHJcblxyXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogKHdpbmRvd2VkTWF4ICsgc3RkZGV2KSA+IGFjdHVhbE1heCA/IGFjdHVhbE1heCA6IHdpbmRvd2VkTWF4O1xyXG4gICAgY29uc3QgbWluID0gKHR5cGVvZiBub3JtLmZyb20gPT09ICdudW1iZXInKSA/IG5vcm0uZnJvbSA6ICh3aW5kb3dlZE1pbiAtIHN0ZGRldikgPCBhY3R1YWxNaW4gPyBhY3R1YWxNaW4gOiB3aW5kb3dlZE1pbjtcclxuXHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KS0xO1xyXG4gICAgY29uc3QgbmV3TWluID0gMDtcclxuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcclxuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XHJcbiAgICBjb25zdCBmYWN0b3IgPSBuZXdNYXgvKG1heCAtIHN1Yik7XHJcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xyXG4gICAgICBlbHNlIGlmIChhIDw9IG1pbikgaW5wW2luZGV4XSA9IG5ld01pbjtcclxuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IG1pbixcclxuICAgICAgbWF4QmVmb3JlOiBtYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29tYmluZUltYWdlcyhcclxuICAgIHN0YXRlcyA6IFRpbGVMb2FkU3RhdGVbXSxcclxuICAgIG5vcm1hbGlzZU1vZGUgOiBudW1iZXIgPSBOb3JtYWxpc2VNb2RlLlJlZ3VsYXIsXHJcbiAgICBub3JtIDogTm9ybVJhbmdlID0gbm9ybURlZmF1bHRzLFxyXG4gICAgcHJvZ3Jlc3M/OiAodXBkYXRlOiBQcm9jZXNzb3JQcm9ncmVzc1VwZGF0ZSkgPT4gdm9pZFxyXG4gICkgOiBOb3JtYWxpc2VSZXN1bHQ8RmxvYXQzMkFycmF5PiB7XHJcbiAgICBjb25zdCBhcmVhID0gc3RhdGVzWzBdLndpZHRoICogc3RhdGVzWzBdLmhlaWdodDtcclxuICAgIGxldCBvdXRwdXQgPSBuZXcgRmxvYXQzMkFycmF5KGFyZWEpO1xyXG4gICAgY29uc3QgdGlsZVdpZHRoID0gMjU2O1xyXG4gICAgY29uc3QgaW5jcmVtZW50ID0gMS90aWxlV2lkdGg7XHJcbiAgICBjb25zdCByZXBvcnRQcm9ncmVzcyA9IChwaGFzZTogUHJvY2Vzc29yUHJvZ3Jlc3NQaGFzZSwgY29tcGxldGVkOiBudW1iZXIsIHRvdGFsOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKHR5cGVvZiBwcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHByb2dyZXNzKHtwaGFzZSwgY29tcGxldGVkLCB0b3RhbH0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgY29uc3QgbWFwIDogUmVjb3JkPG51bWJlciwgUmVjb3JkPG51bWJlciwgVGlsZUxvYWRTdGF0ZT4+ID0ge307XHJcbiAgICBmb3IgKGxldCB0aWxlIG9mIHN0YXRlcykge1xyXG4gICAgICBpZiAoIW1hcFt0aWxlLnhdKSB7XHJcbiAgICAgICAgbWFwW3RpbGUueF0gPSB7fTtcclxuICAgICAgfVxyXG4gICAgICBtYXBbdGlsZS54XVt0aWxlLnldID0gdGlsZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBleHRlbnQgPSB7XHJcbiAgICAgIHgxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueCAtIHN0YXRlc1swXS53aWR0aEluVGlsZXMvMixcclxuICAgICAgeDI6IHN0YXRlc1swXS5leGFjdFBvcy54ICsgc3RhdGVzWzBdLndpZHRoSW5UaWxlcy8yLFxyXG4gICAgICB5MTogc3RhdGVzWzBdLmV4YWN0UG9zLnkgLSBzdGF0ZXNbMF0uaGVpZ2h0SW5UaWxlcy8yLFxyXG4gICAgICB5Mjogc3RhdGVzWzBdLmV4YWN0UG9zLnkgKyBzdGF0ZXNbMF0uaGVpZ2h0SW5UaWxlcy8yXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdG90YWxSb3dzID0gc3RhdGVzWzBdLmhlaWdodCB8fCAwO1xyXG4gICAgY29uc3Qgcm93SW50ZXJ2YWwgPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKHRvdGFsUm93cyAvIDUwKSk7XHJcbiAgICBsZXQgcHJvY2Vzc2VkUm93cyA9IDA7XHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBmb3IgKGxldCB5ID0gZXh0ZW50LnkxOyB5IDwgZXh0ZW50LnkyOyB5ICs9IGluY3JlbWVudCkge1xyXG4gICAgICBmb3IgKGxldCB4ID0gZXh0ZW50LngxOyB4IDwgZXh0ZW50LngyOyB4ICs9IGluY3JlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHRpbGUgPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKHgpLFxyXG4gICAgICAgICAgeTogTWF0aC5mbG9vcih5KVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgcHggPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKCh4JTEpKnRpbGVXaWR0aCksXHJcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKCh5JTEpKnRpbGVXaWR0aClcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IHB4LnkqdGlsZVdpZHRoICsgcHgueDtcclxuICAgICAgICBpZiAodHlwZW9mIG1hcFt0aWxlLnhdID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB4IHZhbHVlICR7dGlsZS54fSB3YXMgdW5kZWZpbmVkYCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbWFwW3RpbGUueF1bdGlsZS55XSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgeSB2YWx1ZSAke3RpbGUueX0gd2FzIHVuZGVmaW5lZGApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBvdXRwdXRbaSsrXSA9IG1hcFt0aWxlLnhdW3RpbGUueV0uaGVpZ2h0c1tpZHhdO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBwcm9jZXNzZWRSb3dzKys7XHJcbiAgICAgIGlmIChwcm9jZXNzZWRSb3dzICUgcm93SW50ZXJ2YWwgPT09IDAgfHwgcHJvY2Vzc2VkUm93cyA9PT0gdG90YWxSb3dzKSB7XHJcbiAgICAgICAgcmVwb3J0UHJvZ3Jlc3MoJ3N0aXRjaCcsIHByb2Nlc3NlZFJvd3MsIE1hdGgubWF4KDEsIHRvdGFsUm93cykpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBsZXQgcmVzdWx0ID0ge1xyXG4gICAgICBkYXRhOiBvdXRwdXQsXHJcbiAgICAgIG1pbkJlZm9yZTogTWF0aC5wb3coMiwgMzIpLFxyXG4gICAgICBtYXhCZWZvcmU6IDAsXHJcbiAgICAgIG1pbkFmdGVyOiBNYXRoLnBvdygyLCAzMiksXHJcbiAgICAgIG1heEFmdGVyOiAwLFxyXG4gICAgfTtcclxuICAgIHJlcG9ydFByb2dyZXNzKCdub3JtYWxpc2UnLCAwLCAxKTtcclxuICAgIGlmIChcclxuICAgICAgbm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlJlZ3VsYXIgfHxcclxuICAgICAgKFxyXG4gICAgICAgIHR5cGVvZiBub3JtLmZyb20gPT0gJ251bWJlcicgJiZcclxuICAgICAgICB0eXBlb2Ygbm9ybS50byA9PSAnbnVtYmVyJ1xyXG4gICAgICApXHJcbiAgICApIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5KG91dHB1dCwgbm9ybSk7XHJcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5TbWFydCkge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydChvdXRwdXQsIG5vcm0pO1xyXG4gICAgfSBlbHNlIGlmIChub3JtYWxpc2VNb2RlID09IE5vcm1hbGlzZU1vZGUuU21hcnRXaW5kb3cpIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5U21hcnRXaW5kb3cob3V0cHV0LCBub3JtKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcmVzdWx0Lm1heEFmdGVyID0gTWF0aC5tYXgob3V0cHV0W2ldLCByZXN1bHQubWF4QWZ0ZXIpO1xyXG4gICAgICAgIHJlc3VsdC5taW5BZnRlciA9IE1hdGgubWluKG91dHB1dFtpXSwgcmVzdWx0Lm1pbkFmdGVyKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQubWF4QmVmb3JlID0gcmVzdWx0Lm1heEFmdGVyO1xyXG4gICAgICByZXN1bHQubWluQmVmb3JlID0gcmVzdWx0Lm1pbkFmdGVyO1xyXG4gICAgfVxyXG4gICAgcmVwb3J0UHJvZ3Jlc3MoJ25vcm1hbGlzZScsIDEsIDEpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9LFxyXG4gIHR5cGVkQXJyYXlUb1N0bChcclxuICAgIHBvaW50czogVHlwZWRBcnJheSxcclxuICAgIHdpZHRocHggOiBudW1iZXIsXHJcbiAgICBoZWlnaHRweCA6IG51bWJlcixcclxuICAgIHt3aWR0aCwgZGVwdGgsIGhlaWdodH0gOiBUeXBlZEFycmF5VG9TdGxBcmdzID0gdHlwZWRBcnJheVRvU3RsRGVmYXVsdHNcclxuICApIDogQXJyYXlCdWZmZXIge1xyXG4gICAgY29uc3QgZGF0YUxlbmd0aCA9ICgod2lkdGhweCkgKiAoaGVpZ2h0cHgpKSAqIDUwO1xyXG4gICAgY29uc29sZS5sb2cocG9pbnRzLmxlbmd0aCwgZGF0YUxlbmd0aCk7XHJcbiAgICBjb25zdCBzaXplID0gODAgKyA0ICsgZGF0YUxlbmd0aDtcclxuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihkYXRhTGVuZ3RoKTtcclxuICAgIGNvbnN0IGR2ID0gbmV3IERhdGFWaWV3KHJlc3VsdCk7XHJcbiAgICBkdi5zZXRVaW50MzIoODAsICh3aWR0aHB4LTEpKihoZWlnaHRweC0xKSwgdHJ1ZSk7XHJcblxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtYXggPSBwb2ludHMucmVkdWNlKChhY2MsIHBvaW50KSA9PiBNYXRoLm1heChwb2ludCwgYWNjKSwgMCk7XHJcblxyXG4gICAgY29uc3QgbyA9ICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IG51bWJlciA9PiAoeSAqIHdpZHRocHgpICsgeDtcclxuICAgIGNvbnN0IG4gPSAocDEgOiB2ZWMzLCBwMiA6IHZlYzMsIHAzOiB2ZWMzKSA6IHZlYzMgPT4ge1xyXG4gICAgICBjb25zdCBBID0gW3AyWzBdIC0gcDFbMF0sIHAyWzFdIC0gcDFbMV0sIHAyWzJdIC0gcDFbMl1dO1xyXG4gICAgICBjb25zdCBCID0gW3AzWzBdIC0gcDFbMF0sIHAzWzFdIC0gcDFbMV0sIHAzWzJdIC0gcDFbMl1dO1xyXG4gICAgICByZXR1cm4gW1xyXG4gICAgICAgIEFbMV0gKiBCWzJdIC0gQVsyXSAqIEJbMV0sXHJcbiAgICAgICAgQVsyXSAqIEJbMF0gLSBBWzBdICogQlsyXSxcclxuICAgICAgICBBWzBdICogQlsxXSAtIEFbMV0gKiBCWzBdXHJcbiAgICAgIF1cclxuICAgIH1cclxuICAgIGNvbnN0IHB0ID0gKHRyaXMgOiB0cml2ZWMzLCBvZmYgOiBudW1iZXIpID0+IHtcclxuICAgICAgdHJpcy5mbGF0KCkuZm9yRWFjaCgoZmx0IDogbnVtYmVyLCBpIDogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgZHYuc2V0RmxvYXQzMihvZmYgKyAoaSAqIDQpLCBmbHQsIHRydWUpO1xyXG4gICAgICB9KTtcclxuICAgICAgLy8gZHYuc2V0VWludDE2KG9mZis0OCwgMCwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG9mZiA9IDg0O1xyXG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCAod2lkdGhweCAtIDEpOyB4ICs9IDIpIHtcclxuICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCAoaGVpZ2h0cHggLSAxKTsgeSsrKSB7XHJcbiAgICAgICAgY29uc3QgdHJpMSA6IHRyaXZlYzMgPSBbXHJcbiAgICAgICAgICBbMCwwLDBdLCAvLyBub3JtYWxcclxuICAgICAgICAgIFsgIHgsICAgeSwgcG9pbnRzW28oeCx5KV0vbWF4XSwgLy8gdjFcclxuICAgICAgICAgIFt4KzEsICAgeSwgcG9pbnRzW28oeCsxLHkpXS9tYXhdLCAvLyB2MlxyXG4gICAgICAgICAgWyAgeCwgeSsxLCBwb2ludHNbbyh4LHkrMSldL21heF0sIC8vIHYzXHJcbiAgICAgICAgXTtcclxuICAgICAgICAvLyB0cmkxWzBdID0gbih0cmkxWzFdLCB0cmkxWzJdLCB0cmkxWzNdKTtcclxuICAgICAgICBwdCh0cmkxLCBvZmYpO1xyXG4gICAgICAgIG9mZiArPSA1MDtcclxuXHJcbiAgICAgICAgY29uc3QgdHJpMiA6IHRyaXZlYzMgPSBbXHJcbiAgICAgICAgICBbMCwwLDBdLCAvLyBub3JtYWxcclxuICAgICAgICAgIFt4KzEsICAgeSwgcG9pbnRzW28oeCsxLHkpXS9tYXhdLCAvLyB2MVxyXG4gICAgICAgICAgW3grMSwgeSsxLCBwb2ludHNbbyh4KzEseSsxKV0vbWF4XSwgLy8gdjJcclxuICAgICAgICAgIFsgIHgsIHkrMSwgcG9pbnRzW28oeCx5KzEpXS9tYXhdLCAvLyB2M1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgLy8gdHJpMlswXSA9IG4odHJpMlsxXSwgdHJpMlsyXSwgdHJpMlszXSk7XHJcbiAgICAgICAgcHQodHJpMiwgb2ZmKTtcclxuICAgICAgICBvZmYgKz0gNTA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IHR5cGUgUHJvY2Vzc29yV29ya2VyID0gdHlwZW9mIHByb2Nlc3NvcjtcclxuXHJcbkNvbWxpbmsuZXhwb3NlKHByb2Nlc3Nvcik7Il0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9