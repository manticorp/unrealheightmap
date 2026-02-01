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


/***/ }),

/***/ "./node_modules/comlink/dist/esm/comlink.mjs":
/*!***************************************************!*\
  !*** ./node_modules/comlink/dist/esm/comlink.mjs ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

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
/* harmony export */   normDefaults: () => (/* binding */ normDefaults),
/* harmony export */   normMaxRange: () => (/* binding */ normMaxRange),
/* harmony export */   typedArrayToStlDefaults: () => (/* binding */ typedArrayToStlDefaults)
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
    combineImages: function (states, normaliseMode, norm, progress) {
        if (normaliseMode === void 0) { normaliseMode = _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular; }
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
comlink__WEBPACK_IMPORTED_MODULE_1__.expose(processor);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELElBQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxPQUFPO2dCQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDMUI7UUFDSCxDQUFDO1FBQ0QsSUFBTSxFQUFFLEdBQUcsVUFBQyxJQUFjLEVBQUUsR0FBWTtZQUN0QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUMsR0FBWSxFQUFFLENBQVU7Z0JBQzNDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxDQUFDLENBQUMsQ0FBQztZQUNILGlDQUFpQztRQUNuQyxDQUFDO1FBRUQsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN2QyxJQUFNLElBQUksR0FBYTtvQkFDckIsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztvQkFDUCxDQUFHLENBQUMsRUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUM7b0JBQzlCLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDO29CQUNoQyxDQUFHLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUs7aUJBQ3hDLENBQUM7Z0JBQ0YsMENBQTBDO2dCQUMxQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBRVYsSUFBTSxJQUFJLEdBQWE7b0JBQ3JCLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7b0JBQ1AsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUM7b0JBQ2hDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUM7b0JBQ2xDLENBQUcsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSztpQkFDeEMsQ0FBQztnQkFDRiwwQ0FBMEM7Z0JBQzFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsR0FBRyxJQUFJLEVBQUUsQ0FBQzthQUNYO1NBQ0Y7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFJRCwyQ0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9zcmMvaGVscGVycy50cyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL25vZGVfbW9kdWxlcy9jb21saW5rL2Rpc3QvZXNtL2NvbWxpbmsubWpzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9zcmMvcHJvY2Vzc29yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBmb3JtYXQgPSAoc3RyIDogc3RyaW5nLCBvYmogOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmd8bnVtYmVyPikgOiBzdHJpbmcgPT4ge1xuICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob2JqKSkge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKGB7JHtrZXl9fWAsIHZhbHVlLnRvU3RyaW5nKCkpO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID1cbiAgfCBJbnQ4QXJyYXlcbiAgfCBVaW50OEFycmF5XG4gIHwgVWludDhDbGFtcGVkQXJyYXlcbiAgfCBJbnQxNkFycmF5XG4gIHwgVWludDE2QXJyYXlcbiAgfCBJbnQzMkFycmF5XG4gIHwgVWludDMyQXJyYXlcbiAgfCBGbG9hdDMyQXJyYXlcbiAgfCBGbG9hdDY0QXJyYXk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZUNvb3JkcyB7XG4gIHg6IG51bWJlcixcbiAgeTogbnVtYmVyLFxuICB6OiBudW1iZXJcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTGF0TG5nIHtcbiAgbGF0aXR1ZGU6IG51bWJlcixcbiAgbG9uZ2l0dWRlOiBudW1iZXJcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTGF0TG5nWm9vbSBleHRlbmRzIExhdExuZyB7XG4gIHpvb206IG51bWJlclxufVxuXG5leHBvcnQgdHlwZSBDb25maWdTdGF0ZSA9IFRpbGVDb29yZHMgJiBMYXRMbmdab29tICYge1xuICB3aWR0aCA6IG51bWJlcixcbiAgaGVpZ2h0IDogbnVtYmVyLFxuICBleGFjdFBvcyA6IFRpbGVDb29yZHMsXG4gIHdpZHRoSW5UaWxlcyA6IG51bWJlcixcbiAgaGVpZ2h0SW5UaWxlcyA6IG51bWJlcixcbiAgc3RhcnR4OiBudW1iZXIsXG4gIHN0YXJ0eTogbnVtYmVyLFxuICBlbmR4OiBudW1iZXIsXG4gIGVuZHk6IG51bWJlcixcbiAgc3RhdHVzOiBzdHJpbmcsXG4gIGJvdW5kczogW0xhdExuZywgTGF0TG5nXSxcbiAgcGh5czoge3dpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyfSxcbiAgbWluOiB7eTogbnVtYmVyLCB4OiBudW1iZXJ9LFxuICBtYXg6IHt5OiBudW1iZXIsIHg6IG51bWJlcn0sXG4gIHR5cGU6ICdhbGJlZG8nfCdoZWlnaHRtYXAnLFxuICB1cmw6IHN0cmluZyxcbn07XG5cbmltcG9ydCBQTkcgZnJvbSBcIi4vcG5nXCI7XG5cbmV4cG9ydCB0eXBlIFRpbGVMb2FkU3RhdGUgPSBDb25maWdTdGF0ZSAmIHt4OiBudW1iZXIsIHk6IG51bWJlciwgaGVpZ2h0czogRmxvYXQzMkFycmF5fFVpbnQ4QXJyYXksIGJ1ZmZlcjogQXJyYXlCdWZmZXJ9O1xuXG5leHBvcnQgZW51bSBOb3JtYWxpc2VNb2RlIHtcbiAgT2ZmID0gMCxcbiAgUmVndWxhciA9IDEsXG4gIFNtYXJ0ID0gMixcbiAgU21hcnRXaW5kb3cgPSAzLFxuICBGaXhlZCA9IDQsXG59XG5cbmV4cG9ydCBjb25zdCByb2xsID0gKG51bTogbnVtYmVyLCBtaW46IG51bWJlciA9IDAsIG1heDogbnVtYmVyID0gMSkgID0+IG1vZFdpdGhOZWcobnVtIC0gbWluLCBtYXggLSBtaW4pICsgbWluO1xuZXhwb3J0IGNvbnN0IG1vZFdpdGhOZWcgPSAgKHg6IG51bWJlciwgbW9kOiBudW1iZXIpID0+ICgoeCAlIG1vZCkgKyBtb2QpICUgbW9kO1xuZXhwb3J0IGNvbnN0IGNsYW1wID0gKG51bSA6IG51bWJlciwgbWluOiBudW1iZXIgPSAwLCBtYXg6IG51bWJlciA9IDEpID0+IE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCBudW0pKTtcblxuLyoqXG4gKiBTYW1lIGFzIFByb21pc2UuYWxsKGl0ZW1zLm1hcChpdGVtID0+IHRhc2soaXRlbSkpKSwgYnV0IGl0IHdhaXRzIGZvclxuICogdGhlIGZpcnN0IHtiYXRjaFNpemV9IHByb21pc2VzIHRvIGZpbmlzaCBiZWZvcmUgc3RhcnRpbmcgdGhlIG5leHQgYmF0Y2guXG4gKlxuICogQHRlbXBsYXRlIEFcbiAqIEB0ZW1wbGF0ZSBCXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKEEpOiBCfSB0YXNrIFRoZSB0YXNrIHRvIHJ1biBmb3IgZWFjaCBpdGVtLlxuICogQHBhcmFtIHtBW119IGl0ZW1zIEFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSB0YXNrIGZvciBlYWNoIGNhbGwuXG4gKiBAcGFyYW0ge2ludH0gYmF0Y2hTaXplXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxCW10+fVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvbWlzZUFsbEluQmF0Y2hlczxULCBCPih0YXNrIDogKGl0ZW0gOiBUKSA9PiBQcm9taXNlPEI+fEIsIGl0ZW1zIDogVFtdLCBiYXRjaFNpemUgOiBudW1iZXIsIHRvIDogbnVtYmVyID0gMCkgOiBQcm9taXNlPEJbXT4ge1xuICAgIGxldCBwb3NpdGlvbiA9IDA7XG4gICAgbGV0IHJlc3VsdHMgOiBCW10gPSBbXTtcbiAgICB3aGlsZSAocG9zaXRpb24gPCBpdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgaXRlbXNGb3JCYXRjaCA9IGl0ZW1zLnNsaWNlKHBvc2l0aW9uLCBwb3NpdGlvbiArIGJhdGNoU2l6ZSk7XG4gICAgICAgIHJlc3VsdHMgPSBbLi4ucmVzdWx0cywgLi4uYXdhaXQgUHJvbWlzZS5hbGwoaXRlbXNGb3JCYXRjaC5tYXAoaXRlbSA9PiB0YXNrKGl0ZW0pKSldO1xuICAgICAgICBwb3NpdGlvbiArPSBiYXRjaFNpemU7XG4gICAgICAgIGlmICh0byA+IDApIHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCB0bykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcm91bmREaWdpdHMobnVtIDogbnVtYmVyLCBzY2FsZSA6IG51bWJlcikgOiBudW1iZXIge1xuICBpZighKFwiXCIgKyBudW0pLmluY2x1ZGVzKFwiZVwiKSkge1xuICAgIHJldHVybiArKE1hdGgucm91bmQocGFyc2VGbG9hdChudW0gKyBcImUrXCIgKyBzY2FsZSkpICArIFwiZS1cIiArIHNjYWxlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYXJyID0gKFwiXCIgKyBudW0pLnNwbGl0KFwiZVwiKTtcbiAgICB2YXIgc2lnID0gXCJcIlxuICAgIGlmKCthcnJbMV0gKyBzY2FsZSA+IDApIHtcbiAgICAgIHNpZyA9IFwiK1wiO1xuICAgIH1cbiAgICByZXR1cm4gKyhNYXRoLnJvdW5kKHBhcnNlRmxvYXQoK2FyclswXSArIFwiZVwiICsgc2lnICsgKCthcnJbMV0gKyBzY2FsZSkpKSArIFwiZS1cIiArIHNjYWxlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbG9jYWxGb3JtYXROdW1iZXIobnVtIDogbnVtYmVyLCBzY2FsZSA6IG51bWJlcikgOiBzdHJpbmcge1xuICByZXR1cm4gcm91bmREaWdpdHMobnVtLCBzY2FsZSkudG9Mb2NhbGVTdHJpbmcoKTtcbn0iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuICovXG5jb25zdCBwcm94eU1hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsucHJveHlcIik7XG5jb25zdCBjcmVhdGVFbmRwb2ludCA9IFN5bWJvbChcIkNvbWxpbmsuZW5kcG9pbnRcIik7XG5jb25zdCByZWxlYXNlUHJveHkgPSBTeW1ib2woXCJDb21saW5rLnJlbGVhc2VQcm94eVwiKTtcbmNvbnN0IGZpbmFsaXplciA9IFN5bWJvbChcIkNvbWxpbmsuZmluYWxpemVyXCIpO1xuY29uc3QgdGhyb3dNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnRocm93blwiKTtcbmNvbnN0IGlzT2JqZWN0ID0gKHZhbCkgPT4gKHR5cGVvZiB2YWwgPT09IFwib2JqZWN0XCIgJiYgdmFsICE9PSBudWxsKSB8fCB0eXBlb2YgdmFsID09PSBcImZ1bmN0aW9uXCI7XG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZSB0byBoYW5kbGUgb2JqZWN0cyBtYXJrZWQgdG8gcHJveHkuXG4gKi9cbmNvbnN0IHByb3h5VHJhbnNmZXJIYW5kbGVyID0ge1xuICAgIGNhbkhhbmRsZTogKHZhbCkgPT4gaXNPYmplY3QodmFsKSAmJiB2YWxbcHJveHlNYXJrZXJdLFxuICAgIHNlcmlhbGl6ZShvYmopIHtcbiAgICAgICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICBleHBvc2Uob2JqLCBwb3J0MSk7XG4gICAgICAgIHJldHVybiBbcG9ydDIsIFtwb3J0Ml1dO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemUocG9ydCkge1xuICAgICAgICBwb3J0LnN0YXJ0KCk7XG4gICAgICAgIHJldHVybiB3cmFwKHBvcnQpO1xuICAgIH0sXG59O1xuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGVyIHRvIGhhbmRsZSB0aHJvd24gZXhjZXB0aW9ucy5cbiAqL1xuY29uc3QgdGhyb3dUcmFuc2ZlckhhbmRsZXIgPSB7XG4gICAgY2FuSGFuZGxlOiAodmFsdWUpID0+IGlzT2JqZWN0KHZhbHVlKSAmJiB0aHJvd01hcmtlciBpbiB2YWx1ZSxcbiAgICBzZXJpYWxpemUoeyB2YWx1ZSB9KSB7XG4gICAgICAgIGxldCBzZXJpYWxpemVkO1xuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgc2VyaWFsaXplZCA9IHtcbiAgICAgICAgICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHZhbHVlLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHZhbHVlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrOiB2YWx1ZS5zdGFjayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlcmlhbGl6ZWQgPSB7IGlzRXJyb3I6IGZhbHNlLCB2YWx1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbc2VyaWFsaXplZCwgW11dO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemUoc2VyaWFsaXplZCkge1xuICAgICAgICBpZiAoc2VyaWFsaXplZC5pc0Vycm9yKSB7XG4gICAgICAgICAgICB0aHJvdyBPYmplY3QuYXNzaWduKG5ldyBFcnJvcihzZXJpYWxpemVkLnZhbHVlLm1lc3NhZ2UpLCBzZXJpYWxpemVkLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBzZXJpYWxpemVkLnZhbHVlO1xuICAgIH0sXG59O1xuLyoqXG4gKiBBbGxvd3MgY3VzdG9taXppbmcgdGhlIHNlcmlhbGl6YXRpb24gb2YgY2VydGFpbiB2YWx1ZXMuXG4gKi9cbmNvbnN0IHRyYW5zZmVySGFuZGxlcnMgPSBuZXcgTWFwKFtcbiAgICBbXCJwcm94eVwiLCBwcm94eVRyYW5zZmVySGFuZGxlcl0sXG4gICAgW1widGhyb3dcIiwgdGhyb3dUcmFuc2ZlckhhbmRsZXJdLFxuXSk7XG5mdW5jdGlvbiBpc0FsbG93ZWRPcmlnaW4oYWxsb3dlZE9yaWdpbnMsIG9yaWdpbikge1xuICAgIGZvciAoY29uc3QgYWxsb3dlZE9yaWdpbiBvZiBhbGxvd2VkT3JpZ2lucykge1xuICAgICAgICBpZiAob3JpZ2luID09PSBhbGxvd2VkT3JpZ2luIHx8IGFsbG93ZWRPcmlnaW4gPT09IFwiKlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWxsb3dlZE9yaWdpbiBpbnN0YW5jZW9mIFJlZ0V4cCAmJiBhbGxvd2VkT3JpZ2luLnRlc3Qob3JpZ2luKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZnVuY3Rpb24gZXhwb3NlKG9iaiwgZXAgPSBnbG9iYWxUaGlzLCBhbGxvd2VkT3JpZ2lucyA9IFtcIipcIl0pIHtcbiAgICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBjYWxsYmFjayhldikge1xuICAgICAgICBpZiAoIWV2IHx8ICFldi5kYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0FsbG93ZWRPcmlnaW4oYWxsb3dlZE9yaWdpbnMsIGV2Lm9yaWdpbikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBvcmlnaW4gJyR7ZXYub3JpZ2lufScgZm9yIGNvbWxpbmsgcHJveHlgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGlkLCB0eXBlLCBwYXRoIH0gPSBPYmplY3QuYXNzaWduKHsgcGF0aDogW10gfSwgZXYuZGF0YSk7XG4gICAgICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IChldi5kYXRhLmFyZ3VtZW50TGlzdCB8fCBbXSkubWFwKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICBsZXQgcmV0dXJuVmFsdWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLnNsaWNlKDAsIC0xKS5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBwYXRoLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiR0VUXCIgLyogTWVzc2FnZVR5cGUuR0VUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJTRVRcIiAvKiBNZXNzYWdlVHlwZS5TRVQgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFtwYXRoLnNsaWNlKC0xKVswXV0gPSBmcm9tV2lyZVZhbHVlKGV2LmRhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJBUFBMWVwiIC8qIE1lc3NhZ2VUeXBlLkFQUExZICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlLmFwcGx5KHBhcmVudCwgYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiQ09OU1RSVUNUXCIgLyogTWVzc2FnZVR5cGUuQ09OU1RSVUNUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG5ldyByYXdWYWx1ZSguLi5hcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBwcm94eSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkVORFBPSU5UXCIgLyogTWVzc2FnZVR5cGUuRU5EUE9JTlQgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9zZShvYmosIHBvcnQyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJhbnNmZXIocG9ydDEsIFtwb3J0MV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHJldHVyblZhbHVlKVxuICAgICAgICAgICAgLmNhdGNoKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKChyZXR1cm5WYWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyZXR1cm5WYWx1ZSk7XG4gICAgICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHdpcmVWYWx1ZSksIHsgaWQgfSksIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT09IFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi8pIHtcbiAgICAgICAgICAgICAgICAvLyBkZXRhY2ggYW5kIGRlYWN0aXZlIGFmdGVyIHNlbmRpbmcgcmVsZWFzZSByZXNwb25zZSBhYm92ZS5cbiAgICAgICAgICAgICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgY2xvc2VFbmRQb2ludChlcCk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbmFsaXplciBpbiBvYmogJiYgdHlwZW9mIG9ialtmaW5hbGl6ZXJdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqW2ZpbmFsaXplcl0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAvLyBTZW5kIFNlcmlhbGl6YXRpb24gRXJyb3IgVG8gQ2FsbGVyXG4gICAgICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFR5cGVFcnJvcihcIlVuc2VyaWFsaXphYmxlIHJldHVybiB2YWx1ZVwiKSxcbiAgICAgICAgICAgICAgICBbdGhyb3dNYXJrZXJdOiAwLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHdpcmVWYWx1ZSksIHsgaWQgfSksIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoZXAuc3RhcnQpIHtcbiAgICAgICAgZXAuc3RhcnQoKTtcbiAgICB9XG59XG5mdW5jdGlvbiBpc01lc3NhZ2VQb3J0KGVuZHBvaW50KSB7XG4gICAgcmV0dXJuIGVuZHBvaW50LmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTWVzc2FnZVBvcnRcIjtcbn1cbmZ1bmN0aW9uIGNsb3NlRW5kUG9pbnQoZW5kcG9pbnQpIHtcbiAgICBpZiAoaXNNZXNzYWdlUG9ydChlbmRwb2ludCkpXG4gICAgICAgIGVuZHBvaW50LmNsb3NlKCk7XG59XG5mdW5jdGlvbiB3cmFwKGVwLCB0YXJnZXQpIHtcbiAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIFtdLCB0YXJnZXQpO1xufVxuZnVuY3Rpb24gdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNSZWxlYXNlZCkge1xuICAgIGlmIChpc1JlbGVhc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3h5IGhhcyBiZWVuIHJlbGVhc2VkIGFuZCBpcyBub3QgdXNlYWJsZVwiKTtcbiAgICB9XG59XG5mdW5jdGlvbiByZWxlYXNlRW5kcG9pbnQoZXApIHtcbiAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICB0eXBlOiBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovLFxuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgICB9KTtcbn1cbmNvbnN0IHByb3h5Q291bnRlciA9IG5ldyBXZWFrTWFwKCk7XG5jb25zdCBwcm94eUZpbmFsaXplcnMgPSBcIkZpbmFsaXphdGlvblJlZ2lzdHJ5XCIgaW4gZ2xvYmFsVGhpcyAmJlxuICAgIG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoZXApID0+IHtcbiAgICAgICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgLSAxO1xuICAgICAgICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gICAgICAgIGlmIChuZXdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICAgICAgfVxuICAgIH0pO1xuZnVuY3Rpb24gcmVnaXN0ZXJQcm94eShwcm94eSwgZXApIHtcbiAgICBjb25zdCBuZXdDb3VudCA9IChwcm94eUNvdW50ZXIuZ2V0KGVwKSB8fCAwKSArIDE7XG4gICAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICAgIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICAgICAgcHJveHlGaW5hbGl6ZXJzLnJlZ2lzdGVyKHByb3h5LCBlcCwgcHJveHkpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHVucmVnaXN0ZXJQcm94eShwcm94eSkge1xuICAgIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICAgICAgcHJveHlGaW5hbGl6ZXJzLnVucmVnaXN0ZXIocHJveHkpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNyZWF0ZVByb3h5KGVwLCBwYXRoID0gW10sIHRhcmdldCA9IGZ1bmN0aW9uICgpIHsgfSkge1xuICAgIGxldCBpc1Byb3h5UmVsZWFzZWQgPSBmYWxzZTtcbiAgICBjb25zdCBwcm94eSA9IG5ldyBQcm94eSh0YXJnZXQsIHtcbiAgICAgICAgZ2V0KF90YXJnZXQsIHByb3ApIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBpZiAocHJvcCA9PT0gcmVsZWFzZVByb3h5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlclByb3h5KHByb3h5KTtcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICAgICAgICAgICAgICAgICAgaXNQcm94eVJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3AgPT09IFwidGhlblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRoZW46ICgpID0+IHByb3h5IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIgLyogTWVzc2FnZVR5cGUuR0VUICovLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByLnRoZW4uYmluZChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgWy4uLnBhdGgsIHByb3BdKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0KF90YXJnZXQsIHByb3AsIHJhd1ZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgLy8gRklYTUU6IEVTNiBQcm94eSBIYW5kbGVyIGBzZXRgIG1ldGhvZHMgYXJlIHN1cHBvc2VkIHRvIHJldHVybiBhXG4gICAgICAgICAgICAvLyBib29sZWFuLiBUbyBzaG93IGdvb2Qgd2lsbCwgd2UgcmV0dXJuIHRydWUgYXN5bmNocm9ub3VzbHkgwq9cXF8o44OEKV8vwq9cbiAgICAgICAgICAgIGNvbnN0IFt2YWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyYXdWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiU0VUXCIgLyogTWVzc2FnZVR5cGUuU0VUICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IFsuLi5wYXRoLCBwcm9wXS5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBhcHBseShfdGFyZ2V0LCBfdGhpc0FyZywgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgY29uc3QgbGFzdCA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChsYXN0ID09PSBjcmVhdGVFbmRwb2ludCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiRU5EUE9JTlRcIiAvKiBNZXNzYWdlVHlwZS5FTkRQT0lOVCAqLyxcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gV2UganVzdCBwcmV0ZW5kIHRoYXQgYGJpbmQoKWAgZGlkbuKAmXQgaGFwcGVuLlxuICAgICAgICAgICAgaWYgKGxhc3QgPT09IFwiYmluZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBwYXRoLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJBUFBMWVwiIC8qIE1lc3NhZ2VUeXBlLkFQUExZICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnN0cnVjdChfdGFyZ2V0LCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJDT05TVFJVQ1RcIiAvKiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICB9KTtcbiAgICByZWdpc3RlclByb3h5KHByb3h5LCBlcCk7XG4gICAgcmV0dXJuIHByb3h5O1xufVxuZnVuY3Rpb24gbXlGbGF0KGFycikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBhcnIpO1xufVxuZnVuY3Rpb24gcHJvY2Vzc0FyZ3VtZW50cyhhcmd1bWVudExpc3QpIHtcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBhcmd1bWVudExpc3QubWFwKHRvV2lyZVZhbHVlKTtcbiAgICByZXR1cm4gW3Byb2Nlc3NlZC5tYXAoKHYpID0+IHZbMF0pLCBteUZsYXQocHJvY2Vzc2VkLm1hcCgodikgPT4gdlsxXSkpXTtcbn1cbmNvbnN0IHRyYW5zZmVyQ2FjaGUgPSBuZXcgV2Vha01hcCgpO1xuZnVuY3Rpb24gdHJhbnNmZXIob2JqLCB0cmFuc2ZlcnMpIHtcbiAgICB0cmFuc2ZlckNhY2hlLnNldChvYmosIHRyYW5zZmVycyk7XG4gICAgcmV0dXJuIG9iajtcbn1cbmZ1bmN0aW9uIHByb3h5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgeyBbcHJveHlNYXJrZXJdOiB0cnVlIH0pO1xufVxuZnVuY3Rpb24gd2luZG93RW5kcG9pbnQodywgY29udGV4dCA9IGdsb2JhbFRoaXMsIHRhcmdldE9yaWdpbiA9IFwiKlwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcG9zdE1lc3NhZ2U6IChtc2csIHRyYW5zZmVyYWJsZXMpID0+IHcucG9zdE1lc3NhZ2UobXNnLCB0YXJnZXRPcmlnaW4sIHRyYW5zZmVyYWJsZXMpLFxuICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogY29udGV4dC5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRvV2lyZVZhbHVlKHZhbHVlKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgaGFuZGxlcl0gb2YgdHJhbnNmZXJIYW5kbGVycykge1xuICAgICAgICBpZiAoaGFuZGxlci5jYW5IYW5kbGUodmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBbc2VyaWFsaXplZFZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IGhhbmRsZXIuc2VyaWFsaXplKHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkhBTkRMRVJcIiAvKiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIgKi8sXG4gICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzZXJpYWxpemVkVmFsdWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0cmFuc2ZlcmFibGVzLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBcIlJBV1wiIC8qIFdpcmVWYWx1ZVR5cGUuUkFXICovLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyQ2FjaGUuZ2V0KHZhbHVlKSB8fCBbXSxcbiAgICBdO1xufVxuZnVuY3Rpb24gZnJvbVdpcmVWYWx1ZSh2YWx1ZSkge1xuICAgIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgICAgICBjYXNlIFwiSEFORExFUlwiIC8qIFdpcmVWYWx1ZVR5cGUuSEFORExFUiAqLzpcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2ZlckhhbmRsZXJzLmdldCh2YWx1ZS5uYW1lKS5kZXNlcmlhbGl6ZSh2YWx1ZS52YWx1ZSk7XG4gICAgICAgIGNhc2UgXCJSQVdcIiAvKiBXaXJlVmFsdWVUeXBlLlJBVyAqLzpcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS52YWx1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBtc2csIHRyYW5zZmVycykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgICAgICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBsKGV2KSB7XG4gICAgICAgICAgICBpZiAoIWV2LmRhdGEgfHwgIWV2LmRhdGEuaWQgfHwgZXYuZGF0YS5pZCAhPT0gaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBsKTtcbiAgICAgICAgICAgIHJlc29sdmUoZXYuZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXAuc3RhcnQpIHtcbiAgICAgICAgICAgIGVwLnN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbih7IGlkIH0sIG1zZyksIHRyYW5zZmVycyk7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKSB7XG4gICAgcmV0dXJuIG5ldyBBcnJheSg0KVxuICAgICAgICAuZmlsbCgwKVxuICAgICAgICAubWFwKCgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKS50b1N0cmluZygxNikpXG4gICAgICAgIC5qb2luKFwiLVwiKTtcbn1cblxuZXhwb3J0IHsgY3JlYXRlRW5kcG9pbnQsIGV4cG9zZSwgZmluYWxpemVyLCBwcm94eSwgcHJveHlNYXJrZXIsIHJlbGVhc2VQcm94eSwgdHJhbnNmZXIsIHRyYW5zZmVySGFuZGxlcnMsIHdpbmRvd0VuZHBvaW50LCB3cmFwIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21saW5rLm1qcy5tYXBcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiaW1wb3J0ICogYXMgQ29tbGluayBmcm9tIFwiY29tbGlua1wiO1xuXG5pbXBvcnQge1xuICBUeXBlZEFycmF5LFxuICBUaWxlQ29vcmRzLFxuICBMYXRMbmcsXG4gIExhdExuZ1pvb20sXG4gIENvbmZpZ1N0YXRlLFxuICBUaWxlTG9hZFN0YXRlLFxuICBOb3JtYWxpc2VNb2RlXG4gIH0gZnJvbSBcIi4vaGVscGVyc1wiO1xuXG5pbXBvcnQgUE5HIGZyb20gXCIuL3BuZ1wiO1xuXG5leHBvcnQgdHlwZSBOb3JtYWxpc2VSZXN1bHQ8VD4gPSB7XG4gIGRhdGE6IFQsXG4gIG1pbkJlZm9yZTogbnVtYmVyLFxuICBtYXhCZWZvcmU6IG51bWJlcixcbiAgbWluQWZ0ZXI6IG51bWJlcixcbiAgbWF4QWZ0ZXI6IG51bWJlclxufTtcblxuZXhwb3J0IHR5cGUgUHJvY2Vzc29yUHJvZ3Jlc3NQaGFzZSA9ICdzdGl0Y2gnIHwgJ25vcm1hbGlzZSc7XG5cbmV4cG9ydCB0eXBlIFByb2Nlc3NvclByb2dyZXNzVXBkYXRlID0ge1xuICBwaGFzZTogUHJvY2Vzc29yUHJvZ3Jlc3NQaGFzZTtcbiAgY29tcGxldGVkOiBudW1iZXI7XG4gIHRvdGFsOiBudW1iZXI7XG59O1xuXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5VG9TdGxBcmdzID0ge1xuICB3aWR0aCA6IG51bWJlcixcbiAgZGVwdGggOiBudW1iZXIsXG4gIGhlaWdodDogbnVtYmVyXG59O1xuZXhwb3J0IGNvbnN0IHR5cGVkQXJyYXlUb1N0bERlZmF1bHRzIDogVHlwZWRBcnJheVRvU3RsQXJncyA9IHtcbiAgd2lkdGggOiAxMDAsXG4gIGRlcHRoIDogMTAwLFxuICBoZWlnaHQgOiAxMCxcbn07XG5cbmV4cG9ydCB0eXBlIHZlYzMgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG5leHBvcnQgdHlwZSB0cml2ZWMzID0gW3ZlYzMsIHZlYzMsIHZlYzMsIHZlYzNdO1xuXG5leHBvcnQgdHlwZSBOb3JtUmFuZ2UgPSB7ZnJvbSA6IG51bWJlcnxudWxsfHVuZGVmaW5lZCwgdG8gOiBudW1iZXJ8bnVsbHx1bmRlZmluZWR9O1xuZXhwb3J0IGNvbnN0IG5vcm1NYXhSYW5nZSA6IE5vcm1SYW5nZSA9IHtmcm9tOiAtMTA5MjksIHRvOiA4ODQ4fTtcbmV4cG9ydCBjb25zdCBub3JtRGVmYXVsdHMgOiBOb3JtUmFuZ2UgPSB7ZnJvbTogbnVsbCwgdG86IG51bGx9O1xuXG5jb25zdCBwcm9jZXNzb3IgPSB7XG4gIG5vcm1hbGlzZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXl8bnVtYmVyW10+KGlucCA6IFQsIG5vcm06IE5vcm1SYW5nZSkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xuICAgIGxldCBicGUgPSAyO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShpbnApKSB7XG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgIGJwZSA9IDI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXG4gICAgLy9AdHMtaWdub3JlXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1heChwcmV2LCBjdXIpLCAwKTtcbiAgICAvL0B0cy1pZ25vcmVcbiAgICBjb25zdCBtaW4gPSAodHlwZW9mIG5vcm0uZnJvbSA9PT0gJ251bWJlcicpID8gbm9ybS5mcm9tIDogaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1pbihwcmV2LCBjdXIpLCBtYXgpO1xuICAgIGNvbnN0IG5ld01heCA9IE1hdGgucG93KDIsIGJwZSAqIDgpO1xuICAgIGNvbnN0IG5ld01pbiA9IDA7XG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xuICAgICAgZWxzZSBpZiAoYSA8PSBtaW4pIGlucFtpbmRleF0gPSBuZXdNaW47XG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xuICAgIH0pO1xuICAgIHJldHVybiB7XG4gICAgICBkYXRhOiBpbnAsXG4gICAgICBtaW5CZWZvcmU6IG1pbixcbiAgICAgIG1heEJlZm9yZTogbWF4LFxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXG4gICAgfTtcbiAgfSxcbiAgbm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBULCBub3JtOiBOb3JtUmFuZ2UpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcbiAgICBsZXQgYnBlID0gMjtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICBicGUgPSAyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxuXG4gICAgY29uc3QgbnVtU3RkRGV2aWF0aW9ucyA9IDEwO1xuXG4gICAgLy8gRm9yIHNvbWUgcmVhc29uLCB0eXBlc2NyaXB0IGRvZXMgbm90IHRoaW5rIHRoZSByZWR1Y2UgZnVuY3Rpb24gYXNcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcbiAgICAvL0B0cy1pZ25vcmVcbiAgICBjb25zdCBtZWFuID0gaW5wLnJlZHVjZSgoYSA6IG51bWJlciwgYiA6IG51bWJlcikgPT4gYSArIGIpIC8gblxuICAgIC8vQHRzLWlnbm9yZVxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXG4gICAgLy9AdHMtaWdub3JlXG4gICAgY29uc3QgYWN0dWFsTWF4ID0gaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1heChwcmV2LCBjdXIpLCAwKTtcbiAgICBjb25zdCBtYXggPSAodHlwZW9mIG5vcm0udG8gPT09ICdudW1iZXInKSA/IG5vcm0udG8gOiBNYXRoLm1pbihtZWFuK3N0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1heCk7XG4gICAgLy9AdHMtaWdub3JlXG4gICAgY29uc3QgYWN0dWFsTWluID0gaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1pbihwcmV2LCBjdXIpLCBtYXgpO1xuICAgIGNvbnN0IG1pbiA9ICh0eXBlb2Ygbm9ybS5mcm9tID09PSAnbnVtYmVyJykgPyBub3JtLmZyb20gOiBNYXRoLm1heChtZWFuLXN0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1pbik7XG5cbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KTtcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcbiAgICAgIGlmIChhID49IG1heCkgaW5wW2luZGV4XSA9IG5ld01heDtcbiAgICAgIGVsc2UgaWYgKGEgPD0gbWluKSBpbnBbaW5kZXhdID0gbmV3TWluO1xuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgZGF0YTogaW5wLFxuICAgICAgbWluQmVmb3JlOiBhY3R1YWxNaW4sXG4gICAgICBtYXhCZWZvcmU6IGFjdHVhbE1heCxcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXG4gICAgICBtYXhBZnRlcjogbmV3TWF4LFxuICAgIH07XG4gIH0sXG4gIG5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydFdpbmRvdzxUIGV4dGVuZHMgVHlwZWRBcnJheT4oaW5wIDogVCwgbm9ybTogTm9ybVJhbmdlKSA6IE5vcm1hbGlzZVJlc3VsdDxUPiB7XG4gICAgbGV0IGJwZSA9IDI7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcbiAgICAgIGlmIChpbnAgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgYnBlID0gMjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJwZSA9IGlucC5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgbiA9IGlucC5sZW5ndGhcblxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcblxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXG4gICAgLy9AdHMtaWdub3JlXG4gICAgY29uc3QgbWVhbiA9IGlucC5yZWR1Y2UoKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpID0+IGEgKyBiKSAvIG5cbiAgICAvL0B0cy1pZ25vcmVcbiAgICBjb25zdCBzdGRkZXYgPSBNYXRoLnNxcnQoaW5wLm1hcCh4ID0+IE1hdGgucG93KHggLSBtZWFuLCAyKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYikgLyBuKVxuXG4gICAgY29uc3QgZXhjbHVkZSA9IDAuMDAwNTtcbiAgICBjb25zdCBjb3B5ID0gaW5wLnNsaWNlKDApO1xuICAgIGNvcHkuc29ydCgpO1xuICAgIGNvbnN0IG9mZnNldCA9IE1hdGguY2VpbChjb3B5Lmxlbmd0aCAqIGV4Y2x1ZGUpO1xuICAgIGNvbnN0IGxlbmd0aCA9IE1hdGguZmxvb3IoY29weS5sZW5ndGggKiAoMS1leGNsdWRlKjIpKTtcbiAgICBjb25zdCB3aW5kb3dlZENvcHkgPSBjb3B5LnN1YmFycmF5KG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIC8vQHRzLWlnbm9yZVxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGNvcHlbY29weS5sZW5ndGgtMV07XG4gICAgY29uc3Qgd2luZG93ZWRNYXggPSB3aW5kb3dlZENvcHlbd2luZG93ZWRDb3B5Lmxlbmd0aC0xXTtcbiAgICAvL0B0cy1pZ25vcmVcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBjb3B5WzBdO1xuICAgIGNvbnN0IHdpbmRvd2VkTWluID0gd2luZG93ZWRDb3B5WzBdO1xuXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogKHdpbmRvd2VkTWF4ICsgc3RkZGV2KSA+IGFjdHVhbE1heCA/IGFjdHVhbE1heCA6IHdpbmRvd2VkTWF4O1xuICAgIGNvbnN0IG1pbiA9ICh0eXBlb2Ygbm9ybS5mcm9tID09PSAnbnVtYmVyJykgPyBub3JtLmZyb20gOiAod2luZG93ZWRNaW4gLSBzdGRkZXYpIDwgYWN0dWFsTWluID8gYWN0dWFsTWluIDogd2luZG93ZWRNaW47XG5cbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KS0xO1xuICAgIGNvbnN0IG5ld01pbiA9IDA7XG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xuICAgICAgZWxzZSBpZiAoYSA8PSBtaW4pIGlucFtpbmRleF0gPSBuZXdNaW47XG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xuICAgIH0pO1xuICAgIHJldHVybiB7XG4gICAgICBkYXRhOiBpbnAsXG4gICAgICBtaW5CZWZvcmU6IG1pbixcbiAgICAgIG1heEJlZm9yZTogbWF4LFxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXG4gICAgfTtcbiAgfSxcbiAgY29tYmluZUltYWdlcyhcbiAgICBzdGF0ZXMgOiBUaWxlTG9hZFN0YXRlW10sXG4gICAgbm9ybWFsaXNlTW9kZSA6IG51bWJlciA9IE5vcm1hbGlzZU1vZGUuUmVndWxhcixcbiAgICBub3JtIDogTm9ybVJhbmdlID0gbm9ybURlZmF1bHRzLFxuICAgIHByb2dyZXNzPzogKHVwZGF0ZTogUHJvY2Vzc29yUHJvZ3Jlc3NVcGRhdGUpID0+IHZvaWRcbiAgKSA6IE5vcm1hbGlzZVJlc3VsdDxGbG9hdDMyQXJyYXk+IHtcbiAgICBjb25zdCBhcmVhID0gc3RhdGVzWzBdLndpZHRoICogc3RhdGVzWzBdLmhlaWdodDtcbiAgICBsZXQgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShhcmVhKTtcbiAgICBjb25zdCB0aWxlV2lkdGggPSAyNTY7XG4gICAgY29uc3QgaW5jcmVtZW50ID0gMS90aWxlV2lkdGg7XG4gICAgY29uc3QgcmVwb3J0UHJvZ3Jlc3MgPSAocGhhc2U6IFByb2Nlc3NvclByb2dyZXNzUGhhc2UsIGNvbXBsZXRlZDogbnVtYmVyLCB0b3RhbDogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHByb2dyZXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHByb2dyZXNzKHtwaGFzZSwgY29tcGxldGVkLCB0b3RhbH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgY29uc3QgbWFwIDogUmVjb3JkPG51bWJlciwgUmVjb3JkPG51bWJlciwgVGlsZUxvYWRTdGF0ZT4+ID0ge307XG4gICAgZm9yIChsZXQgdGlsZSBvZiBzdGF0ZXMpIHtcbiAgICAgIGlmICghbWFwW3RpbGUueF0pIHtcbiAgICAgICAgbWFwW3RpbGUueF0gPSB7fTtcbiAgICAgIH1cbiAgICAgIG1hcFt0aWxlLnhdW3RpbGUueV0gPSB0aWxlO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dGVudCA9IHtcbiAgICAgIHgxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueCAtIHN0YXRlc1swXS53aWR0aEluVGlsZXMvMixcbiAgICAgIHgyOiBzdGF0ZXNbMF0uZXhhY3RQb3MueCArIHN0YXRlc1swXS53aWR0aEluVGlsZXMvMixcbiAgICAgIHkxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSAtIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzIsXG4gICAgICB5Mjogc3RhdGVzWzBdLmV4YWN0UG9zLnkgKyBzdGF0ZXNbMF0uaGVpZ2h0SW5UaWxlcy8yXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWxSb3dzID0gc3RhdGVzWzBdLmhlaWdodCB8fCAwO1xuICAgIGNvbnN0IHJvd0ludGVydmFsID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih0b3RhbFJvd3MgLyA1MCkpO1xuICAgIGxldCBwcm9jZXNzZWRSb3dzID0gMDtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChsZXQgeSA9IGV4dGVudC55MTsgeSA8IGV4dGVudC55MjsgeSArPSBpbmNyZW1lbnQpIHtcbiAgICAgIGZvciAobGV0IHggPSBleHRlbnQueDE7IHggPCBleHRlbnQueDI7IHggKz0gaW5jcmVtZW50KSB7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB7XG4gICAgICAgICAgeDogTWF0aC5mbG9vcih4KSxcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKHkpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHB4ID0ge1xuICAgICAgICAgIHg6IE1hdGguZmxvb3IoKHglMSkqdGlsZVdpZHRoKSxcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKCh5JTEpKnRpbGVXaWR0aClcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgaWR4ID0gcHgueSp0aWxlV2lkdGggKyBweC54O1xuICAgICAgICBpZiAodHlwZW9mIG1hcFt0aWxlLnhdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgeCB2YWx1ZSAke3RpbGUueH0gd2FzIHVuZGVmaW5lZGApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBtYXBbdGlsZS54XVt0aWxlLnldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgeSB2YWx1ZSAke3RpbGUueX0gd2FzIHVuZGVmaW5lZGApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dHB1dFtpKytdID0gbWFwW3RpbGUueF1bdGlsZS55XS5oZWlnaHRzW2lkeF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHByb2Nlc3NlZFJvd3MrKztcbiAgICAgIGlmIChwcm9jZXNzZWRSb3dzICUgcm93SW50ZXJ2YWwgPT09IDAgfHwgcHJvY2Vzc2VkUm93cyA9PT0gdG90YWxSb3dzKSB7XG4gICAgICAgIHJlcG9ydFByb2dyZXNzKCdzdGl0Y2gnLCBwcm9jZXNzZWRSb3dzLCBNYXRoLm1heCgxLCB0b3RhbFJvd3MpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGV0IHJlc3VsdCA9IHtcbiAgICAgIGRhdGE6IG91dHB1dCxcbiAgICAgIG1pbkJlZm9yZTogTWF0aC5wb3coMiwgMzIpLFxuICAgICAgbWF4QmVmb3JlOiAwLFxuICAgICAgbWluQWZ0ZXI6IE1hdGgucG93KDIsIDMyKSxcbiAgICAgIG1heEFmdGVyOiAwLFxuICAgIH07XG4gICAgcmVwb3J0UHJvZ3Jlc3MoJ25vcm1hbGlzZScsIDAsIDEpO1xuICAgIGlmIChcbiAgICAgIG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5SZWd1bGFyIHx8XG4gICAgICAoXG4gICAgICAgIHR5cGVvZiBub3JtLmZyb20gPT0gJ251bWJlcicgJiZcbiAgICAgICAgdHlwZW9mIG5vcm0udG8gPT0gJ251bWJlcidcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMubm9ybWFsaXNlVHlwZWRBcnJheShvdXRwdXQsIG5vcm0pO1xuICAgIH0gZWxzZSBpZiAobm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlNtYXJ0KSB7XG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydChvdXRwdXQsIG5vcm0pO1xuICAgIH0gZWxzZSBpZiAobm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlNtYXJ0V2luZG93KSB7XG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydFdpbmRvdyhvdXRwdXQsIG5vcm0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXN1bHQubWF4QWZ0ZXIgPSBNYXRoLm1heChvdXRwdXRbaV0sIHJlc3VsdC5tYXhBZnRlcik7XG4gICAgICAgIHJlc3VsdC5taW5BZnRlciA9IE1hdGgubWluKG91dHB1dFtpXSwgcmVzdWx0Lm1pbkFmdGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5tYXhCZWZvcmUgPSByZXN1bHQubWF4QWZ0ZXI7XG4gICAgICByZXN1bHQubWluQmVmb3JlID0gcmVzdWx0Lm1pbkFmdGVyO1xuICAgIH1cbiAgICByZXBvcnRQcm9ncmVzcygnbm9ybWFsaXNlJywgMSwgMSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgdHlwZWRBcnJheVRvU3RsKFxuICAgIHBvaW50czogVHlwZWRBcnJheSxcbiAgICB3aWR0aHB4IDogbnVtYmVyLFxuICAgIGhlaWdodHB4IDogbnVtYmVyLFxuICAgIHt3aWR0aCwgZGVwdGgsIGhlaWdodH0gOiBUeXBlZEFycmF5VG9TdGxBcmdzID0gdHlwZWRBcnJheVRvU3RsRGVmYXVsdHNcbiAgKSA6IEFycmF5QnVmZmVyIHtcbiAgICBjb25zdCBkYXRhTGVuZ3RoID0gKCh3aWR0aHB4KSAqIChoZWlnaHRweCkpICogNTA7XG4gICAgY29uc29sZS5sb2cocG9pbnRzLmxlbmd0aCwgZGF0YUxlbmd0aCk7XG4gICAgY29uc3Qgc2l6ZSA9IDgwICsgNCArIGRhdGFMZW5ndGg7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGRhdGFMZW5ndGgpO1xuICAgIGNvbnN0IGR2ID0gbmV3IERhdGFWaWV3KHJlc3VsdCk7XG4gICAgZHYuc2V0VWludDMyKDgwLCAod2lkdGhweC0xKSooaGVpZ2h0cHgtMSksIHRydWUpO1xuXG4gICAgLy9AdHMtaWdub3JlXG4gICAgY29uc3QgbWF4ID0gcG9pbnRzLnJlZHVjZSgoYWNjLCBwb2ludCkgPT4gTWF0aC5tYXgocG9pbnQsIGFjYyksIDApO1xuXG4gICAgY29uc3QgbyA9ICh4IDogbnVtYmVyLCB5IDogbnVtYmVyKSA6IG51bWJlciA9PiAoeSAqIHdpZHRocHgpICsgeDtcbiAgICBjb25zdCBuID0gKHAxIDogdmVjMywgcDIgOiB2ZWMzLCBwMzogdmVjMykgOiB2ZWMzID0+IHtcbiAgICAgIGNvbnN0IEEgPSBbcDJbMF0gLSBwMVswXSwgcDJbMV0gLSBwMVsxXSwgcDJbMl0gLSBwMVsyXV07XG4gICAgICBjb25zdCBCID0gW3AzWzBdIC0gcDFbMF0sIHAzWzFdIC0gcDFbMV0sIHAzWzJdIC0gcDFbMl1dO1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgQVsxXSAqIEJbMl0gLSBBWzJdICogQlsxXSxcbiAgICAgICAgQVsyXSAqIEJbMF0gLSBBWzBdICogQlsyXSxcbiAgICAgICAgQVswXSAqIEJbMV0gLSBBWzFdICogQlswXVxuICAgICAgXVxuICAgIH1cbiAgICBjb25zdCBwdCA9ICh0cmlzIDogdHJpdmVjMywgb2ZmIDogbnVtYmVyKSA9PiB7XG4gICAgICB0cmlzLmZsYXQoKS5mb3JFYWNoKChmbHQgOiBudW1iZXIsIGkgOiBudW1iZXIpID0+IHtcbiAgICAgICAgZHYuc2V0RmxvYXQzMihvZmYgKyAoaSAqIDQpLCBmbHQsIHRydWUpO1xuICAgICAgfSk7XG4gICAgICAvLyBkdi5zZXRVaW50MTYob2ZmKzQ4LCAwLCB0cnVlKTtcbiAgICB9XG5cbiAgICBsZXQgb2ZmID0gODQ7XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCAod2lkdGhweCAtIDEpOyB4ICs9IDIpIHtcbiAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgKGhlaWdodHB4IC0gMSk7IHkrKykge1xuICAgICAgICBjb25zdCB0cmkxIDogdHJpdmVjMyA9IFtcbiAgICAgICAgICBbMCwwLDBdLCAvLyBub3JtYWxcbiAgICAgICAgICBbICB4LCAgIHksIHBvaW50c1tvKHgseSldL21heF0sIC8vIHYxXG4gICAgICAgICAgW3grMSwgICB5LCBwb2ludHNbbyh4KzEseSldL21heF0sIC8vIHYyXG4gICAgICAgICAgWyAgeCwgeSsxLCBwb2ludHNbbyh4LHkrMSldL21heF0sIC8vIHYzXG4gICAgICAgIF07XG4gICAgICAgIC8vIHRyaTFbMF0gPSBuKHRyaTFbMV0sIHRyaTFbMl0sIHRyaTFbM10pO1xuICAgICAgICBwdCh0cmkxLCBvZmYpO1xuICAgICAgICBvZmYgKz0gNTA7XG5cbiAgICAgICAgY29uc3QgdHJpMiA6IHRyaXZlYzMgPSBbXG4gICAgICAgICAgWzAsMCwwXSwgLy8gbm9ybWFsXG4gICAgICAgICAgW3grMSwgICB5LCBwb2ludHNbbyh4KzEseSldL21heF0sIC8vIHYxXG4gICAgICAgICAgW3grMSwgeSsxLCBwb2ludHNbbyh4KzEseSsxKV0vbWF4XSwgLy8gdjJcbiAgICAgICAgICBbICB4LCB5KzEsIHBvaW50c1tvKHgseSsxKV0vbWF4XSwgLy8gdjNcbiAgICAgICAgXTtcbiAgICAgICAgLy8gdHJpMlswXSA9IG4odHJpMlsxXSwgdHJpMlsyXSwgdHJpMlszXSk7XG4gICAgICAgIHB0KHRyaTIsIG9mZik7XG4gICAgICAgIG9mZiArPSA1MDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFByb2Nlc3NvcldvcmtlciA9IHR5cGVvZiBwcm9jZXNzb3I7XG5cbkNvbWxpbmsuZXhwb3NlKHByb2Nlc3Nvcik7Il0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9