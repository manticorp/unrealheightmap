/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/helpers.ts":
/*!************************!*\
  !*** ./src/helpers.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NormaliseMode": () => (/* binding */ NormaliseMode),
/* harmony export */   "clamp": () => (/* binding */ clamp),
/* harmony export */   "format": () => (/* binding */ format),
/* harmony export */   "modWithNeg": () => (/* binding */ modWithNeg),
/* harmony export */   "promiseAllInBatches": () => (/* binding */ promiseAllInBatches),
/* harmony export */   "roll": () => (/* binding */ roll)
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


/***/ }),

/***/ "./node_modules/comlink/dist/esm/comlink.mjs":
/*!***************************************************!*\
  !*** ./node_modules/comlink/dist/esm/comlink.mjs ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createEndpoint": () => (/* binding */ createEndpoint),
/* harmony export */   "expose": () => (/* binding */ expose),
/* harmony export */   "finalizer": () => (/* binding */ finalizer),
/* harmony export */   "proxy": () => (/* binding */ proxy),
/* harmony export */   "proxyMarker": () => (/* binding */ proxyMarker),
/* harmony export */   "releaseProxy": () => (/* binding */ releaseProxy),
/* harmony export */   "transfer": () => (/* binding */ transfer),
/* harmony export */   "transferHandlers": () => (/* binding */ transferHandlers),
/* harmony export */   "windowEndpoint": () => (/* binding */ windowEndpoint),
/* harmony export */   "wrap": () => (/* binding */ wrap)
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
    return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
    if (isReleased) {
        throw new Error("Proxy has been released and is not useable");
    }
}
function releaseEndpoint(ep) {
    return requestResponseMessage(ep, {
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
function createProxy(ep, path = [], target = function () { }) {
    let isProxyReleased = false;
    const proxy = new Proxy(target, {
        get(_target, prop) {
            throwIfProxyReleased(isProxyReleased);
            if (prop === releaseProxy) {
                return () => {
                    unregisterProxy(proxy);
                    releaseEndpoint(ep);
                    isProxyReleased = true;
                };
            }
            if (prop === "then") {
                if (path.length === 0) {
                    return { then: () => proxy };
                }
                const r = requestResponseMessage(ep, {
                    type: "GET" /* MessageType.GET */,
                    path: path.map((p) => p.toString()),
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, [...path, prop]);
        },
        set(_target, prop, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
            // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, {
                type: "SET" /* MessageType.SET */,
                path: [...path, prop].map((p) => p.toString()),
                value,
            }, transferables).then(fromWireValue);
        },
        apply(_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last = path[path.length - 1];
            if (last === createEndpoint) {
                return requestResponseMessage(ep, {
                    type: "ENDPOINT" /* MessageType.ENDPOINT */,
                }).then(fromWireValue);
            }
            // We just pretend that `bind()` didn’t happen.
            if (last === "bind") {
                return createProxy(ep, path.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "APPLY" /* MessageType.APPLY */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
        construct(_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
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
function requestResponseMessage(ep, msg, transfers) {
    return new Promise((resolve) => {
        const id = generateUUID();
        ep.addEventListener("message", function l(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id) {
                return;
            }
            ep.removeEventListener("message", l);
            resolve(ev.data);
        });
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


/***/ })

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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./src/processor.ts ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "normDefaults": () => (/* binding */ normDefaults),
/* harmony export */   "normMaxRange": () => (/* binding */ normMaxRange),
/* harmony export */   "typedArrayToStlDefaults": () => (/* binding */ typedArrayToStlDefaults)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "./node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _helpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helpers */ "./src/helpers.ts");


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
    combineImages: function (states, normaliseMode, norm) {
        if (normaliseMode === void 0) { normaliseMode = _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular; }
        if (norm === void 0) { norm = normDefaults; }
        var area = states[0].width * states[0].height;
        var output = new Float32Array(area);
        var tileWidth = 256;
        var increment = 1 / tileWidth;
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
        }
        var result = {
            data: output,
            minBefore: Math.pow(2, 32),
            maxBefore: 0,
            minAfter: Math.pow(2, 32),
            maxAfter: 0,
        };
        if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular ||
            (typeof norm.from == 'number' &&
                typeof norm.to == 'number')) {
            result = this.normaliseTypedArray(output, norm);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Smart) {
            result = this.normaliseTypedArraySmart(output, norm);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.SmartWindow) {
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
comlink__WEBPACK_IMPORTED_MODULE_1__.expose(processor);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLO2lCQUN4QyxDQUFDO2dCQUNGLDBDQUEwQztnQkFDMUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDZCxHQUFHLElBQUksRUFBRSxDQUFDO2dCQUVWLElBQU0sSUFBSSxHQUFhO29CQUNyQixDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO29CQUNQLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDO29CQUNoQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDO29CQUNsQyxDQUFHLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUs7aUJBQ3hDLENBQUM7Z0JBQ0YsMENBQTBDO2dCQUMxQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLEdBQUcsSUFBSSxFQUFFLENBQUM7YUFDWDtTQUNGO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBRUQsMkNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3BuZy0xNi1icm93c2VyLy4vc3JjL2hlbHBlcnMudHMiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9ub2RlX21vZHVsZXMvY29tbGluay9kaXN0L2VzbS9jb21saW5rLm1qcyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3BuZy0xNi1icm93c2VyLy4vc3JjL3Byb2Nlc3Nvci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZm9ybWF0ID0gKHN0ciA6IHN0cmluZywgb2JqIDogUmVjb3JkPHN0cmluZywgc3RyaW5nfG51bWJlcj4pIDogc3RyaW5nID0+IHtcclxuICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob2JqKSkge1xyXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoYHske2tleX19YCwgdmFsdWUudG9TdHJpbmcoKSk7XHJcbiAgfVxyXG4gIHJldHVybiBzdHI7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID1cclxuICB8IEludDhBcnJheVxyXG4gIHwgVWludDhBcnJheVxyXG4gIHwgVWludDhDbGFtcGVkQXJyYXlcclxuICB8IEludDE2QXJyYXlcclxuICB8IFVpbnQxNkFycmF5XHJcbiAgfCBJbnQzMkFycmF5XHJcbiAgfCBVaW50MzJBcnJheVxyXG4gIHwgRmxvYXQzMkFycmF5XHJcbiAgfCBGbG9hdDY0QXJyYXk7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRpbGVDb29yZHMge1xyXG4gIHg6IG51bWJlcixcclxuICB5OiBudW1iZXIsXHJcbiAgejogbnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBMYXRMbmcge1xyXG4gIGxhdGl0dWRlOiBudW1iZXIsXHJcbiAgbG9uZ2l0dWRlOiBudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIExhdExuZ1pvb20gZXh0ZW5kcyBMYXRMbmcge1xyXG4gIHpvb206IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDb25maWdTdGF0ZSA9IFRpbGVDb29yZHMgJiBMYXRMbmdab29tICYge1xyXG4gIHdpZHRoIDogbnVtYmVyLFxyXG4gIGhlaWdodCA6IG51bWJlcixcclxuICBleGFjdFBvcyA6IFRpbGVDb29yZHMsXHJcbiAgd2lkdGhJblRpbGVzIDogbnVtYmVyLFxyXG4gIGhlaWdodEluVGlsZXMgOiBudW1iZXIsXHJcbiAgc3RhcnR4OiBudW1iZXIsXHJcbiAgc3RhcnR5OiBudW1iZXIsXHJcbiAgZW5keDogbnVtYmVyLFxyXG4gIGVuZHk6IG51bWJlcixcclxuICBzdGF0dXM6IHN0cmluZyxcclxuICBib3VuZHM6IFtMYXRMbmcsIExhdExuZ10sXHJcbiAgcGh5czoge3dpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyfSxcclxuICBtaW46IHt5OiBudW1iZXIsIHg6IG51bWJlcn0sXHJcbiAgbWF4OiB7eTogbnVtYmVyLCB4OiBudW1iZXJ9LFxyXG4gIHR5cGU6ICdhbGJlZG8nfCdoZWlnaHRtYXAnLFxyXG4gIHVybDogc3RyaW5nLFxyXG59O1xyXG5cclxuaW1wb3J0IFBORyBmcm9tIFwiLi9wbmdcIjtcclxuXHJcbmV4cG9ydCB0eXBlIFRpbGVMb2FkU3RhdGUgPSBDb25maWdTdGF0ZSAmIHt4OiBudW1iZXIsIHk6IG51bWJlciwgaGVpZ2h0czogRmxvYXQzMkFycmF5fFVpbnQ4QXJyYXksIGJ1ZmZlcjogQXJyYXlCdWZmZXJ9O1xyXG5cclxuZXhwb3J0IGVudW0gTm9ybWFsaXNlTW9kZSB7XHJcbiAgT2ZmID0gMCxcclxuICBSZWd1bGFyID0gMSxcclxuICBTbWFydCA9IDIsXHJcbiAgU21hcnRXaW5kb3cgPSAzLFxyXG4gIEZpeGVkID0gNCxcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHJvbGwgPSAobnVtOiBudW1iZXIsIG1pbjogbnVtYmVyID0gMCwgbWF4OiBudW1iZXIgPSAxKSAgPT4gbW9kV2l0aE5lZyhudW0gLSBtaW4sIG1heCAtIG1pbikgKyBtaW47XHJcbmV4cG9ydCBjb25zdCBtb2RXaXRoTmVnID0gICh4OiBudW1iZXIsIG1vZDogbnVtYmVyKSA9PiAoKHggJSBtb2QpICsgbW9kKSAlIG1vZDtcclxuZXhwb3J0IGNvbnN0IGNsYW1wID0gKG51bSA6IG51bWJlciwgbWluOiBudW1iZXIgPSAwLCBtYXg6IG51bWJlciA9IDEpID0+IE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCBudW0pKTtcclxuXHJcbi8qKlxyXG4gKiBTYW1lIGFzIFByb21pc2UuYWxsKGl0ZW1zLm1hcChpdGVtID0+IHRhc2soaXRlbSkpKSwgYnV0IGl0IHdhaXRzIGZvclxyXG4gKiB0aGUgZmlyc3Qge2JhdGNoU2l6ZX0gcHJvbWlzZXMgdG8gZmluaXNoIGJlZm9yZSBzdGFydGluZyB0aGUgbmV4dCBiYXRjaC5cclxuICpcclxuICogQHRlbXBsYXRlIEFcclxuICogQHRlbXBsYXRlIEJcclxuICogQHBhcmFtIHtmdW5jdGlvbihBKTogQn0gdGFzayBUaGUgdGFzayB0byBydW4gZm9yIGVhY2ggaXRlbS5cclxuICogQHBhcmFtIHtBW119IGl0ZW1zIEFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSB0YXNrIGZvciBlYWNoIGNhbGwuXHJcbiAqIEBwYXJhbSB7aW50fSBiYXRjaFNpemVcclxuICogQHJldHVybnMge1Byb21pc2U8QltdPn1cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9taXNlQWxsSW5CYXRjaGVzPFQsIEI+KHRhc2sgOiAoaXRlbSA6IFQpID0+IFByb21pc2U8Qj58QiwgaXRlbXMgOiBUW10sIGJhdGNoU2l6ZSA6IG51bWJlciwgdG8gOiBudW1iZXIgPSAwKSA6IFByb21pc2U8QltdPiB7XHJcbiAgICBsZXQgcG9zaXRpb24gPSAwO1xyXG4gICAgbGV0IHJlc3VsdHMgOiBCW10gPSBbXTtcclxuICAgIHdoaWxlIChwb3NpdGlvbiA8IGl0ZW1zLmxlbmd0aCkge1xyXG4gICAgICAgIGNvbnN0IGl0ZW1zRm9yQmF0Y2ggPSBpdGVtcy5zbGljZShwb3NpdGlvbiwgcG9zaXRpb24gKyBiYXRjaFNpemUpO1xyXG4gICAgICAgIHJlc3VsdHMgPSBbLi4ucmVzdWx0cywgLi4uYXdhaXQgUHJvbWlzZS5hbGwoaXRlbXNGb3JCYXRjaC5tYXAoaXRlbSA9PiB0YXNrKGl0ZW0pKSldO1xyXG4gICAgICAgIHBvc2l0aW9uICs9IGJhdGNoU2l6ZTtcclxuICAgICAgICBpZiAodG8gPiAwKSB7XHJcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCB0bykpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHRzO1xyXG59IiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcbiAqL1xuY29uc3QgcHJveHlNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnByb3h5XCIpO1xuY29uc3QgY3JlYXRlRW5kcG9pbnQgPSBTeW1ib2woXCJDb21saW5rLmVuZHBvaW50XCIpO1xuY29uc3QgcmVsZWFzZVByb3h5ID0gU3ltYm9sKFwiQ29tbGluay5yZWxlYXNlUHJveHlcIik7XG5jb25zdCBmaW5hbGl6ZXIgPSBTeW1ib2woXCJDb21saW5rLmZpbmFsaXplclwiKTtcbmNvbnN0IHRocm93TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay50aHJvd25cIik7XG5jb25zdCBpc09iamVjdCA9ICh2YWwpID0+ICh0eXBlb2YgdmFsID09PSBcIm9iamVjdFwiICYmIHZhbCAhPT0gbnVsbCkgfHwgdHlwZW9mIHZhbCA9PT0gXCJmdW5jdGlvblwiO1xuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGUgdG8gaGFuZGxlIG9iamVjdHMgbWFya2VkIHRvIHByb3h5LlxuICovXG5jb25zdCBwcm94eVRyYW5zZmVySGFuZGxlciA9IHtcbiAgICBjYW5IYW5kbGU6ICh2YWwpID0+IGlzT2JqZWN0KHZhbCkgJiYgdmFsW3Byb3h5TWFya2VyXSxcbiAgICBzZXJpYWxpemUob2JqKSB7XG4gICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDEpO1xuICAgICAgICByZXR1cm4gW3BvcnQyLCBbcG9ydDJdXTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplKHBvcnQpIHtcbiAgICAgICAgcG9ydC5zdGFydCgpO1xuICAgICAgICByZXR1cm4gd3JhcChwb3J0KTtcbiAgICB9LFxufTtcbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlciB0byBoYW5kbGUgdGhyb3duIGV4Y2VwdGlvbnMuXG4gKi9cbmNvbnN0IHRocm93VHJhbnNmZXJIYW5kbGVyID0ge1xuICAgIGNhbkhhbmRsZTogKHZhbHVlKSA9PiBpc09iamVjdCh2YWx1ZSkgJiYgdGhyb3dNYXJrZXIgaW4gdmFsdWUsXG4gICAgc2VyaWFsaXplKHsgdmFsdWUgfSkge1xuICAgICAgICBsZXQgc2VyaWFsaXplZDtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHNlcmlhbGl6ZWQgPSB7XG4gICAgICAgICAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiB2YWx1ZS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBzdGFjazogdmFsdWUuc3RhY2ssXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZXJpYWxpemVkID0geyBpc0Vycm9yOiBmYWxzZSwgdmFsdWUgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3NlcmlhbGl6ZWQsIFtdXTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplKHNlcmlhbGl6ZWQpIHtcbiAgICAgICAgaWYgKHNlcmlhbGl6ZWQuaXNFcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3Ioc2VyaWFsaXplZC52YWx1ZS5tZXNzYWdlKSwgc2VyaWFsaXplZC52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgc2VyaWFsaXplZC52YWx1ZTtcbiAgICB9LFxufTtcbi8qKlxuICogQWxsb3dzIGN1c3RvbWl6aW5nIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzLlxuICovXG5jb25zdCB0cmFuc2ZlckhhbmRsZXJzID0gbmV3IE1hcChbXG4gICAgW1wicHJveHlcIiwgcHJveHlUcmFuc2ZlckhhbmRsZXJdLFxuICAgIFtcInRocm93XCIsIHRocm93VHJhbnNmZXJIYW5kbGVyXSxcbl0pO1xuZnVuY3Rpb24gaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBvcmlnaW4pIHtcbiAgICBmb3IgKGNvbnN0IGFsbG93ZWRPcmlnaW4gb2YgYWxsb3dlZE9yaWdpbnMpIHtcbiAgICAgICAgaWYgKG9yaWdpbiA9PT0gYWxsb3dlZE9yaWdpbiB8fCBhbGxvd2VkT3JpZ2luID09PSBcIipcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93ZWRPcmlnaW4gaW5zdGFuY2VvZiBSZWdFeHAgJiYgYWxsb3dlZE9yaWdpbi50ZXN0KG9yaWdpbikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGV4cG9zZShvYmosIGVwID0gZ2xvYmFsVGhpcywgYWxsb3dlZE9yaWdpbnMgPSBbXCIqXCJdKSB7XG4gICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gY2FsbGJhY2soZXYpIHtcbiAgICAgICAgaWYgKCFldiB8fCAhZXYuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBldi5vcmlnaW4pKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEludmFsaWQgb3JpZ2luICcke2V2Lm9yaWdpbn0nIGZvciBjb21saW5rIHByb3h5YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBpZCwgdHlwZSwgcGF0aCB9ID0gT2JqZWN0LmFzc2lnbih7IHBhdGg6IFtdIH0sIGV2LmRhdGEpO1xuICAgICAgICBjb25zdCBhcmd1bWVudExpc3QgPSAoZXYuZGF0YS5hcmd1bWVudExpc3QgfHwgW10pLm1hcChmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgbGV0IHJldHVyblZhbHVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gcGF0aC5zbGljZSgwLCAtMSkucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gcGF0aC5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkdFVFwiIC8qIE1lc3NhZ2VUeXBlLkdFVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiU0VUXCIgLyogTWVzc2FnZVR5cGUuU0VUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRbcGF0aC5zbGljZSgtMSlbMF1dID0gZnJvbVdpcmVWYWx1ZShldi5kYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiQVBQTFlcIiAvKiBNZXNzYWdlVHlwZS5BUFBMWSAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZS5hcHBseShwYXJlbnQsIGFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkNPTlNUUlVDVFwiIC8qIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgcmF3VmFsdWUoLi4uYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcHJveHkodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJFTkRQT0lOVFwiIC8qIE1lc3NhZ2VUeXBlLkVORFBPSU5UICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvc2Uob2JqLCBwb3J0Mik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRyYW5zZmVyKHBvcnQxLCBbcG9ydDFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFByb21pc2UucmVzb2x2ZShyZXR1cm5WYWx1ZSlcbiAgICAgICAgICAgIC5jYXRjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbigocmV0dXJuVmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmV0dXJuVmFsdWUpO1xuICAgICAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB3aXJlVmFsdWUpLCB7IGlkIH0pLCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09PSBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovKSB7XG4gICAgICAgICAgICAgICAgLy8gZGV0YWNoIGFuZCBkZWFjdGl2ZSBhZnRlciBzZW5kaW5nIHJlbGVhc2UgcmVzcG9uc2UgYWJvdmUuXG4gICAgICAgICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgICAgICAgICAgICAgIGlmIChmaW5hbGl6ZXIgaW4gb2JqICYmIHR5cGVvZiBvYmpbZmluYWxpemVyXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9ialtmaW5hbGl6ZXJdKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgLy8gU2VuZCBTZXJpYWxpemF0aW9uIEVycm9yIFRvIENhbGxlclxuICAgICAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZSh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUeXBlRXJyb3IoXCJVbnNlcmlhbGl6YWJsZSByZXR1cm4gdmFsdWVcIiksXG4gICAgICAgICAgICAgICAgW3Rocm93TWFya2VyXTogMCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB3aXJlVmFsdWUpLCB7IGlkIH0pLCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICAgIGVwLnN0YXJ0KCk7XG4gICAgfVxufVxuZnVuY3Rpb24gaXNNZXNzYWdlUG9ydChlbmRwb2ludCkge1xuICAgIHJldHVybiBlbmRwb2ludC5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk1lc3NhZ2VQb3J0XCI7XG59XG5mdW5jdGlvbiBjbG9zZUVuZFBvaW50KGVuZHBvaW50KSB7XG4gICAgaWYgKGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpKVxuICAgICAgICBlbmRwb2ludC5jbG9zZSgpO1xufVxuZnVuY3Rpb24gd3JhcChlcCwgdGFyZ2V0KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBbXSwgdGFyZ2V0KTtcbn1cbmZ1bmN0aW9uIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUmVsZWFzZWQpIHtcbiAgICBpZiAoaXNSZWxlYXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm94eSBoYXMgYmVlbiByZWxlYXNlZCBhbmQgaXMgbm90IHVzZWFibGVcIik7XG4gICAgfVxufVxuZnVuY3Rpb24gcmVsZWFzZUVuZHBvaW50KGVwKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgdHlwZTogXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLyxcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgY2xvc2VFbmRQb2ludChlcCk7XG4gICAgfSk7XG59XG5jb25zdCBwcm94eUNvdW50ZXIgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgcHJveHlGaW5hbGl6ZXJzID0gXCJGaW5hbGl6YXRpb25SZWdpc3RyeVwiIGluIGdsb2JhbFRoaXMgJiZcbiAgICBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKGVwKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApIC0gMTtcbiAgICAgICAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICAgICAgICBpZiAobmV3Q291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgIH1cbiAgICB9KTtcbmZ1bmN0aW9uIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKSB7XG4gICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgKyAxO1xuICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgICAgIHByb3h5RmluYWxpemVycy5yZWdpc3Rlcihwcm94eSwgZXAsIHByb3h5KTtcbiAgICB9XG59XG5mdW5jdGlvbiB1bnJlZ2lzdGVyUHJveHkocHJveHkpIHtcbiAgICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgICAgIHByb3h5RmluYWxpemVycy51bnJlZ2lzdGVyKHByb3h5KTtcbiAgICB9XG59XG5mdW5jdGlvbiBjcmVhdGVQcm94eShlcCwgcGF0aCA9IFtdLCB0YXJnZXQgPSBmdW5jdGlvbiAoKSB7IH0pIHtcbiAgICBsZXQgaXNQcm94eVJlbGVhc2VkID0gZmFsc2U7XG4gICAgY29uc3QgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCB7XG4gICAgICAgIGdldChfdGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgaWYgKHByb3AgPT09IHJlbGVhc2VQcm94eSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJQcm94eShwcm94eSk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgICAgICAgICAgICAgIGlzUHJveHlSZWxlYXNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wID09PSBcInRoZW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0aGVuOiAoKSA9PiBwcm94eSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCByID0gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiIC8qIE1lc3NhZ2VUeXBlLkdFVCAqLyxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gci50aGVuLmJpbmQocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIFsuLi5wYXRoLCBwcm9wXSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldChfdGFyZ2V0LCBwcm9wLCByYXdWYWx1ZSkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIC8vIEZJWE1FOiBFUzYgUHJveHkgSGFuZGxlciBgc2V0YCBtZXRob2RzIGFyZSBzdXBwb3NlZCB0byByZXR1cm4gYVxuICAgICAgICAgICAgLy8gYm9vbGVhbi4gVG8gc2hvdyBnb29kIHdpbGwsIHdlIHJldHVybiB0cnVlIGFzeW5jaHJvbm91c2x5IMKvXFxfKOODhClfL8KvXG4gICAgICAgICAgICBjb25zdCBbdmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmF3VmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlNFVFwiIC8qIE1lc3NhZ2VUeXBlLlNFVCAqLyxcbiAgICAgICAgICAgICAgICBwYXRoOiBbLi4ucGF0aCwgcHJvcF0ubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgYXBwbHkoX3RhcmdldCwgX3RoaXNBcmcsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAobGFzdCA9PT0gY3JlYXRlRW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkVORFBPSU5UXCIgLyogTWVzc2FnZVR5cGUuRU5EUE9JTlQgKi8sXG4gICAgICAgICAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdlIGp1c3QgcHJldGVuZCB0aGF0IGBiaW5kKClgIGRpZG7igJl0IGhhcHBlbi5cbiAgICAgICAgICAgIGlmIChsYXN0ID09PSBcImJpbmRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgcGF0aC5zbGljZSgwLCAtMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiQVBQTFlcIiAvKiBNZXNzYWdlVHlwZS5BUFBMWSAqLyxcbiAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudExpc3QsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBjb25zdHJ1Y3QoX3RhcmdldCwgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiQ09OU1RSVUNUXCIgLyogTWVzc2FnZVR5cGUuQ09OU1RSVUNUICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG4gICAgcmVnaXN0ZXJQcm94eShwcm94eSwgZXApO1xuICAgIHJldHVybiBwcm94eTtcbn1cbmZ1bmN0aW9uIG15RmxhdChhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgYXJyKTtcbn1cbmZ1bmN0aW9uIHByb2Nlc3NBcmd1bWVudHMoYXJndW1lbnRMaXN0KSB7XG4gICAgY29uc3QgcHJvY2Vzc2VkID0gYXJndW1lbnRMaXN0Lm1hcCh0b1dpcmVWYWx1ZSk7XG4gICAgcmV0dXJuIFtwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzBdKSwgbXlGbGF0KHByb2Nlc3NlZC5tYXAoKHYpID0+IHZbMV0pKV07XG59XG5jb25zdCB0cmFuc2ZlckNhY2hlID0gbmV3IFdlYWtNYXAoKTtcbmZ1bmN0aW9uIHRyYW5zZmVyKG9iaiwgdHJhbnNmZXJzKSB7XG4gICAgdHJhbnNmZXJDYWNoZS5zZXQob2JqLCB0cmFuc2ZlcnMpO1xuICAgIHJldHVybiBvYmo7XG59XG5mdW5jdGlvbiBwcm94eShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIHsgW3Byb3h5TWFya2VyXTogdHJ1ZSB9KTtcbn1cbmZ1bmN0aW9uIHdpbmRvd0VuZHBvaW50KHcsIGNvbnRleHQgPSBnbG9iYWxUaGlzLCB0YXJnZXRPcmlnaW4gPSBcIipcIikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHBvc3RNZXNzYWdlOiAobXNnLCB0cmFuc2ZlcmFibGVzKSA9PiB3LnBvc3RNZXNzYWdlKG1zZywgdGFyZ2V0T3JpZ2luLCB0cmFuc2ZlcmFibGVzKSxcbiAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcjogY29udGV4dC5hZGRFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGNvbnRleHQucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICAgIH07XG59XG5mdW5jdGlvbiB0b1dpcmVWYWx1ZSh2YWx1ZSkge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGhhbmRsZXJdIG9mIHRyYW5zZmVySGFuZGxlcnMpIHtcbiAgICAgICAgaWYgKGhhbmRsZXIuY2FuSGFuZGxlKHZhbHVlKSkge1xuICAgICAgICAgICAgY29uc3QgW3NlcmlhbGl6ZWRWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSBoYW5kbGVyLnNlcmlhbGl6ZSh2YWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJIQU5ETEVSXCIgLyogV2lyZVZhbHVlVHlwZS5IQU5ETEVSICovLFxuICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2VyaWFsaXplZFZhbHVlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdHJhbnNmZXJhYmxlcyxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogXCJSQVdcIiAvKiBXaXJlVmFsdWVUeXBlLlJBVyAqLyxcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlckNhY2hlLmdldCh2YWx1ZSkgfHwgW10sXG4gICAgXTtcbn1cbmZ1bmN0aW9uIGZyb21XaXJlVmFsdWUodmFsdWUpIHtcbiAgICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgY2FzZSBcIkhBTkRMRVJcIiAvKiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIgKi86XG4gICAgICAgICAgICByZXR1cm4gdHJhbnNmZXJIYW5kbGVycy5nZXQodmFsdWUubmFtZSkuZGVzZXJpYWxpemUodmFsdWUudmFsdWUpO1xuICAgICAgICBjYXNlIFwiUkFXXCIgLyogV2lyZVZhbHVlVHlwZS5SQVcgKi86XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudmFsdWU7XG4gICAgfVxufVxuZnVuY3Rpb24gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwgbXNnLCB0cmFuc2ZlcnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgY29uc3QgaWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICAgICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gbChldikge1xuICAgICAgICAgICAgaWYgKCFldi5kYXRhIHx8ICFldi5kYXRhLmlkIHx8IGV2LmRhdGEuaWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbCk7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICAgICAgICBlcC5zdGFydCgpO1xuICAgICAgICB9XG4gICAgICAgIGVwLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oeyBpZCB9LCBtc2cpLCB0cmFuc2ZlcnMpO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuICAgIHJldHVybiBuZXcgQXJyYXkoNClcbiAgICAgICAgLmZpbGwoMClcbiAgICAgICAgLm1hcCgoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikudG9TdHJpbmcoMTYpKVxuICAgICAgICAuam9pbihcIi1cIik7XG59XG5cbmV4cG9ydCB7IGNyZWF0ZUVuZHBvaW50LCBleHBvc2UsIGZpbmFsaXplciwgcHJveHksIHByb3h5TWFya2VyLCByZWxlYXNlUHJveHksIHRyYW5zZmVyLCB0cmFuc2ZlckhhbmRsZXJzLCB3aW5kb3dFbmRwb2ludCwgd3JhcCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29tbGluay5tanMubWFwXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCAqIGFzIENvbWxpbmsgZnJvbSBcImNvbWxpbmtcIjtcclxuXHJcbmltcG9ydCB7XHJcbiAgVHlwZWRBcnJheSxcclxuICBUaWxlQ29vcmRzLFxyXG4gIExhdExuZyxcclxuICBMYXRMbmdab29tLFxyXG4gIENvbmZpZ1N0YXRlLFxyXG4gIFRpbGVMb2FkU3RhdGUsXHJcbiAgTm9ybWFsaXNlTW9kZVxyXG4gIH0gZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuaW1wb3J0IFBORyBmcm9tIFwiLi9wbmdcIjtcclxuXHJcbmV4cG9ydCB0eXBlIE5vcm1hbGlzZVJlc3VsdDxUPiA9IHtcclxuICBkYXRhOiBULFxyXG4gIG1pbkJlZm9yZTogbnVtYmVyLFxyXG4gIG1heEJlZm9yZTogbnVtYmVyLFxyXG4gIG1pbkFmdGVyOiBudW1iZXIsXHJcbiAgbWF4QWZ0ZXI6IG51bWJlclxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVHlwZWRBcnJheVRvU3RsQXJncyA9IHtcclxuICB3aWR0aCA6IG51bWJlcixcclxuICBkZXB0aCA6IG51bWJlcixcclxuICBoZWlnaHQ6IG51bWJlclxyXG59O1xyXG5leHBvcnQgY29uc3QgdHlwZWRBcnJheVRvU3RsRGVmYXVsdHMgOiBUeXBlZEFycmF5VG9TdGxBcmdzID0ge1xyXG4gIHdpZHRoIDogMTAwLFxyXG4gIGRlcHRoIDogMTAwLFxyXG4gIGhlaWdodCA6IDEwLFxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgdmVjMyA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcclxuZXhwb3J0IHR5cGUgdHJpdmVjMyA9IFt2ZWMzLCB2ZWMzLCB2ZWMzLCB2ZWMzXTtcclxuXHJcbmV4cG9ydCB0eXBlIE5vcm1SYW5nZSA9IHtmcm9tIDogbnVtYmVyfG51bGx8dW5kZWZpbmVkLCB0byA6IG51bWJlcnxudWxsfHVuZGVmaW5lZH07XHJcbmV4cG9ydCBjb25zdCBub3JtTWF4UmFuZ2UgOiBOb3JtUmFuZ2UgPSB7ZnJvbTogLTEwOTI5LCB0bzogODg0OH07XHJcbmV4cG9ydCBjb25zdCBub3JtRGVmYXVsdHMgOiBOb3JtUmFuZ2UgPSB7ZnJvbTogbnVsbCwgdG86IG51bGx9O1xyXG5cclxuY29uc3QgcHJvY2Vzc29yID0ge1xyXG4gIG5vcm1hbGlzZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXl8bnVtYmVyW10+KGlucCA6IFQsIG5vcm06IE5vcm1SYW5nZSkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1heChwcmV2LCBjdXIpLCAwKTtcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWluID0gKHR5cGVvZiBub3JtLmZyb20gPT09ICdudW1iZXInKSA/IG5vcm0uZnJvbSA6IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5taW4ocHJldiwgY3VyKSwgbWF4KTtcclxuICAgIGNvbnN0IG5ld01heCA9IE1hdGgucG93KDIsIGJwZSAqIDgpO1xyXG4gICAgY29uc3QgbmV3TWluID0gMDtcclxuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcclxuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XHJcbiAgICBjb25zdCBmYWN0b3IgPSBuZXdNYXgvKG1heCAtIHN1Yik7XHJcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xyXG4gICAgICBlbHNlIGlmIChhIDw9IG1pbikgaW5wW2luZGV4XSA9IG5ld01pbjtcclxuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IG1pbixcclxuICAgICAgbWF4QmVmb3JlOiBtYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgbm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBULCBub3JtOiBOb3JtUmFuZ2UpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxyXG5cclxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcclxuXHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1lYW4gPSBpbnAucmVkdWNlKChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA9PiBhICsgYikgLyBuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5tYXgocHJldiwgY3VyKSwgMCk7XHJcbiAgICBjb25zdCBtYXggPSAodHlwZW9mIG5vcm0udG8gPT09ICdudW1iZXInKSA/IG5vcm0udG8gOiBNYXRoLm1pbihtZWFuK3N0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1heCk7XHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1pbiA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5taW4ocHJldiwgY3VyKSwgbWF4KTtcclxuICAgIGNvbnN0IG1pbiA9ICh0eXBlb2Ygbm9ybS5mcm9tID09PSAnbnVtYmVyJykgPyBub3JtLmZyb20gOiBNYXRoLm1heChtZWFuLXN0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1pbik7XHJcblxyXG4gICAgY29uc3QgbmV3TWF4ID0gTWF0aC5wb3coMiwgYnBlICogOCk7XHJcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xyXG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xyXG4gICAgY29uc3QgbnN1YiA9IG5ld01heCAtIG5ld01pbjtcclxuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcclxuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBpZiAoYSA+PSBtYXgpIGlucFtpbmRleF0gPSBuZXdNYXg7XHJcbiAgICAgIGVsc2UgaWYgKGEgPD0gbWluKSBpbnBbaW5kZXhdID0gbmV3TWluO1xyXG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogYWN0dWFsTWluLFxyXG4gICAgICBtYXhCZWZvcmU6IGFjdHVhbE1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBub3JtYWxpc2VUeXBlZEFycmF5U21hcnRXaW5kb3c8VCBleHRlbmRzIFR5cGVkQXJyYXk+KGlucCA6IFQsIG5vcm06IE5vcm1SYW5nZSkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnN0IG4gPSBpbnAubGVuZ3RoXHJcblxyXG4gICAgY29uc3QgbnVtU3RkRGV2aWF0aW9ucyA9IDEwO1xyXG5cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWVhbiA9IGlucC5yZWR1Y2UoKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpID0+IGEgKyBiKSAvIG5cclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3Qgc3RkZGV2ID0gTWF0aC5zcXJ0KGlucC5tYXAoeCA9PiBNYXRoLnBvdyh4IC0gbWVhbiwgMikpLnJlZHVjZSgoYSwgYikgPT4gYSArIGIpIC8gbilcclxuXHJcbiAgICBjb25zdCBleGNsdWRlID0gMC4wMDA1O1xyXG4gICAgY29uc3QgY29weSA9IGlucC5zbGljZSgwKTtcclxuICAgIGNvcHkuc29ydCgpO1xyXG4gICAgY29uc3Qgb2Zmc2V0ID0gTWF0aC5jZWlsKGNvcHkubGVuZ3RoICogZXhjbHVkZSk7XHJcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmZsb29yKGNvcHkubGVuZ3RoICogKDEtZXhjbHVkZSoyKSk7XHJcbiAgICBjb25zdCB3aW5kb3dlZENvcHkgPSBjb3B5LnN1YmFycmF5KG9mZnNldCwgbGVuZ3RoKTtcclxuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGNvcHlbY29weS5sZW5ndGgtMV07XHJcbiAgICBjb25zdCB3aW5kb3dlZE1heCA9IHdpbmRvd2VkQ29weVt3aW5kb3dlZENvcHkubGVuZ3RoLTFdO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBjb3B5WzBdO1xyXG4gICAgY29uc3Qgd2luZG93ZWRNaW4gPSB3aW5kb3dlZENvcHlbMF07XHJcblxyXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogKHdpbmRvd2VkTWF4ICsgc3RkZGV2KSA+IGFjdHVhbE1heCA/IGFjdHVhbE1heCA6IHdpbmRvd2VkTWF4O1xyXG4gICAgY29uc3QgbWluID0gKHR5cGVvZiBub3JtLmZyb20gPT09ICdudW1iZXInKSA/IG5vcm0uZnJvbSA6ICh3aW5kb3dlZE1pbiAtIHN0ZGRldikgPCBhY3R1YWxNaW4gPyBhY3R1YWxNaW4gOiB3aW5kb3dlZE1pbjtcclxuXHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KS0xO1xyXG4gICAgY29uc3QgbmV3TWluID0gMDtcclxuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcclxuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XHJcbiAgICBjb25zdCBmYWN0b3IgPSBuZXdNYXgvKG1heCAtIHN1Yik7XHJcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xyXG4gICAgICBlbHNlIGlmIChhIDw9IG1pbikgaW5wW2luZGV4XSA9IG5ld01pbjtcclxuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IG1pbixcclxuICAgICAgbWF4QmVmb3JlOiBtYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29tYmluZUltYWdlcyhcclxuICAgIHN0YXRlcyA6IFRpbGVMb2FkU3RhdGVbXSxcclxuICAgIG5vcm1hbGlzZU1vZGUgOiBudW1iZXIgPSBOb3JtYWxpc2VNb2RlLlJlZ3VsYXIsXHJcbiAgICBub3JtIDogTm9ybVJhbmdlID0gbm9ybURlZmF1bHRzXHJcbiAgKSA6IE5vcm1hbGlzZVJlc3VsdDxGbG9hdDMyQXJyYXk+IHtcclxuICAgIGNvbnN0IGFyZWEgPSBzdGF0ZXNbMF0ud2lkdGggKiBzdGF0ZXNbMF0uaGVpZ2h0O1xyXG4gICAgbGV0IG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkoYXJlYSk7XHJcbiAgICBjb25zdCB0aWxlV2lkdGggPSAyNTY7XHJcbiAgICBjb25zdCBpbmNyZW1lbnQgPSAxL3RpbGVXaWR0aDtcclxuICAgIGNvbnN0IG1hcCA6IFJlY29yZDxudW1iZXIsIFJlY29yZDxudW1iZXIsIFRpbGVMb2FkU3RhdGU+PiA9IHt9O1xyXG4gICAgZm9yIChsZXQgdGlsZSBvZiBzdGF0ZXMpIHtcclxuICAgICAgaWYgKCFtYXBbdGlsZS54XSkge1xyXG4gICAgICAgIG1hcFt0aWxlLnhdID0ge307XHJcbiAgICAgIH1cclxuICAgICAgbWFwW3RpbGUueF1bdGlsZS55XSA9IHRpbGU7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZXh0ZW50ID0ge1xyXG4gICAgICB4MTogc3RhdGVzWzBdLmV4YWN0UG9zLnggLSBzdGF0ZXNbMF0ud2lkdGhJblRpbGVzLzIsXHJcbiAgICAgIHgyOiBzdGF0ZXNbMF0uZXhhY3RQb3MueCArIHN0YXRlc1swXS53aWR0aEluVGlsZXMvMixcclxuICAgICAgeTE6IHN0YXRlc1swXS5leGFjdFBvcy55IC0gc3RhdGVzWzBdLmhlaWdodEluVGlsZXMvMixcclxuICAgICAgeTI6IHN0YXRlc1swXS5leGFjdFBvcy55ICsgc3RhdGVzWzBdLmhlaWdodEluVGlsZXMvMlxyXG4gICAgfVxyXG5cclxuICAgIGxldCBpID0gMDtcclxuICAgIGZvciAobGV0IHkgPSBleHRlbnQueTE7IHkgPCBleHRlbnQueTI7IHkgKz0gaW5jcmVtZW50KSB7XHJcbiAgICAgIGZvciAobGV0IHggPSBleHRlbnQueDE7IHggPCBleHRlbnQueDI7IHggKz0gaW5jcmVtZW50KSB7XHJcbiAgICAgICAgY29uc3QgdGlsZSA9IHtcclxuICAgICAgICAgIHg6IE1hdGguZmxvb3IoeCksXHJcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKHkpXHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBweCA9IHtcclxuICAgICAgICAgIHg6IE1hdGguZmxvb3IoKHglMSkqdGlsZVdpZHRoKSxcclxuICAgICAgICAgIHk6IE1hdGguZmxvb3IoKHklMSkqdGlsZVdpZHRoKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgaWR4ID0gcHgueSp0aWxlV2lkdGggKyBweC54O1xyXG4gICAgICAgIGlmICh0eXBlb2YgbWFwW3RpbGUueF0gPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHggdmFsdWUgJHt0aWxlLnh9IHdhcyB1bmRlZmluZWRgKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBtYXBbdGlsZS54XVt0aWxlLnldID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB5IHZhbHVlICR7dGlsZS55fSB3YXMgdW5kZWZpbmVkYCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIG91dHB1dFtpKytdID0gbWFwW3RpbGUueF1bdGlsZS55XS5oZWlnaHRzW2lkeF07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBsZXQgcmVzdWx0ID0ge1xyXG4gICAgICBkYXRhOiBvdXRwdXQsXHJcbiAgICAgIG1pbkJlZm9yZTogTWF0aC5wb3coMiwgMzIpLFxyXG4gICAgICBtYXhCZWZvcmU6IDAsXHJcbiAgICAgIG1pbkFmdGVyOiBNYXRoLnBvdygyLCAzMiksXHJcbiAgICAgIG1heEFmdGVyOiAwLFxyXG4gICAgfTtcclxuICAgIGlmIChcclxuICAgICAgbm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlJlZ3VsYXIgfHxcclxuICAgICAgKFxyXG4gICAgICAgIHR5cGVvZiBub3JtLmZyb20gPT0gJ251bWJlcicgJiZcclxuICAgICAgICB0eXBlb2Ygbm9ybS50byA9PSAnbnVtYmVyJ1xyXG4gICAgICApXHJcbiAgICApIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5KG91dHB1dCwgbm9ybSk7XHJcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5TbWFydCkge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydChvdXRwdXQsIG5vcm0pO1xyXG4gICAgfSBlbHNlIGlmIChub3JtYWxpc2VNb2RlID09IE5vcm1hbGlzZU1vZGUuU21hcnRXaW5kb3cpIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5U21hcnRXaW5kb3cob3V0cHV0LCBub3JtKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcmVzdWx0Lm1heEFmdGVyID0gTWF0aC5tYXgob3V0cHV0W2ldLCByZXN1bHQubWF4QWZ0ZXIpO1xyXG4gICAgICAgIHJlc3VsdC5taW5BZnRlciA9IE1hdGgubWluKG91dHB1dFtpXSwgcmVzdWx0Lm1pbkFmdGVyKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQubWF4QmVmb3JlID0gcmVzdWx0Lm1heEFmdGVyO1xyXG4gICAgICByZXN1bHQubWluQmVmb3JlID0gcmVzdWx0Lm1pbkFmdGVyO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9LFxyXG4gIHR5cGVkQXJyYXlUb1N0bChcclxuICAgIHBvaW50czogVHlwZWRBcnJheSxcclxuICAgIHdpZHRocHggOiBudW1iZXIsXHJcbiAgICBoZWlnaHRweCA6IG51bWJlcixcclxuICAgIHt3aWR0aCwgZGVwdGgsIGhlaWdodH0gOiBUeXBlZEFycmF5VG9TdGxBcmdzID0gdHlwZWRBcnJheVRvU3RsRGVmYXVsdHNcclxuICApIDogQXJyYXlCdWZmZXIge1xyXG4gICAgY29uc3QgZGF0YUxlbmd0aCA9ICgod2lkdGhweCkgKiAoaGVpZ2h0cHgpKSAqIDUwO1xyXG4gICAgY29uc29sZS5sb2cocG9pbnRzLmxlbmd0aCwgZGF0YUxlbmd0aCk7XHJcbiAgICBjb25zdCBzaXplID0gODAgKyA0ICsgZGF0YUxlbmd0aDtcclxuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihkYXRhTGVuZ3RoKTtcclxuICAgIGNvbnN0IGR2ID0gbmV3IERhdGFWaWV3KHJlc3VsdCk7XHJcbiAgICBkdi5zZXRVaW50MzIoODAsICh3aWR0aHB4LTEpKihoZWlnaHRweC0xKSwgdHJ1ZSk7XHJcblxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtYXggPSBwb2ludHMucmVkdWNlKChhY2MsIHBvaW50KSA9PiBNYXRoLm1heChwb2ludCwgYWNjKSwgMCk7XHJcblxyXG4gICAgY29uc3QgbyA9ICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IG51bWJlciA9PiAoeSAqIHdpZHRocHgpICsgeDtcclxuICAgIGNvbnN0IG4gPSAocDEgOiB2ZWMzLCBwMiA6IHZlYzMsIHAzOiB2ZWMzKSA6IHZlYzMgPT4ge1xyXG4gICAgICBjb25zdCBBID0gW3AyWzBdIC0gcDFbMF0sIHAyWzFdIC0gcDFbMV0sIHAyWzJdIC0gcDFbMl1dO1xyXG4gICAgICBjb25zdCBCID0gW3AzWzBdIC0gcDFbMF0sIHAzWzFdIC0gcDFbMV0sIHAzWzJdIC0gcDFbMl1dO1xyXG4gICAgICByZXR1cm4gW1xyXG4gICAgICAgIEFbMV0gKiBCWzJdIC0gQVsyXSAqIEJbMV0sXHJcbiAgICAgICAgQVsyXSAqIEJbMF0gLSBBWzBdICogQlsyXSxcclxuICAgICAgICBBWzBdICogQlsxXSAtIEFbMV0gKiBCWzBdXHJcbiAgICAgIF1cclxuICAgIH1cclxuICAgIGNvbnN0IHB0ID0gKHRyaXMgOiB0cml2ZWMzLCBvZmYgOiBudW1iZXIpID0+IHtcclxuICAgICAgdHJpcy5mbGF0KCkuZm9yRWFjaCgoZmx0IDogbnVtYmVyLCBpIDogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgZHYuc2V0RmxvYXQzMihvZmYgKyAoaSAqIDQpLCBmbHQsIHRydWUpO1xyXG4gICAgICB9KTtcclxuICAgICAgLy8gZHYuc2V0VWludDE2KG9mZis0OCwgMCwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG9mZiA9IDg0O1xyXG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCAod2lkdGhweCAtIDEpOyB4ICs9IDIpIHtcclxuICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCAoaGVpZ2h0cHggLSAxKTsgeSsrKSB7XHJcbiAgICAgICAgY29uc3QgdHJpMSA6IHRyaXZlYzMgPSBbXHJcbiAgICAgICAgICBbMCwwLDBdLCAvLyBub3JtYWxcclxuICAgICAgICAgIFsgIHgsICAgeSwgcG9pbnRzW28oeCx5KV0vbWF4XSwgLy8gdjFcclxuICAgICAgICAgIFt4KzEsICAgeSwgcG9pbnRzW28oeCsxLHkpXS9tYXhdLCAvLyB2MlxyXG4gICAgICAgICAgWyAgeCwgeSsxLCBwb2ludHNbbyh4LHkrMSldL21heF0sIC8vIHYzXHJcbiAgICAgICAgXTtcclxuICAgICAgICAvLyB0cmkxWzBdID0gbih0cmkxWzFdLCB0cmkxWzJdLCB0cmkxWzNdKTtcclxuICAgICAgICBwdCh0cmkxLCBvZmYpO1xyXG4gICAgICAgIG9mZiArPSA1MDtcclxuXHJcbiAgICAgICAgY29uc3QgdHJpMiA6IHRyaXZlYzMgPSBbXHJcbiAgICAgICAgICBbMCwwLDBdLCAvLyBub3JtYWxcclxuICAgICAgICAgIFt4KzEsICAgeSwgcG9pbnRzW28oeCsxLHkpXS9tYXhdLCAvLyB2MVxyXG4gICAgICAgICAgW3grMSwgeSsxLCBwb2ludHNbbyh4KzEseSsxKV0vbWF4XSwgLy8gdjJcclxuICAgICAgICAgIFsgIHgsIHkrMSwgcG9pbnRzW28oeCx5KzEpXS9tYXhdLCAvLyB2M1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgLy8gdHJpMlswXSA9IG4odHJpMlsxXSwgdHJpMlsyXSwgdHJpMlszXSk7XHJcbiAgICAgICAgcHQodHJpMiwgb2ZmKTtcclxuICAgICAgICBvZmYgKz0gNTA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxufVxyXG5cclxuQ29tbGluay5leHBvc2UocHJvY2Vzc29yKTsiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=