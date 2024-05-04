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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBRVYsSUFBTSxJQUFJLEdBQWE7b0JBQ3JCLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7b0JBQ1AsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUM7b0JBQ2hDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUM7b0JBQ2xDLENBQUcsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSztpQkFDeEMsQ0FBQztnQkFDRiwwQ0FBMEM7Z0JBQzFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsR0FBRyxJQUFJLEVBQUUsQ0FBQzthQUNYO1NBQ0Y7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFFRCwyQ0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9zcmMvaGVscGVycy50cyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL25vZGVfbW9kdWxlcy9jb21saW5rL2Rpc3QvZXNtL2NvbWxpbmsubWpzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9zcmMvcHJvY2Vzc29yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBmb3JtYXQgPSAoc3RyIDogc3RyaW5nLCBvYmogOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmd8bnVtYmVyPikgOiBzdHJpbmcgPT4ge1xyXG4gIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XHJcbiAgICBzdHIgPSBzdHIucmVwbGFjZShgeyR7a2V5fX1gLCB2YWx1ZS50b1N0cmluZygpKTtcclxuICB9XHJcbiAgcmV0dXJuIHN0cjtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXkgPVxyXG4gIHwgSW50OEFycmF5XHJcbiAgfCBVaW50OEFycmF5XHJcbiAgfCBVaW50OENsYW1wZWRBcnJheVxyXG4gIHwgSW50MTZBcnJheVxyXG4gIHwgVWludDE2QXJyYXlcclxuICB8IEludDMyQXJyYXlcclxuICB8IFVpbnQzMkFycmF5XHJcbiAgfCBGbG9hdDMyQXJyYXlcclxuICB8IEZsb2F0NjRBcnJheTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGlsZUNvb3JkcyB7XHJcbiAgeDogbnVtYmVyLFxyXG4gIHk6IG51bWJlcixcclxuICB6OiBudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIExhdExuZyB7XHJcbiAgbGF0aXR1ZGU6IG51bWJlcixcclxuICBsb25naXR1ZGU6IG51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgTGF0TG5nWm9vbSBleHRlbmRzIExhdExuZyB7XHJcbiAgem9vbTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbmZpZ1N0YXRlID0gVGlsZUNvb3JkcyAmIExhdExuZ1pvb20gJiB7XHJcbiAgd2lkdGggOiBudW1iZXIsXHJcbiAgaGVpZ2h0IDogbnVtYmVyLFxyXG4gIGV4YWN0UG9zIDogVGlsZUNvb3JkcyxcclxuICB3aWR0aEluVGlsZXMgOiBudW1iZXIsXHJcbiAgaGVpZ2h0SW5UaWxlcyA6IG51bWJlcixcclxuICBzdGFydHg6IG51bWJlcixcclxuICBzdGFydHk6IG51bWJlcixcclxuICBlbmR4OiBudW1iZXIsXHJcbiAgZW5keTogbnVtYmVyLFxyXG4gIHN0YXR1czogc3RyaW5nLFxyXG4gIGJvdW5kczogW0xhdExuZywgTGF0TG5nXSxcclxuICBwaHlzOiB7d2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9LFxyXG4gIG1pbjoge3k6IG51bWJlciwgeDogbnVtYmVyfSxcclxuICBtYXg6IHt5OiBudW1iZXIsIHg6IG51bWJlcn0sXHJcbiAgdHlwZTogJ2FsYmVkbyd8J2hlaWdodG1hcCcsXHJcbiAgdXJsOiBzdHJpbmcsXHJcbn07XHJcblxyXG5pbXBvcnQgUE5HIGZyb20gXCIuL3BuZ1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgVGlsZUxvYWRTdGF0ZSA9IENvbmZpZ1N0YXRlICYge3g6IG51bWJlciwgeTogbnVtYmVyLCBoZWlnaHRzOiBGbG9hdDMyQXJyYXl8VWludDhBcnJheSwgYnVmZmVyOiBBcnJheUJ1ZmZlcn07XHJcblxyXG5leHBvcnQgZW51bSBOb3JtYWxpc2VNb2RlIHtcclxuICBPZmYgPSAwLFxyXG4gIFJlZ3VsYXIgPSAxLFxyXG4gIFNtYXJ0ID0gMixcclxuICBTbWFydFdpbmRvdyA9IDMsXHJcbiAgRml4ZWQgPSA0LFxyXG59XHJcblxyXG5leHBvcnQgY29uc3Qgcm9sbCA9IChudW06IG51bWJlciwgbWluOiBudW1iZXIgPSAwLCBtYXg6IG51bWJlciA9IDEpICA9PiBtb2RXaXRoTmVnKG51bSAtIG1pbiwgbWF4IC0gbWluKSArIG1pbjtcclxuZXhwb3J0IGNvbnN0IG1vZFdpdGhOZWcgPSAgKHg6IG51bWJlciwgbW9kOiBudW1iZXIpID0+ICgoeCAlIG1vZCkgKyBtb2QpICUgbW9kO1xyXG5leHBvcnQgY29uc3QgY2xhbXAgPSAobnVtIDogbnVtYmVyLCBtaW46IG51bWJlciA9IDAsIG1heDogbnVtYmVyID0gMSkgPT4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIG51bSkpO1xyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgUHJvbWlzZS5hbGwoaXRlbXMubWFwKGl0ZW0gPT4gdGFzayhpdGVtKSkpLCBidXQgaXQgd2FpdHMgZm9yXHJcbiAqIHRoZSBmaXJzdCB7YmF0Y2hTaXplfSBwcm9taXNlcyB0byBmaW5pc2ggYmVmb3JlIHN0YXJ0aW5nIHRoZSBuZXh0IGJhdGNoLlxyXG4gKlxyXG4gKiBAdGVtcGxhdGUgQVxyXG4gKiBAdGVtcGxhdGUgQlxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKEEpOiBCfSB0YXNrIFRoZSB0YXNrIHRvIHJ1biBmb3IgZWFjaCBpdGVtLlxyXG4gKiBAcGFyYW0ge0FbXX0gaXRlbXMgQXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIHRhc2sgZm9yIGVhY2ggY2FsbC5cclxuICogQHBhcmFtIHtpbnR9IGJhdGNoU2l6ZVxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxCW10+fVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb21pc2VBbGxJbkJhdGNoZXM8VCwgQj4odGFzayA6IChpdGVtIDogVCkgPT4gUHJvbWlzZTxCPnxCLCBpdGVtcyA6IFRbXSwgYmF0Y2hTaXplIDogbnVtYmVyLCB0byA6IG51bWJlciA9IDApIDogUHJvbWlzZTxCW10+IHtcclxuICAgIGxldCBwb3NpdGlvbiA9IDA7XHJcbiAgICBsZXQgcmVzdWx0cyA6IEJbXSA9IFtdO1xyXG4gICAgd2hpbGUgKHBvc2l0aW9uIDwgaXRlbXMubGVuZ3RoKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbXNGb3JCYXRjaCA9IGl0ZW1zLnNsaWNlKHBvc2l0aW9uLCBwb3NpdGlvbiArIGJhdGNoU2l6ZSk7XHJcbiAgICAgICAgcmVzdWx0cyA9IFsuLi5yZXN1bHRzLCAuLi5hd2FpdCBQcm9taXNlLmFsbChpdGVtc0ZvckJhdGNoLm1hcChpdGVtID0+IHRhc2soaXRlbSkpKV07XHJcbiAgICAgICAgcG9zaXRpb24gKz0gYmF0Y2hTaXplO1xyXG4gICAgICAgIGlmICh0byA+IDApIHtcclxuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRvKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByb3VuZERpZ2l0cyhudW0gOiBudW1iZXIsIHNjYWxlIDogbnVtYmVyKSA6IG51bWJlciB7XHJcbiAgaWYoIShcIlwiICsgbnVtKS5pbmNsdWRlcyhcImVcIikpIHtcclxuICAgIHJldHVybiArKE1hdGgucm91bmQocGFyc2VGbG9hdChudW0gKyBcImUrXCIgKyBzY2FsZSkpICArIFwiZS1cIiArIHNjYWxlKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIGFyciA9IChcIlwiICsgbnVtKS5zcGxpdChcImVcIik7XHJcbiAgICB2YXIgc2lnID0gXCJcIlxyXG4gICAgaWYoK2FyclsxXSArIHNjYWxlID4gMCkge1xyXG4gICAgICBzaWcgPSBcIitcIjtcclxuICAgIH1cclxuICAgIHJldHVybiArKE1hdGgucm91bmQocGFyc2VGbG9hdCgrYXJyWzBdICsgXCJlXCIgKyBzaWcgKyAoK2FyclsxXSArIHNjYWxlKSkpICsgXCJlLVwiICsgc2NhbGUpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvY2FsRm9ybWF0TnVtYmVyKG51bSA6IG51bWJlciwgc2NhbGUgOiBudW1iZXIpIDogc3RyaW5nIHtcclxuICByZXR1cm4gcm91bmREaWdpdHMobnVtLCBzY2FsZSkudG9Mb2NhbGVTdHJpbmcoKTtcclxufSIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG4gKi9cbmNvbnN0IHByb3h5TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay5wcm94eVwiKTtcbmNvbnN0IGNyZWF0ZUVuZHBvaW50ID0gU3ltYm9sKFwiQ29tbGluay5lbmRwb2ludFwiKTtcbmNvbnN0IHJlbGVhc2VQcm94eSA9IFN5bWJvbChcIkNvbWxpbmsucmVsZWFzZVByb3h5XCIpO1xuY29uc3QgZmluYWxpemVyID0gU3ltYm9sKFwiQ29tbGluay5maW5hbGl6ZXJcIik7XG5jb25zdCB0aHJvd01hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsudGhyb3duXCIpO1xuY29uc3QgaXNPYmplY3QgPSAodmFsKSA9PiAodHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIiAmJiB2YWwgIT09IG51bGwpIHx8IHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIjtcbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlIHRvIGhhbmRsZSBvYmplY3RzIG1hcmtlZCB0byBwcm94eS5cbiAqL1xuY29uc3QgcHJveHlUcmFuc2ZlckhhbmRsZXIgPSB7XG4gICAgY2FuSGFuZGxlOiAodmFsKSA9PiBpc09iamVjdCh2YWwpICYmIHZhbFtwcm94eU1hcmtlcl0sXG4gICAgc2VyaWFsaXplKG9iaikge1xuICAgICAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgIGV4cG9zZShvYmosIHBvcnQxKTtcbiAgICAgICAgcmV0dXJuIFtwb3J0MiwgW3BvcnQyXV07XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZShwb3J0KSB7XG4gICAgICAgIHBvcnQuc3RhcnQoKTtcbiAgICAgICAgcmV0dXJuIHdyYXAocG9ydCk7XG4gICAgfSxcbn07XG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZXIgdG8gaGFuZGxlIHRocm93biBleGNlcHRpb25zLlxuICovXG5jb25zdCB0aHJvd1RyYW5zZmVySGFuZGxlciA9IHtcbiAgICBjYW5IYW5kbGU6ICh2YWx1ZSkgPT4gaXNPYmplY3QodmFsdWUpICYmIHRocm93TWFya2VyIGluIHZhbHVlLFxuICAgIHNlcmlhbGl6ZSh7IHZhbHVlIH0pIHtcbiAgICAgICAgbGV0IHNlcmlhbGl6ZWQ7XG4gICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBzZXJpYWxpemVkID0ge1xuICAgICAgICAgICAgICAgIGlzRXJyb3I6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogdmFsdWUubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdmFsdWUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc3RhY2s6IHZhbHVlLnN0YWNrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VyaWFsaXplZCA9IHsgaXNFcnJvcjogZmFsc2UsIHZhbHVlIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtzZXJpYWxpemVkLCBbXV07XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZShzZXJpYWxpemVkKSB7XG4gICAgICAgIGlmIChzZXJpYWxpemVkLmlzRXJyb3IpIHtcbiAgICAgICAgICAgIHRocm93IE9iamVjdC5hc3NpZ24obmV3IEVycm9yKHNlcmlhbGl6ZWQudmFsdWUubWVzc2FnZSksIHNlcmlhbGl6ZWQudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IHNlcmlhbGl6ZWQudmFsdWU7XG4gICAgfSxcbn07XG4vKipcbiAqIEFsbG93cyBjdXN0b21pemluZyB0aGUgc2VyaWFsaXphdGlvbiBvZiBjZXJ0YWluIHZhbHVlcy5cbiAqL1xuY29uc3QgdHJhbnNmZXJIYW5kbGVycyA9IG5ldyBNYXAoW1xuICAgIFtcInByb3h5XCIsIHByb3h5VHJhbnNmZXJIYW5kbGVyXSxcbiAgICBbXCJ0aHJvd1wiLCB0aHJvd1RyYW5zZmVySGFuZGxlcl0sXG5dKTtcbmZ1bmN0aW9uIGlzQWxsb3dlZE9yaWdpbihhbGxvd2VkT3JpZ2lucywgb3JpZ2luKSB7XG4gICAgZm9yIChjb25zdCBhbGxvd2VkT3JpZ2luIG9mIGFsbG93ZWRPcmlnaW5zKSB7XG4gICAgICAgIGlmIChvcmlnaW4gPT09IGFsbG93ZWRPcmlnaW4gfHwgYWxsb3dlZE9yaWdpbiA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhbGxvd2VkT3JpZ2luIGluc3RhbmNlb2YgUmVnRXhwICYmIGFsbG93ZWRPcmlnaW4udGVzdChvcmlnaW4pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBleHBvc2Uob2JqLCBlcCA9IGdsb2JhbFRoaXMsIGFsbG93ZWRPcmlnaW5zID0gW1wiKlwiXSkge1xuICAgIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGNhbGxiYWNrKGV2KSB7XG4gICAgICAgIGlmICghZXYgfHwgIWV2LmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzQWxsb3dlZE9yaWdpbihhbGxvd2VkT3JpZ2lucywgZXYub3JpZ2luKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBJbnZhbGlkIG9yaWdpbiAnJHtldi5vcmlnaW59JyBmb3IgY29tbGluayBwcm94eWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgaWQsIHR5cGUsIHBhdGggfSA9IE9iamVjdC5hc3NpZ24oeyBwYXRoOiBbXSB9LCBldi5kYXRhKTtcbiAgICAgICAgY29uc3QgYXJndW1lbnRMaXN0ID0gKGV2LmRhdGEuYXJndW1lbnRMaXN0IHx8IFtdKS5tYXAoZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIGxldCByZXR1cm5WYWx1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGguc2xpY2UoMCwgLTEpLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICAgICAgICBjb25zdCByYXdWYWx1ZSA9IHBhdGgucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJHRVRcIiAvKiBNZXNzYWdlVHlwZS5HRVQgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIlNFVFwiIC8qIE1lc3NhZ2VUeXBlLlNFVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50W3BhdGguc2xpY2UoLTEpWzBdXSA9IGZyb21XaXJlVmFsdWUoZXYuZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkFQUExZXCIgLyogTWVzc2FnZVR5cGUuQVBQTFkgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWUuYXBwbHkocGFyZW50LCBhcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJDT05TVFJVQ1RcIiAvKiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbmV3IHJhd1ZhbHVlKC4uLmFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHByb3h5KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiRU5EUE9JTlRcIiAvKiBNZXNzYWdlVHlwZS5FTkRQT0lOVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cmFuc2Zlcihwb3J0MSwgW3BvcnQxXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBQcm9taXNlLnJlc29sdmUocmV0dXJuVmFsdWUpXG4gICAgICAgICAgICAuY2F0Y2goKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oKHJldHVyblZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJldHVyblZhbHVlKTtcbiAgICAgICAgICAgIGVwLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgd2lyZVZhbHVlKSwgeyBpZCB9KSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLykge1xuICAgICAgICAgICAgICAgIC8vIGRldGFjaCBhbmQgZGVhY3RpdmUgYWZ0ZXIgc2VuZGluZyByZWxlYXNlIHJlc3BvbnNlIGFib3ZlLlxuICAgICAgICAgICAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgICAgICAgICAgICAgICBpZiAoZmluYWxpemVyIGluIG9iaiAmJiB0eXBlb2Ygb2JqW2ZpbmFsaXplcl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBvYmpbZmluYWxpemVyXSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIC8vIFNlbmQgU2VyaWFsaXphdGlvbiBFcnJvciBUbyBDYWxsZXJcbiAgICAgICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVHlwZUVycm9yKFwiVW5zZXJpYWxpemFibGUgcmV0dXJuIHZhbHVlXCIpLFxuICAgICAgICAgICAgICAgIFt0aHJvd01hcmtlcl06IDAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGVwLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgd2lyZVZhbHVlKSwgeyBpZCB9KSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgICBlcC5zdGFydCgpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpIHtcbiAgICByZXR1cm4gZW5kcG9pbnQuY29uc3RydWN0b3IubmFtZSA9PT0gXCJNZXNzYWdlUG9ydFwiO1xufVxuZnVuY3Rpb24gY2xvc2VFbmRQb2ludChlbmRwb2ludCkge1xuICAgIGlmIChpc01lc3NhZ2VQb3J0KGVuZHBvaW50KSlcbiAgICAgICAgZW5kcG9pbnQuY2xvc2UoKTtcbn1cbmZ1bmN0aW9uIHdyYXAoZXAsIHRhcmdldCkge1xuICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgW10sIHRhcmdldCk7XG59XG5mdW5jdGlvbiB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1JlbGVhc2VkKSB7XG4gICAgaWYgKGlzUmVsZWFzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJveHkgaGFzIGJlZW4gcmVsZWFzZWQgYW5kIGlzIG5vdCB1c2VhYmxlXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJlbGVhc2VFbmRwb2ludChlcCkge1xuICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgIHR5cGU6IFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi8sXG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgIH0pO1xufVxuY29uc3QgcHJveHlDb3VudGVyID0gbmV3IFdlYWtNYXAoKTtcbmNvbnN0IHByb3h5RmluYWxpemVycyA9IFwiRmluYWxpemF0aW9uUmVnaXN0cnlcIiBpbiBnbG9iYWxUaGlzICYmXG4gICAgbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChlcCkgPT4ge1xuICAgICAgICBjb25zdCBuZXdDb3VudCA9IChwcm94eUNvdW50ZXIuZ2V0KGVwKSB8fCAwKSAtIDE7XG4gICAgICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICAgICAgaWYgKG5ld0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgICAgICB9XG4gICAgfSk7XG5mdW5jdGlvbiByZWdpc3RlclByb3h5KHByb3h5LCBlcCkge1xuICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApICsgMTtcbiAgICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gICAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgICAgICBwcm94eUZpbmFsaXplcnMucmVnaXN0ZXIocHJveHksIGVwLCBwcm94eSk7XG4gICAgfVxufVxuZnVuY3Rpb24gdW5yZWdpc3RlclByb3h5KHByb3h5KSB7XG4gICAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgICAgICBwcm94eUZpbmFsaXplcnMudW5yZWdpc3Rlcihwcm94eSk7XG4gICAgfVxufVxuZnVuY3Rpb24gY3JlYXRlUHJveHkoZXAsIHBhdGggPSBbXSwgdGFyZ2V0ID0gZnVuY3Rpb24gKCkgeyB9KSB7XG4gICAgbGV0IGlzUHJveHlSZWxlYXNlZCA9IGZhbHNlO1xuICAgIGNvbnN0IHByb3h5ID0gbmV3IFByb3h5KHRhcmdldCwge1xuICAgICAgICBnZXQoX3RhcmdldCwgcHJvcCkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIGlmIChwcm9wID09PSByZWxlYXNlUHJveHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB1bnJlZ2lzdGVyUHJveHkocHJveHkpO1xuICAgICAgICAgICAgICAgICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgICAgICAgICAgICAgICAgICBpc1Byb3h5UmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcCA9PT0gXCJ0aGVuXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdGhlbjogKCkgPT4gcHJveHkgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgciA9IHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIiAvKiBNZXNzYWdlVHlwZS5HRVQgKi8sXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHIudGhlbi5iaW5kKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBbLi4ucGF0aCwgcHJvcF0pO1xuICAgICAgICB9LFxuICAgICAgICBzZXQoX3RhcmdldCwgcHJvcCwgcmF3VmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICAvLyBGSVhNRTogRVM2IFByb3h5IEhhbmRsZXIgYHNldGAgbWV0aG9kcyBhcmUgc3VwcG9zZWQgdG8gcmV0dXJuIGFcbiAgICAgICAgICAgIC8vIGJvb2xlYW4uIFRvIHNob3cgZ29vZCB3aWxsLCB3ZSByZXR1cm4gdHJ1ZSBhc3luY2hyb25vdXNseSDCr1xcXyjjg4QpXy/Cr1xuICAgICAgICAgICAgY29uc3QgW3ZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJhd1ZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJTRVRcIiAvKiBNZXNzYWdlVHlwZS5TRVQgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogWy4uLnBhdGgsIHByb3BdLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGFwcGx5KF90YXJnZXQsIF90aGlzQXJnLCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBjb25zdCBsYXN0ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKGxhc3QgPT09IGNyZWF0ZUVuZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJFTkRQT0lOVFwiIC8qIE1lc3NhZ2VUeXBlLkVORFBPSU5UICovLFxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXZSBqdXN0IHByZXRlbmQgdGhhdCBgYmluZCgpYCBkaWRu4oCZdCBoYXBwZW4uXG4gICAgICAgICAgICBpZiAobGFzdCA9PT0gXCJiaW5kXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIHBhdGguc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkFQUExZXCIgLyogTWVzc2FnZVR5cGUuQVBQTFkgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29uc3RydWN0KF90YXJnZXQsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkNPTlNUUlVDVFwiIC8qIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVCAqLyxcbiAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudExpc3QsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgIH0pO1xuICAgIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKTtcbiAgICByZXR1cm4gcHJveHk7XG59XG5mdW5jdGlvbiBteUZsYXQoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGFycik7XG59XG5mdW5jdGlvbiBwcm9jZXNzQXJndW1lbnRzKGFyZ3VtZW50TGlzdCkge1xuICAgIGNvbnN0IHByb2Nlc3NlZCA9IGFyZ3VtZW50TGlzdC5tYXAodG9XaXJlVmFsdWUpO1xuICAgIHJldHVybiBbcHJvY2Vzc2VkLm1hcCgodikgPT4gdlswXSksIG15RmxhdChwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzFdKSldO1xufVxuY29uc3QgdHJhbnNmZXJDYWNoZSA9IG5ldyBXZWFrTWFwKCk7XG5mdW5jdGlvbiB0cmFuc2ZlcihvYmosIHRyYW5zZmVycykge1xuICAgIHRyYW5zZmVyQ2FjaGUuc2V0KG9iaiwgdHJhbnNmZXJzKTtcbiAgICByZXR1cm4gb2JqO1xufVxuZnVuY3Rpb24gcHJveHkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCB7IFtwcm94eU1hcmtlcl06IHRydWUgfSk7XG59XG5mdW5jdGlvbiB3aW5kb3dFbmRwb2ludCh3LCBjb250ZXh0ID0gZ2xvYmFsVGhpcywgdGFyZ2V0T3JpZ2luID0gXCIqXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBwb3N0TWVzc2FnZTogKG1zZywgdHJhbnNmZXJhYmxlcykgPT4gdy5wb3N0TWVzc2FnZShtc2csIHRhcmdldE9yaWdpbiwgdHJhbnNmZXJhYmxlcyksXG4gICAgICAgIGFkZEV2ZW50TGlzdGVuZXI6IGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICAgICAgICByZW1vdmVFdmVudExpc3RlbmVyOiBjb250ZXh0LnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICB9O1xufVxuZnVuY3Rpb24gdG9XaXJlVmFsdWUodmFsdWUpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBoYW5kbGVyXSBvZiB0cmFuc2ZlckhhbmRsZXJzKSB7XG4gICAgICAgIGlmIChoYW5kbGVyLmNhbkhhbmRsZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IFtzZXJpYWxpemVkVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gaGFuZGxlci5zZXJpYWxpemUodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiSEFORExFUlwiIC8qIFdpcmVWYWx1ZVR5cGUuSEFORExFUiAqLyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHNlcmlhbGl6ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRyYW5zZmVyYWJsZXMsXG4gICAgICAgICAgICBdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFwiUkFXXCIgLyogV2lyZVZhbHVlVHlwZS5SQVcgKi8sXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJDYWNoZS5nZXQodmFsdWUpIHx8IFtdLFxuICAgIF07XG59XG5mdW5jdGlvbiBmcm9tV2lyZVZhbHVlKHZhbHVlKSB7XG4gICAgc3dpdGNoICh2YWx1ZS50eXBlKSB7XG4gICAgICAgIGNhc2UgXCJIQU5ETEVSXCIgLyogV2lyZVZhbHVlVHlwZS5IQU5ETEVSICovOlxuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZmVySGFuZGxlcnMuZ2V0KHZhbHVlLm5hbWUpLmRlc2VyaWFsaXplKHZhbHVlLnZhbHVlKTtcbiAgICAgICAgY2FzZSBcIlJBV1wiIC8qIFdpcmVWYWx1ZVR5cGUuUkFXICovOlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnZhbHVlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIG1zZywgdHJhbnNmZXJzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgICAgIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGwoZXYpIHtcbiAgICAgICAgICAgIGlmICghZXYuZGF0YSB8fCAhZXYuZGF0YS5pZCB8fCBldi5kYXRhLmlkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGwpO1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgICAgICAgZXAuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKHsgaWQgfSwgbXNnKSwgdHJhbnNmZXJzKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpIHtcbiAgICByZXR1cm4gbmV3IEFycmF5KDQpXG4gICAgICAgIC5maWxsKDApXG4gICAgICAgIC5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpLnRvU3RyaW5nKDE2KSlcbiAgICAgICAgLmpvaW4oXCItXCIpO1xufVxuXG5leHBvcnQgeyBjcmVhdGVFbmRwb2ludCwgZXhwb3NlLCBmaW5hbGl6ZXIsIHByb3h5LCBwcm94eU1hcmtlciwgcmVsZWFzZVByb3h5LCB0cmFuc2ZlciwgdHJhbnNmZXJIYW5kbGVycywgd2luZG93RW5kcG9pbnQsIHdyYXAgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbWxpbmsubWpzLm1hcFxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJpbXBvcnQgKiBhcyBDb21saW5rIGZyb20gXCJjb21saW5rXCI7XHJcblxyXG5pbXBvcnQge1xyXG4gIFR5cGVkQXJyYXksXHJcbiAgVGlsZUNvb3JkcyxcclxuICBMYXRMbmcsXHJcbiAgTGF0TG5nWm9vbSxcclxuICBDb25maWdTdGF0ZSxcclxuICBUaWxlTG9hZFN0YXRlLFxyXG4gIE5vcm1hbGlzZU1vZGVcclxuICB9IGZyb20gXCIuL2hlbHBlcnNcIjtcclxuXHJcbmltcG9ydCBQTkcgZnJvbSBcIi4vcG5nXCI7XHJcblxyXG5leHBvcnQgdHlwZSBOb3JtYWxpc2VSZXN1bHQ8VD4gPSB7XHJcbiAgZGF0YTogVCxcclxuICBtaW5CZWZvcmU6IG51bWJlcixcclxuICBtYXhCZWZvcmU6IG51bWJlcixcclxuICBtaW5BZnRlcjogbnVtYmVyLFxyXG4gIG1heEFmdGVyOiBudW1iZXJcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXlUb1N0bEFyZ3MgPSB7XHJcbiAgd2lkdGggOiBudW1iZXIsXHJcbiAgZGVwdGggOiBudW1iZXIsXHJcbiAgaGVpZ2h0OiBudW1iZXJcclxufTtcclxuZXhwb3J0IGNvbnN0IHR5cGVkQXJyYXlUb1N0bERlZmF1bHRzIDogVHlwZWRBcnJheVRvU3RsQXJncyA9IHtcclxuICB3aWR0aCA6IDEwMCxcclxuICBkZXB0aCA6IDEwMCxcclxuICBoZWlnaHQgOiAxMCxcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIHZlYzMgPSBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XHJcbmV4cG9ydCB0eXBlIHRyaXZlYzMgPSBbdmVjMywgdmVjMywgdmVjMywgdmVjM107XHJcblxyXG5leHBvcnQgdHlwZSBOb3JtUmFuZ2UgPSB7ZnJvbSA6IG51bWJlcnxudWxsfHVuZGVmaW5lZCwgdG8gOiBudW1iZXJ8bnVsbHx1bmRlZmluZWR9O1xyXG5leHBvcnQgY29uc3Qgbm9ybU1heFJhbmdlIDogTm9ybVJhbmdlID0ge2Zyb206IC0xMDkyOSwgdG86IDg4NDh9O1xyXG5leHBvcnQgY29uc3Qgbm9ybURlZmF1bHRzIDogTm9ybVJhbmdlID0ge2Zyb206IG51bGwsIHRvOiBudWxsfTtcclxuXHJcbmNvbnN0IHByb2Nlc3NvciA9IHtcclxuICBub3JtYWxpc2VUeXBlZEFycmF5PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBULCBub3JtOiBOb3JtUmFuZ2UpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1heCA9ICh0eXBlb2Ygbm9ybS50byA9PT0gJ251bWJlcicpID8gbm9ybS50byA6IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5tYXgocHJldiwgY3VyKSwgMCk7XHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1pbiA9ICh0eXBlb2Ygbm9ybS5mcm9tID09PSAnbnVtYmVyJykgPyBub3JtLmZyb20gOiBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWluKHByZXYsIGN1ciksIG1heCk7XHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KTtcclxuICAgIGNvbnN0IG5ld01pbiA9IDA7XHJcbiAgICBjb25zdCBzdWIgPSBtYXggLSBtaW47XHJcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xyXG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xyXG4gICAgaW5wLmZvckVhY2goKGEgOiBudW1iZXIsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGlmIChhID49IG1heCkgaW5wW2luZGV4XSA9IG5ld01heDtcclxuICAgICAgZWxzZSBpZiAoYSA8PSBtaW4pIGlucFtpbmRleF0gPSBuZXdNaW47XHJcbiAgICAgIGVsc2UgaW5wW2luZGV4XSA9ICgoKGEtbWluKS9zdWIpICogbnN1YiArIG5ld01pbik7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRhdGE6IGlucCxcclxuICAgICAgbWluQmVmb3JlOiBtaW4sXHJcbiAgICAgIG1heEJlZm9yZTogbWF4LFxyXG4gICAgICBtaW5BZnRlcjogbmV3TWluLFxyXG4gICAgICBtYXhBZnRlcjogbmV3TWF4LFxyXG4gICAgfTtcclxuICB9LFxyXG4gIG5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydDxUIGV4dGVuZHMgVHlwZWRBcnJheXxudW1iZXJbXT4oaW5wIDogVCwgbm9ybTogTm9ybVJhbmdlKSA6IE5vcm1hbGlzZVJlc3VsdDxUPiB7XHJcbiAgICBsZXQgYnBlID0gMjtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShpbnApKSB7XHJcbiAgICAgIGlmIChpbnAgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcclxuICAgICAgICBicGUgPSAyO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJwZSA9IGlucC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc3QgbiA9IGlucC5sZW5ndGhcclxuXHJcbiAgICBjb25zdCBudW1TdGREZXZpYXRpb25zID0gMTA7XHJcblxyXG4gICAgLy8gRm9yIHNvbWUgcmVhc29uLCB0eXBlc2NyaXB0IGRvZXMgbm90IHRoaW5rIHRoZSByZWR1Y2UgZnVuY3Rpb24gYXNcclxuICAgIC8vIHVzZWQgYmVsb3cgaXMgY29tcGF0aWJsZSB3aXRoIGFsbCB0eXBlZGFycmF5c1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtZWFuID0gaW5wLnJlZHVjZSgoYSA6IG51bWJlciwgYiA6IG51bWJlcikgPT4gYSArIGIpIC8gblxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBzdGRkZXYgPSBNYXRoLnNxcnQoaW5wLm1hcCh4ID0+IE1hdGgucG93KHggLSBtZWFuLCAyKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYikgLyBuKVxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNYXggPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWF4KHByZXYsIGN1ciksIDApO1xyXG4gICAgY29uc3QgbWF4ID0gKHR5cGVvZiBub3JtLnRvID09PSAnbnVtYmVyJykgPyBub3JtLnRvIDogTWF0aC5taW4obWVhbitzdGRkZXYgKiBudW1TdGREZXZpYXRpb25zLCBhY3R1YWxNYXgpO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWluKHByZXYsIGN1ciksIG1heCk7XHJcbiAgICBjb25zdCBtaW4gPSAodHlwZW9mIG5vcm0uZnJvbSA9PT0gJ251bWJlcicpID8gbm9ybS5mcm9tIDogTWF0aC5tYXgobWVhbi1zdGRkZXYgKiBudW1TdGREZXZpYXRpb25zLCBhY3R1YWxNaW4pO1xyXG5cclxuICAgIGNvbnN0IG5ld01heCA9IE1hdGgucG93KDIsIGJwZSAqIDgpO1xyXG4gICAgY29uc3QgbmV3TWluID0gMDtcclxuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcclxuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XHJcbiAgICBjb25zdCBmYWN0b3IgPSBuZXdNYXgvKG1heCAtIHN1Yik7XHJcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xyXG4gICAgICBlbHNlIGlmIChhIDw9IG1pbikgaW5wW2luZGV4XSA9IG5ld01pbjtcclxuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IGFjdHVhbE1pbixcclxuICAgICAgbWF4QmVmb3JlOiBhY3R1YWxNYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgbm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0V2luZG93PFQgZXh0ZW5kcyBUeXBlZEFycmF5PihpbnAgOiBULCBub3JtOiBOb3JtUmFuZ2UpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxyXG5cclxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcclxuXHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1lYW4gPSBpbnAucmVkdWNlKChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA9PiBhICsgYikgLyBuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXHJcblxyXG4gICAgY29uc3QgZXhjbHVkZSA9IDAuMDAwNTtcclxuICAgIGNvbnN0IGNvcHkgPSBpbnAuc2xpY2UoMCk7XHJcbiAgICBjb3B5LnNvcnQoKTtcclxuICAgIGNvbnN0IG9mZnNldCA9IE1hdGguY2VpbChjb3B5Lmxlbmd0aCAqIGV4Y2x1ZGUpO1xyXG4gICAgY29uc3QgbGVuZ3RoID0gTWF0aC5mbG9vcihjb3B5Lmxlbmd0aCAqICgxLWV4Y2x1ZGUqMikpO1xyXG4gICAgY29uc3Qgd2luZG93ZWRDb3B5ID0gY29weS5zdWJhcnJheShvZmZzZXQsIGxlbmd0aCk7XHJcblxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNYXggPSBjb3B5W2NvcHkubGVuZ3RoLTFdO1xyXG4gICAgY29uc3Qgd2luZG93ZWRNYXggPSB3aW5kb3dlZENvcHlbd2luZG93ZWRDb3B5Lmxlbmd0aC0xXTtcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgYWN0dWFsTWluID0gY29weVswXTtcclxuICAgIGNvbnN0IHdpbmRvd2VkTWluID0gd2luZG93ZWRDb3B5WzBdO1xyXG5cclxuICAgIGNvbnN0IG1heCA9ICh0eXBlb2Ygbm9ybS50byA9PT0gJ251bWJlcicpID8gbm9ybS50byA6ICh3aW5kb3dlZE1heCArIHN0ZGRldikgPiBhY3R1YWxNYXggPyBhY3R1YWxNYXggOiB3aW5kb3dlZE1heDtcclxuICAgIGNvbnN0IG1pbiA9ICh0eXBlb2Ygbm9ybS5mcm9tID09PSAnbnVtYmVyJykgPyBub3JtLmZyb20gOiAod2luZG93ZWRNaW4gLSBzdGRkZXYpIDwgYWN0dWFsTWluID8gYWN0dWFsTWluIDogd2luZG93ZWRNaW47XHJcblxyXG4gICAgY29uc3QgbmV3TWF4ID0gTWF0aC5wb3coMiwgYnBlICogOCktMTtcclxuICAgIGNvbnN0IG5ld01pbiA9IDA7XHJcbiAgICBjb25zdCBzdWIgPSBtYXggLSBtaW47XHJcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xyXG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xyXG4gICAgaW5wLmZvckVhY2goKGEgOiBudW1iZXIsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGlmIChhID49IG1heCkgaW5wW2luZGV4XSA9IG5ld01heDtcclxuICAgICAgZWxzZSBpZiAoYSA8PSBtaW4pIGlucFtpbmRleF0gPSBuZXdNaW47XHJcbiAgICAgIGVsc2UgaW5wW2luZGV4XSA9ICgoKGEtbWluKS9zdWIpICogbnN1YiArIG5ld01pbik7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRhdGE6IGlucCxcclxuICAgICAgbWluQmVmb3JlOiBtaW4sXHJcbiAgICAgIG1heEJlZm9yZTogbWF4LFxyXG4gICAgICBtaW5BZnRlcjogbmV3TWluLFxyXG4gICAgICBtYXhBZnRlcjogbmV3TWF4LFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGNvbWJpbmVJbWFnZXMoXHJcbiAgICBzdGF0ZXMgOiBUaWxlTG9hZFN0YXRlW10sXHJcbiAgICBub3JtYWxpc2VNb2RlIDogbnVtYmVyID0gTm9ybWFsaXNlTW9kZS5SZWd1bGFyLFxyXG4gICAgbm9ybSA6IE5vcm1SYW5nZSA9IG5vcm1EZWZhdWx0c1xyXG4gICkgOiBOb3JtYWxpc2VSZXN1bHQ8RmxvYXQzMkFycmF5PiB7XHJcbiAgICBjb25zdCBhcmVhID0gc3RhdGVzWzBdLndpZHRoICogc3RhdGVzWzBdLmhlaWdodDtcclxuICAgIGxldCBvdXRwdXQgPSBuZXcgRmxvYXQzMkFycmF5KGFyZWEpO1xyXG4gICAgY29uc3QgdGlsZVdpZHRoID0gMjU2O1xyXG4gICAgY29uc3QgaW5jcmVtZW50ID0gMS90aWxlV2lkdGg7XHJcbiAgICBjb25zdCBtYXAgOiBSZWNvcmQ8bnVtYmVyLCBSZWNvcmQ8bnVtYmVyLCBUaWxlTG9hZFN0YXRlPj4gPSB7fTtcclxuICAgIGZvciAobGV0IHRpbGUgb2Ygc3RhdGVzKSB7XHJcbiAgICAgIGlmICghbWFwW3RpbGUueF0pIHtcclxuICAgICAgICBtYXBbdGlsZS54XSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIG1hcFt0aWxlLnhdW3RpbGUueV0gPSB0aWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGV4dGVudCA9IHtcclxuICAgICAgeDE6IHN0YXRlc1swXS5leGFjdFBvcy54IC0gc3RhdGVzWzBdLndpZHRoSW5UaWxlcy8yLFxyXG4gICAgICB4Mjogc3RhdGVzWzBdLmV4YWN0UG9zLnggKyBzdGF0ZXNbMF0ud2lkdGhJblRpbGVzLzIsXHJcbiAgICAgIHkxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSAtIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzIsXHJcbiAgICAgIHkyOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSArIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzJcclxuICAgIH1cclxuXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBmb3IgKGxldCB5ID0gZXh0ZW50LnkxOyB5IDwgZXh0ZW50LnkyOyB5ICs9IGluY3JlbWVudCkge1xyXG4gICAgICBmb3IgKGxldCB4ID0gZXh0ZW50LngxOyB4IDwgZXh0ZW50LngyOyB4ICs9IGluY3JlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHRpbGUgPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKHgpLFxyXG4gICAgICAgICAgeTogTWF0aC5mbG9vcih5KVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgcHggPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKCh4JTEpKnRpbGVXaWR0aCksXHJcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKCh5JTEpKnRpbGVXaWR0aClcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IHB4LnkqdGlsZVdpZHRoICsgcHgueDtcclxuICAgICAgICBpZiAodHlwZW9mIG1hcFt0aWxlLnhdID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB4IHZhbHVlICR7dGlsZS54fSB3YXMgdW5kZWZpbmVkYCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbWFwW3RpbGUueF1bdGlsZS55XSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgeSB2YWx1ZSAke3RpbGUueX0gd2FzIHVuZGVmaW5lZGApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBvdXRwdXRbaSsrXSA9IG1hcFt0aWxlLnhdW3RpbGUueV0uaGVpZ2h0c1tpZHhdO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgbGV0IHJlc3VsdCA9IHtcclxuICAgICAgZGF0YTogb3V0cHV0LFxyXG4gICAgICBtaW5CZWZvcmU6IE1hdGgucG93KDIsIDMyKSxcclxuICAgICAgbWF4QmVmb3JlOiAwLFxyXG4gICAgICBtaW5BZnRlcjogTWF0aC5wb3coMiwgMzIpLFxyXG4gICAgICBtYXhBZnRlcjogMCxcclxuICAgIH07XHJcbiAgICBpZiAoXHJcbiAgICAgIG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5SZWd1bGFyIHx8XHJcbiAgICAgIChcclxuICAgICAgICB0eXBlb2Ygbm9ybS5mcm9tID09ICdudW1iZXInICYmXHJcbiAgICAgICAgdHlwZW9mIG5vcm0udG8gPT0gJ251bWJlcidcclxuICAgICAgKVxyXG4gICAgKSB7XHJcbiAgICAgIHJlc3VsdCA9IHRoaXMubm9ybWFsaXNlVHlwZWRBcnJheShvdXRwdXQsIG5vcm0pO1xyXG4gICAgfSBlbHNlIGlmIChub3JtYWxpc2VNb2RlID09IE5vcm1hbGlzZU1vZGUuU21hcnQpIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5U21hcnQob3V0cHV0LCBub3JtKTtcclxuICAgIH0gZWxzZSBpZiAobm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlNtYXJ0V2luZG93KSB7XHJcbiAgICAgIHJlc3VsdCA9IHRoaXMubm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0V2luZG93KG91dHB1dCwgbm9ybSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHJlc3VsdC5tYXhBZnRlciA9IE1hdGgubWF4KG91dHB1dFtpXSwgcmVzdWx0Lm1heEFmdGVyKTtcclxuICAgICAgICByZXN1bHQubWluQWZ0ZXIgPSBNYXRoLm1pbihvdXRwdXRbaV0sIHJlc3VsdC5taW5BZnRlcik7XHJcbiAgICAgIH1cclxuICAgICAgcmVzdWx0Lm1heEJlZm9yZSA9IHJlc3VsdC5tYXhBZnRlcjtcclxuICAgICAgcmVzdWx0Lm1pbkJlZm9yZSA9IHJlc3VsdC5taW5BZnRlcjtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfSxcclxuICB0eXBlZEFycmF5VG9TdGwoXHJcbiAgICBwb2ludHM6IFR5cGVkQXJyYXksXHJcbiAgICB3aWR0aHB4IDogbnVtYmVyLFxyXG4gICAgaGVpZ2h0cHggOiBudW1iZXIsXHJcbiAgICB7d2lkdGgsIGRlcHRoLCBoZWlnaHR9IDogVHlwZWRBcnJheVRvU3RsQXJncyA9IHR5cGVkQXJyYXlUb1N0bERlZmF1bHRzXHJcbiAgKSA6IEFycmF5QnVmZmVyIHtcclxuICAgIGNvbnN0IGRhdGFMZW5ndGggPSAoKHdpZHRocHgpICogKGhlaWdodHB4KSkgKiA1MDtcclxuICAgIGNvbnNvbGUubG9nKHBvaW50cy5sZW5ndGgsIGRhdGFMZW5ndGgpO1xyXG4gICAgY29uc3Qgc2l6ZSA9IDgwICsgNCArIGRhdGFMZW5ndGg7XHJcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZGF0YUxlbmd0aCk7XHJcbiAgICBjb25zdCBkdiA9IG5ldyBEYXRhVmlldyhyZXN1bHQpO1xyXG4gICAgZHYuc2V0VWludDMyKDgwLCAod2lkdGhweC0xKSooaGVpZ2h0cHgtMSksIHRydWUpO1xyXG5cclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWF4ID0gcG9pbnRzLnJlZHVjZSgoYWNjLCBwb2ludCkgPT4gTWF0aC5tYXgocG9pbnQsIGFjYyksIDApO1xyXG5cclxuICAgIGNvbnN0IG8gPSAoeCA6IG51bWJlciwgeSA6IG51bWJlcikgOiBudW1iZXIgPT4gKHkgKiB3aWR0aHB4KSArIHg7XHJcbiAgICBjb25zdCBuID0gKHAxIDogdmVjMywgcDIgOiB2ZWMzLCBwMzogdmVjMykgOiB2ZWMzID0+IHtcclxuICAgICAgY29uc3QgQSA9IFtwMlswXSAtIHAxWzBdLCBwMlsxXSAtIHAxWzFdLCBwMlsyXSAtIHAxWzJdXTtcclxuICAgICAgY29uc3QgQiA9IFtwM1swXSAtIHAxWzBdLCBwM1sxXSAtIHAxWzFdLCBwM1syXSAtIHAxWzJdXTtcclxuICAgICAgcmV0dXJuIFtcclxuICAgICAgICBBWzFdICogQlsyXSAtIEFbMl0gKiBCWzFdLFxyXG4gICAgICAgIEFbMl0gKiBCWzBdIC0gQVswXSAqIEJbMl0sXHJcbiAgICAgICAgQVswXSAqIEJbMV0gLSBBWzFdICogQlswXVxyXG4gICAgICBdXHJcbiAgICB9XHJcbiAgICBjb25zdCBwdCA9ICh0cmlzIDogdHJpdmVjMywgb2ZmIDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIHRyaXMuZmxhdCgpLmZvckVhY2goKGZsdCA6IG51bWJlciwgaSA6IG51bWJlcikgPT4ge1xyXG4gICAgICAgIGR2LnNldEZsb2F0MzIob2ZmICsgKGkgKiA0KSwgZmx0LCB0cnVlKTtcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIGR2LnNldFVpbnQxNihvZmYrNDgsIDAsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBvZmYgPSA4NDtcclxuICAgIGZvciAobGV0IHggPSAwOyB4IDwgKHdpZHRocHggLSAxKTsgeCArPSAyKSB7XHJcbiAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgKGhlaWdodHB4IC0gMSk7IHkrKykge1xyXG4gICAgICAgIGNvbnN0IHRyaTEgOiB0cml2ZWMzID0gW1xyXG4gICAgICAgICAgWzAsMCwwXSwgLy8gbm9ybWFsXHJcbiAgICAgICAgICBbICB4LCAgIHksIHBvaW50c1tvKHgseSldL21heF0sIC8vIHYxXHJcbiAgICAgICAgICBbeCsxLCAgIHksIHBvaW50c1tvKHgrMSx5KV0vbWF4XSwgLy8gdjJcclxuICAgICAgICAgIFsgIHgsIHkrMSwgcG9pbnRzW28oeCx5KzEpXS9tYXhdLCAvLyB2M1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgLy8gdHJpMVswXSA9IG4odHJpMVsxXSwgdHJpMVsyXSwgdHJpMVszXSk7XHJcbiAgICAgICAgcHQodHJpMSwgb2ZmKTtcclxuICAgICAgICBvZmYgKz0gNTA7XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaTIgOiB0cml2ZWMzID0gW1xyXG4gICAgICAgICAgWzAsMCwwXSwgLy8gbm9ybWFsXHJcbiAgICAgICAgICBbeCsxLCAgIHksIHBvaW50c1tvKHgrMSx5KV0vbWF4XSwgLy8gdjFcclxuICAgICAgICAgIFt4KzEsIHkrMSwgcG9pbnRzW28oeCsxLHkrMSldL21heF0sIC8vIHYyXHJcbiAgICAgICAgICBbICB4LCB5KzEsIHBvaW50c1tvKHgseSsxKV0vbWF4XSwgLy8gdjNcclxuICAgICAgICBdO1xyXG4gICAgICAgIC8vIHRyaTJbMF0gPSBuKHRyaTJbMV0sIHRyaTJbMl0sIHRyaTJbM10pO1xyXG4gICAgICAgIHB0KHRyaTIsIG9mZik7XHJcbiAgICAgICAgb2ZmICs9IDUwO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcbn1cclxuXHJcbkNvbWxpbmsuZXhwb3NlKHByb2Nlc3Nvcik7Il0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9