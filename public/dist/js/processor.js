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
/* harmony export */   "format": () => (/* binding */ format)
/* harmony export */ });
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
})(NormaliseMode || (NormaliseMode = {}));


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
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "./node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _helpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helpers */ "./src/helpers.ts");


var processor = {
    normaliseTypedArray: function (inp) {
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
        var max = inp.reduce(function (prev, cur) { return Math.max(prev, cur); }, 0);
        //@ts-ignore
        var min = inp.reduce(function (prev, cur) { return Math.min(prev, cur); }, max);
        var newMax = Math.pow(2, bpe * 8);
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
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
    normaliseTypedArraySmart: function (inp) {
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
        var max = Math.min(mean + stddev * numStdDeviations, actualMax);
        //@ts-ignore
        var actualMin = inp.reduce(function (prev, cur) { return Math.min(prev, cur); }, max);
        var min = Math.max(mean - stddev * numStdDeviations, actualMin);
        console.log({ n: n, mean: mean, stddev: stddev, actualMax: actualMax, max: max, actualMin: actualMin, min: min });
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
    normaliseTypedArraySmartWindow: function (inp) {
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
        var max = (windowedMax + stddev) > actualMax ? actualMax : windowedMax;
        var min = (windowedMin - stddev) < actualMin ? actualMin : windowedMin;
        console.log({ windowedMax: windowedMax, windowedMin: windowedMin, actualMax: actualMax, actualMin: actualMin, offset: offset, length: length, stddev: stddev, max: max, min: min });
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
    combineImages: function (states, normaliseMode) {
        if (normaliseMode === void 0) { normaliseMode = _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular; }
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
                output[i++] = map[tile.x][tile.y].heights[idx];
            }
        }
        var result = {
            data: output,
            minBefore: Math.pow(2, 32),
            maxBefore: 0,
            minAfter: Math.pow(2, 32),
            maxAfter: 0,
        };
        if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular) {
            result = this.normaliseTypedArray(output);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Smart) {
            result = this.normaliseTypedArraySmart(output);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.SmartWindow) {
            result = this.normaliseTypedArraySmartWindow(output);
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
    }
};
comlink__WEBPACK_IMPORTED_MODULE_1__.expose(processor);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUM7SUFDaEIsQ0FBQztDQUNGO0FBRUQsMkNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3BuZy0xNi1icm93c2VyLy4vc3JjL2hlbHBlcnMudHMiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9ub2RlX21vZHVsZXMvY29tbGluay9kaXN0L2VzbS9jb21saW5rLm1qcyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3BuZy0xNi1icm93c2VyLy4vc3JjL3Byb2Nlc3Nvci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZm9ybWF0ID0gKHN0ciA6IHN0cmluZywgb2JqIDogUmVjb3JkPHN0cmluZywgc3RyaW5nfG51bWJlcj4pIDogc3RyaW5nID0+IHtcclxuICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob2JqKSkge1xyXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoYHske2tleX19YCwgdmFsdWUudG9TdHJpbmcoKSk7XHJcbiAgfVxyXG4gIHJldHVybiBzdHI7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID1cclxuICB8IEludDhBcnJheVxyXG4gIHwgVWludDhBcnJheVxyXG4gIHwgVWludDhDbGFtcGVkQXJyYXlcclxuICB8IEludDE2QXJyYXlcclxuICB8IFVpbnQxNkFycmF5XHJcbiAgfCBJbnQzMkFycmF5XHJcbiAgfCBVaW50MzJBcnJheVxyXG4gIHwgRmxvYXQzMkFycmF5XHJcbiAgfCBGbG9hdDY0QXJyYXk7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRpbGVDb29yZHMge1xyXG4gIHg6IG51bWJlcixcclxuICB5OiBudW1iZXIsXHJcbiAgejogbnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBMYXRMbmcge1xyXG4gIGxhdGl0dWRlOiBudW1iZXIsXHJcbiAgbG9uZ2l0dWRlOiBudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIExhdExuZ1pvb20gZXh0ZW5kcyBMYXRMbmcge1xyXG4gIHpvb206IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDb25maWdTdGF0ZSA9IFRpbGVDb29yZHMgJiBMYXRMbmdab29tICYge1xyXG4gIHdpZHRoIDogbnVtYmVyLFxyXG4gIGhlaWdodCA6IG51bWJlcixcclxuICBleGFjdFBvcyA6IFRpbGVDb29yZHMsXHJcbiAgd2lkdGhJblRpbGVzIDogbnVtYmVyLFxyXG4gIGhlaWdodEluVGlsZXMgOiBudW1iZXIsXHJcbiAgc3RhcnR4OiBudW1iZXIsXHJcbiAgc3RhcnR5OiBudW1iZXIsXHJcbiAgZW5keDogbnVtYmVyLFxyXG4gIGVuZHk6IG51bWJlcixcclxuICBzdGF0dXM6IHN0cmluZyxcclxuICBib3VuZHM6IFtMYXRMbmcsIExhdExuZ10sXHJcbiAgcGh5czoge3dpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyfVxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVGlsZUxvYWRTdGF0ZSA9IENvbmZpZ1N0YXRlICYge3g6IG51bWJlciwgeTogbnVtYmVyLCBoZWlnaHRzOiBGbG9hdDMyQXJyYXl9O1xyXG5cclxuZXhwb3J0IGVudW0gTm9ybWFsaXNlTW9kZSB7XHJcbiAgT2ZmID0gMCxcclxuICBSZWd1bGFyID0gMSxcclxuICBTbWFydCA9IDIsXHJcbiAgU21hcnRXaW5kb3cgPSAzLFxyXG59IiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcbiAqL1xuY29uc3QgcHJveHlNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnByb3h5XCIpO1xuY29uc3QgY3JlYXRlRW5kcG9pbnQgPSBTeW1ib2woXCJDb21saW5rLmVuZHBvaW50XCIpO1xuY29uc3QgcmVsZWFzZVByb3h5ID0gU3ltYm9sKFwiQ29tbGluay5yZWxlYXNlUHJveHlcIik7XG5jb25zdCBmaW5hbGl6ZXIgPSBTeW1ib2woXCJDb21saW5rLmZpbmFsaXplclwiKTtcbmNvbnN0IHRocm93TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay50aHJvd25cIik7XG5jb25zdCBpc09iamVjdCA9ICh2YWwpID0+ICh0eXBlb2YgdmFsID09PSBcIm9iamVjdFwiICYmIHZhbCAhPT0gbnVsbCkgfHwgdHlwZW9mIHZhbCA9PT0gXCJmdW5jdGlvblwiO1xuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGUgdG8gaGFuZGxlIG9iamVjdHMgbWFya2VkIHRvIHByb3h5LlxuICovXG5jb25zdCBwcm94eVRyYW5zZmVySGFuZGxlciA9IHtcbiAgICBjYW5IYW5kbGU6ICh2YWwpID0+IGlzT2JqZWN0KHZhbCkgJiYgdmFsW3Byb3h5TWFya2VyXSxcbiAgICBzZXJpYWxpemUob2JqKSB7XG4gICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDEpO1xuICAgICAgICByZXR1cm4gW3BvcnQyLCBbcG9ydDJdXTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplKHBvcnQpIHtcbiAgICAgICAgcG9ydC5zdGFydCgpO1xuICAgICAgICByZXR1cm4gd3JhcChwb3J0KTtcbiAgICB9LFxufTtcbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlciB0byBoYW5kbGUgdGhyb3duIGV4Y2VwdGlvbnMuXG4gKi9cbmNvbnN0IHRocm93VHJhbnNmZXJIYW5kbGVyID0ge1xuICAgIGNhbkhhbmRsZTogKHZhbHVlKSA9PiBpc09iamVjdCh2YWx1ZSkgJiYgdGhyb3dNYXJrZXIgaW4gdmFsdWUsXG4gICAgc2VyaWFsaXplKHsgdmFsdWUgfSkge1xuICAgICAgICBsZXQgc2VyaWFsaXplZDtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHNlcmlhbGl6ZWQgPSB7XG4gICAgICAgICAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiB2YWx1ZS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBzdGFjazogdmFsdWUuc3RhY2ssXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZXJpYWxpemVkID0geyBpc0Vycm9yOiBmYWxzZSwgdmFsdWUgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3NlcmlhbGl6ZWQsIFtdXTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplKHNlcmlhbGl6ZWQpIHtcbiAgICAgICAgaWYgKHNlcmlhbGl6ZWQuaXNFcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3Ioc2VyaWFsaXplZC52YWx1ZS5tZXNzYWdlKSwgc2VyaWFsaXplZC52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgc2VyaWFsaXplZC52YWx1ZTtcbiAgICB9LFxufTtcbi8qKlxuICogQWxsb3dzIGN1c3RvbWl6aW5nIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzLlxuICovXG5jb25zdCB0cmFuc2ZlckhhbmRsZXJzID0gbmV3IE1hcChbXG4gICAgW1wicHJveHlcIiwgcHJveHlUcmFuc2ZlckhhbmRsZXJdLFxuICAgIFtcInRocm93XCIsIHRocm93VHJhbnNmZXJIYW5kbGVyXSxcbl0pO1xuZnVuY3Rpb24gaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBvcmlnaW4pIHtcbiAgICBmb3IgKGNvbnN0IGFsbG93ZWRPcmlnaW4gb2YgYWxsb3dlZE9yaWdpbnMpIHtcbiAgICAgICAgaWYgKG9yaWdpbiA9PT0gYWxsb3dlZE9yaWdpbiB8fCBhbGxvd2VkT3JpZ2luID09PSBcIipcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93ZWRPcmlnaW4gaW5zdGFuY2VvZiBSZWdFeHAgJiYgYWxsb3dlZE9yaWdpbi50ZXN0KG9yaWdpbikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGV4cG9zZShvYmosIGVwID0gZ2xvYmFsVGhpcywgYWxsb3dlZE9yaWdpbnMgPSBbXCIqXCJdKSB7XG4gICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gY2FsbGJhY2soZXYpIHtcbiAgICAgICAgaWYgKCFldiB8fCAhZXYuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBldi5vcmlnaW4pKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEludmFsaWQgb3JpZ2luICcke2V2Lm9yaWdpbn0nIGZvciBjb21saW5rIHByb3h5YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBpZCwgdHlwZSwgcGF0aCB9ID0gT2JqZWN0LmFzc2lnbih7IHBhdGg6IFtdIH0sIGV2LmRhdGEpO1xuICAgICAgICBjb25zdCBhcmd1bWVudExpc3QgPSAoZXYuZGF0YS5hcmd1bWVudExpc3QgfHwgW10pLm1hcChmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgbGV0IHJldHVyblZhbHVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gcGF0aC5zbGljZSgwLCAtMSkucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gcGF0aC5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkdFVFwiIC8qIE1lc3NhZ2VUeXBlLkdFVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiU0VUXCIgLyogTWVzc2FnZVR5cGUuU0VUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRbcGF0aC5zbGljZSgtMSlbMF1dID0gZnJvbVdpcmVWYWx1ZShldi5kYXRhLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiQVBQTFlcIiAvKiBNZXNzYWdlVHlwZS5BUFBMWSAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZS5hcHBseShwYXJlbnQsIGFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkNPTlNUUlVDVFwiIC8qIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgcmF3VmFsdWUoLi4uYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcHJveHkodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJFTkRQT0lOVFwiIC8qIE1lc3NhZ2VUeXBlLkVORFBPSU5UICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvc2Uob2JqLCBwb3J0Mik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRyYW5zZmVyKHBvcnQxLCBbcG9ydDFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFByb21pc2UucmVzb2x2ZShyZXR1cm5WYWx1ZSlcbiAgICAgICAgICAgIC5jYXRjaCgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbigocmV0dXJuVmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmV0dXJuVmFsdWUpO1xuICAgICAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB3aXJlVmFsdWUpLCB7IGlkIH0pLCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09PSBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovKSB7XG4gICAgICAgICAgICAgICAgLy8gZGV0YWNoIGFuZCBkZWFjdGl2ZSBhZnRlciBzZW5kaW5nIHJlbGVhc2UgcmVzcG9uc2UgYWJvdmUuXG4gICAgICAgICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgICAgICAgICAgICAgIGlmIChmaW5hbGl6ZXIgaW4gb2JqICYmIHR5cGVvZiBvYmpbZmluYWxpemVyXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIG9ialtmaW5hbGl6ZXJdKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgLy8gU2VuZCBTZXJpYWxpemF0aW9uIEVycm9yIFRvIENhbGxlclxuICAgICAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZSh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUeXBlRXJyb3IoXCJVbnNlcmlhbGl6YWJsZSByZXR1cm4gdmFsdWVcIiksXG4gICAgICAgICAgICAgICAgW3Rocm93TWFya2VyXTogMCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB3aXJlVmFsdWUpLCB7IGlkIH0pLCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICAgIGVwLnN0YXJ0KCk7XG4gICAgfVxufVxuZnVuY3Rpb24gaXNNZXNzYWdlUG9ydChlbmRwb2ludCkge1xuICAgIHJldHVybiBlbmRwb2ludC5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk1lc3NhZ2VQb3J0XCI7XG59XG5mdW5jdGlvbiBjbG9zZUVuZFBvaW50KGVuZHBvaW50KSB7XG4gICAgaWYgKGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpKVxuICAgICAgICBlbmRwb2ludC5jbG9zZSgpO1xufVxuZnVuY3Rpb24gd3JhcChlcCwgdGFyZ2V0KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBbXSwgdGFyZ2V0KTtcbn1cbmZ1bmN0aW9uIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUmVsZWFzZWQpIHtcbiAgICBpZiAoaXNSZWxlYXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm94eSBoYXMgYmVlbiByZWxlYXNlZCBhbmQgaXMgbm90IHVzZWFibGVcIik7XG4gICAgfVxufVxuZnVuY3Rpb24gcmVsZWFzZUVuZHBvaW50KGVwKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgdHlwZTogXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLyxcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgY2xvc2VFbmRQb2ludChlcCk7XG4gICAgfSk7XG59XG5jb25zdCBwcm94eUNvdW50ZXIgPSBuZXcgV2Vha01hcCgpO1xuY29uc3QgcHJveHlGaW5hbGl6ZXJzID0gXCJGaW5hbGl6YXRpb25SZWdpc3RyeVwiIGluIGdsb2JhbFRoaXMgJiZcbiAgICBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKGVwKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApIC0gMTtcbiAgICAgICAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICAgICAgICBpZiAobmV3Q291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgIH1cbiAgICB9KTtcbmZ1bmN0aW9uIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKSB7XG4gICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgKyAxO1xuICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgICAgIHByb3h5RmluYWxpemVycy5yZWdpc3Rlcihwcm94eSwgZXAsIHByb3h5KTtcbiAgICB9XG59XG5mdW5jdGlvbiB1bnJlZ2lzdGVyUHJveHkocHJveHkpIHtcbiAgICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgICAgIHByb3h5RmluYWxpemVycy51bnJlZ2lzdGVyKHByb3h5KTtcbiAgICB9XG59XG5mdW5jdGlvbiBjcmVhdGVQcm94eShlcCwgcGF0aCA9IFtdLCB0YXJnZXQgPSBmdW5jdGlvbiAoKSB7IH0pIHtcbiAgICBsZXQgaXNQcm94eVJlbGVhc2VkID0gZmFsc2U7XG4gICAgY29uc3QgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCB7XG4gICAgICAgIGdldChfdGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgaWYgKHByb3AgPT09IHJlbGVhc2VQcm94eSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJQcm94eShwcm94eSk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgICAgICAgICAgICAgIGlzUHJveHlSZWxlYXNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wID09PSBcInRoZW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0aGVuOiAoKSA9PiBwcm94eSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCByID0gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiIC8qIE1lc3NhZ2VUeXBlLkdFVCAqLyxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gci50aGVuLmJpbmQocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIFsuLi5wYXRoLCBwcm9wXSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldChfdGFyZ2V0LCBwcm9wLCByYXdWYWx1ZSkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIC8vIEZJWE1FOiBFUzYgUHJveHkgSGFuZGxlciBgc2V0YCBtZXRob2RzIGFyZSBzdXBwb3NlZCB0byByZXR1cm4gYVxuICAgICAgICAgICAgLy8gYm9vbGVhbi4gVG8gc2hvdyBnb29kIHdpbGwsIHdlIHJldHVybiB0cnVlIGFzeW5jaHJvbm91c2x5IMKvXFxfKOODhClfL8KvXG4gICAgICAgICAgICBjb25zdCBbdmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmF3VmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlNFVFwiIC8qIE1lc3NhZ2VUeXBlLlNFVCAqLyxcbiAgICAgICAgICAgICAgICBwYXRoOiBbLi4ucGF0aCwgcHJvcF0ubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgYXBwbHkoX3RhcmdldCwgX3RoaXNBcmcsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAobGFzdCA9PT0gY3JlYXRlRW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkVORFBPSU5UXCIgLyogTWVzc2FnZVR5cGUuRU5EUE9JTlQgKi8sXG4gICAgICAgICAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdlIGp1c3QgcHJldGVuZCB0aGF0IGBiaW5kKClgIGRpZG7igJl0IGhhcHBlbi5cbiAgICAgICAgICAgIGlmIChsYXN0ID09PSBcImJpbmRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgcGF0aC5zbGljZSgwLCAtMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiQVBQTFlcIiAvKiBNZXNzYWdlVHlwZS5BUFBMWSAqLyxcbiAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudExpc3QsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBjb25zdHJ1Y3QoX3RhcmdldCwgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiQ09OU1RSVUNUXCIgLyogTWVzc2FnZVR5cGUuQ09OU1RSVUNUICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG4gICAgcmVnaXN0ZXJQcm94eShwcm94eSwgZXApO1xuICAgIHJldHVybiBwcm94eTtcbn1cbmZ1bmN0aW9uIG15RmxhdChhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgYXJyKTtcbn1cbmZ1bmN0aW9uIHByb2Nlc3NBcmd1bWVudHMoYXJndW1lbnRMaXN0KSB7XG4gICAgY29uc3QgcHJvY2Vzc2VkID0gYXJndW1lbnRMaXN0Lm1hcCh0b1dpcmVWYWx1ZSk7XG4gICAgcmV0dXJuIFtwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzBdKSwgbXlGbGF0KHByb2Nlc3NlZC5tYXAoKHYpID0+IHZbMV0pKV07XG59XG5jb25zdCB0cmFuc2ZlckNhY2hlID0gbmV3IFdlYWtNYXAoKTtcbmZ1bmN0aW9uIHRyYW5zZmVyKG9iaiwgdHJhbnNmZXJzKSB7XG4gICAgdHJhbnNmZXJDYWNoZS5zZXQob2JqLCB0cmFuc2ZlcnMpO1xuICAgIHJldHVybiBvYmo7XG59XG5mdW5jdGlvbiBwcm94eShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIHsgW3Byb3h5TWFya2VyXTogdHJ1ZSB9KTtcbn1cbmZ1bmN0aW9uIHdpbmRvd0VuZHBvaW50KHcsIGNvbnRleHQgPSBnbG9iYWxUaGlzLCB0YXJnZXRPcmlnaW4gPSBcIipcIikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHBvc3RNZXNzYWdlOiAobXNnLCB0cmFuc2ZlcmFibGVzKSA9PiB3LnBvc3RNZXNzYWdlKG1zZywgdGFyZ2V0T3JpZ2luLCB0cmFuc2ZlcmFibGVzKSxcbiAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcjogY29udGV4dC5hZGRFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGNvbnRleHQucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICAgIH07XG59XG5mdW5jdGlvbiB0b1dpcmVWYWx1ZSh2YWx1ZSkge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGhhbmRsZXJdIG9mIHRyYW5zZmVySGFuZGxlcnMpIHtcbiAgICAgICAgaWYgKGhhbmRsZXIuY2FuSGFuZGxlKHZhbHVlKSkge1xuICAgICAgICAgICAgY29uc3QgW3NlcmlhbGl6ZWRWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSBoYW5kbGVyLnNlcmlhbGl6ZSh2YWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJIQU5ETEVSXCIgLyogV2lyZVZhbHVlVHlwZS5IQU5ETEVSICovLFxuICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2VyaWFsaXplZFZhbHVlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdHJhbnNmZXJhYmxlcyxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogXCJSQVdcIiAvKiBXaXJlVmFsdWVUeXBlLlJBVyAqLyxcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlckNhY2hlLmdldCh2YWx1ZSkgfHwgW10sXG4gICAgXTtcbn1cbmZ1bmN0aW9uIGZyb21XaXJlVmFsdWUodmFsdWUpIHtcbiAgICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgY2FzZSBcIkhBTkRMRVJcIiAvKiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIgKi86XG4gICAgICAgICAgICByZXR1cm4gdHJhbnNmZXJIYW5kbGVycy5nZXQodmFsdWUubmFtZSkuZGVzZXJpYWxpemUodmFsdWUudmFsdWUpO1xuICAgICAgICBjYXNlIFwiUkFXXCIgLyogV2lyZVZhbHVlVHlwZS5SQVcgKi86XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudmFsdWU7XG4gICAgfVxufVxuZnVuY3Rpb24gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwgbXNnLCB0cmFuc2ZlcnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgY29uc3QgaWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICAgICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gbChldikge1xuICAgICAgICAgICAgaWYgKCFldi5kYXRhIHx8ICFldi5kYXRhLmlkIHx8IGV2LmRhdGEuaWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbCk7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICAgICAgICBlcC5zdGFydCgpO1xuICAgICAgICB9XG4gICAgICAgIGVwLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oeyBpZCB9LCBtc2cpLCB0cmFuc2ZlcnMpO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuICAgIHJldHVybiBuZXcgQXJyYXkoNClcbiAgICAgICAgLmZpbGwoMClcbiAgICAgICAgLm1hcCgoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikudG9TdHJpbmcoMTYpKVxuICAgICAgICAuam9pbihcIi1cIik7XG59XG5cbmV4cG9ydCB7IGNyZWF0ZUVuZHBvaW50LCBleHBvc2UsIGZpbmFsaXplciwgcHJveHksIHByb3h5TWFya2VyLCByZWxlYXNlUHJveHksIHRyYW5zZmVyLCB0cmFuc2ZlckhhbmRsZXJzLCB3aW5kb3dFbmRwb2ludCwgd3JhcCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29tbGluay5tanMubWFwXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCAqIGFzIENvbWxpbmsgZnJvbSBcImNvbWxpbmtcIjtcclxuXHJcbmltcG9ydCB7VHlwZWRBcnJheSwgVGlsZUNvb3JkcywgTGF0TG5nLCBMYXRMbmdab29tLCBDb25maWdTdGF0ZSwgVGlsZUxvYWRTdGF0ZSwgTm9ybWFsaXNlTW9kZX0gZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgTm9ybWFsaXNlUmVzdWx0PFQ+ID0ge1xyXG4gIGRhdGE6IFQsXHJcbiAgbWluQmVmb3JlOiBudW1iZXIsXHJcbiAgbWF4QmVmb3JlOiBudW1iZXIsXHJcbiAgbWluQWZ0ZXI6IG51bWJlcixcclxuICBtYXhBZnRlcjogbnVtYmVyXHJcbn07XHJcblxyXG5jb25zdCBwcm9jZXNzb3IgPSB7XHJcbiAgbm9ybWFsaXNlVHlwZWRBcnJheTxUIGV4dGVuZHMgVHlwZWRBcnJheXxudW1iZXJbXT4oaW5wIDogVCkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWF4ID0gaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1heChwcmV2LCBjdXIpLCAwKTtcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWluID0gaW5wLnJlZHVjZSgocHJldiA6IG51bWJlciwgY3VyIDogbnVtYmVyKSA6IG51bWJlciA9PiBNYXRoLm1pbihwcmV2LCBjdXIpLCBtYXgpO1xyXG4gICAgY29uc3QgbmV3TWF4ID0gTWF0aC5wb3coMiwgYnBlICogOCk7XHJcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xyXG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xyXG4gICAgY29uc3QgbnN1YiA9IG5ld01heCAtIG5ld01pbjtcclxuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcclxuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IG1pbixcclxuICAgICAgbWF4QmVmb3JlOiBtYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgbm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBUKSA6IE5vcm1hbGlzZVJlc3VsdDxUPiB7XHJcbiAgICBsZXQgYnBlID0gMjtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShpbnApKSB7XHJcbiAgICAgIGlmIChpbnAgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcclxuICAgICAgICBicGUgPSAyO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJwZSA9IGlucC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc3QgbiA9IGlucC5sZW5ndGhcclxuXHJcbiAgICBjb25zdCBudW1TdGREZXZpYXRpb25zID0gMTA7XHJcblxyXG4gICAgLy8gRm9yIHNvbWUgcmVhc29uLCB0eXBlc2NyaXB0IGRvZXMgbm90IHRoaW5rIHRoZSByZWR1Y2UgZnVuY3Rpb24gYXNcclxuICAgIC8vIHVzZWQgYmVsb3cgaXMgY29tcGF0aWJsZSB3aXRoIGFsbCB0eXBlZGFycmF5c1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtZWFuID0gaW5wLnJlZHVjZSgoYSA6IG51bWJlciwgYiA6IG51bWJlcikgPT4gYSArIGIpIC8gblxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBzdGRkZXYgPSBNYXRoLnNxcnQoaW5wLm1hcCh4ID0+IE1hdGgucG93KHggLSBtZWFuLCAyKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYikgLyBuKVxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNYXggPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWF4KHByZXYsIGN1ciksIDApO1xyXG4gICAgY29uc3QgbWF4ID0gTWF0aC5taW4obWVhbitzdGRkZXYgKiBudW1TdGREZXZpYXRpb25zLCBhY3R1YWxNYXgpO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWluKHByZXYsIGN1ciksIG1heCk7XHJcbiAgICBjb25zdCBtaW4gPSBNYXRoLm1heChtZWFuLXN0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1pbik7XHJcblxyXG4gICAgY29uc29sZS5sb2coe24sIG1lYW4sIHN0ZGRldiwgYWN0dWFsTWF4LCBtYXgsIGFjdHVhbE1pbiwgbWlufSk7XHJcblxyXG4gICAgY29uc3QgbmV3TWF4ID0gTWF0aC5wb3coMiwgYnBlICogOCk7XHJcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xyXG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xyXG4gICAgY29uc3QgbnN1YiA9IG5ld01heCAtIG5ld01pbjtcclxuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcclxuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBpZiAoYSA+PSBtYXgpIGlucFtpbmRleF0gPSBuZXdNYXg7XHJcbiAgICAgIGVsc2UgaWYgKGEgPD0gbWluKSBpbnBbaW5kZXhdID0gbmV3TWluO1xyXG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogYWN0dWFsTWluLFxyXG4gICAgICBtYXhCZWZvcmU6IGFjdHVhbE1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBub3JtYWxpc2VUeXBlZEFycmF5U21hcnRXaW5kb3c8VCBleHRlbmRzIFR5cGVkQXJyYXk+KGlucCA6IFQpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxyXG5cclxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcclxuXHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1lYW4gPSBpbnAucmVkdWNlKChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA9PiBhICsgYikgLyBuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXHJcblxyXG4gICAgY29uc3QgZXhjbHVkZSA9IDAuMDAwNTtcclxuICAgIGNvbnN0IGNvcHkgPSBpbnAuc2xpY2UoMCk7XHJcbiAgICBjb3B5LnNvcnQoKTtcclxuICAgIGNvbnN0IG9mZnNldCA9IE1hdGguY2VpbChjb3B5Lmxlbmd0aCAqIGV4Y2x1ZGUpO1xyXG4gICAgY29uc3QgbGVuZ3RoID0gTWF0aC5mbG9vcihjb3B5Lmxlbmd0aCAqICgxLWV4Y2x1ZGUqMikpO1xyXG4gICAgY29uc3Qgd2luZG93ZWRDb3B5ID0gY29weS5zdWJhcnJheShvZmZzZXQsIGxlbmd0aCk7XHJcblxyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNYXggPSBjb3B5W2NvcHkubGVuZ3RoLTFdO1xyXG4gICAgY29uc3Qgd2luZG93ZWRNYXggPSB3aW5kb3dlZENvcHlbd2luZG93ZWRDb3B5Lmxlbmd0aC0xXTtcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgYWN0dWFsTWluID0gY29weVswXTtcclxuICAgIGNvbnN0IHdpbmRvd2VkTWluID0gd2luZG93ZWRDb3B5WzBdO1xyXG5cclxuICAgIGNvbnN0IG1heCA9ICh3aW5kb3dlZE1heCArIHN0ZGRldikgPiBhY3R1YWxNYXggPyBhY3R1YWxNYXggOiB3aW5kb3dlZE1heDtcclxuICAgIGNvbnN0IG1pbiA9ICh3aW5kb3dlZE1pbiAtIHN0ZGRldikgPCBhY3R1YWxNaW4gPyBhY3R1YWxNaW4gOiB3aW5kb3dlZE1pbjtcclxuXHJcbiAgICBjb25zb2xlLmxvZyh7d2luZG93ZWRNYXgsIHdpbmRvd2VkTWluLCBhY3R1YWxNYXgsIGFjdHVhbE1pbiwgb2Zmc2V0LCBsZW5ndGgsIHN0ZGRldiwgbWF4LCBtaW59KTtcclxuXHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KS0xO1xyXG4gICAgY29uc3QgbmV3TWluID0gMDtcclxuICAgIGNvbnN0IHN1YiA9IG1heCAtIG1pbjtcclxuICAgIGNvbnN0IG5zdWIgPSBuZXdNYXggLSBuZXdNaW47XHJcbiAgICBjb25zdCBmYWN0b3IgPSBuZXdNYXgvKG1heCAtIHN1Yik7XHJcbiAgICBpbnAuZm9yRWFjaCgoYSA6IG51bWJlciwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgaWYgKGEgPj0gbWF4KSBpbnBbaW5kZXhdID0gbmV3TWF4O1xyXG4gICAgICBlbHNlIGlmIChhIDw9IG1pbikgaW5wW2luZGV4XSA9IG5ld01pbjtcclxuICAgICAgZWxzZSBpbnBbaW5kZXhdID0gKCgoYS1taW4pL3N1YikgKiBuc3ViICsgbmV3TWluKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZGF0YTogaW5wLFxyXG4gICAgICBtaW5CZWZvcmU6IG1pbixcclxuICAgICAgbWF4QmVmb3JlOiBtYXgsXHJcbiAgICAgIG1pbkFmdGVyOiBuZXdNaW4sXHJcbiAgICAgIG1heEFmdGVyOiBuZXdNYXgsXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29tYmluZUltYWdlcyhzdGF0ZXMgOiBUaWxlTG9hZFN0YXRlW10sIG5vcm1hbGlzZU1vZGUgOiBudW1iZXIgPSBOb3JtYWxpc2VNb2RlLlJlZ3VsYXIpIDogTm9ybWFsaXNlUmVzdWx0PEZsb2F0MzJBcnJheT4ge1xyXG4gICAgY29uc3QgYXJlYSA9IHN0YXRlc1swXS53aWR0aCAqIHN0YXRlc1swXS5oZWlnaHQ7XHJcbiAgICBsZXQgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShhcmVhKTtcclxuICAgIGNvbnN0IHRpbGVXaWR0aCA9IDI1NjtcclxuICAgIGNvbnN0IGluY3JlbWVudCA9IDEvdGlsZVdpZHRoO1xyXG4gICAgY29uc3QgbWFwIDogUmVjb3JkPG51bWJlciwgUmVjb3JkPG51bWJlciwgVGlsZUxvYWRTdGF0ZT4+ID0ge307XHJcbiAgICBmb3IgKGxldCB0aWxlIG9mIHN0YXRlcykge1xyXG4gICAgICBpZiAoIW1hcFt0aWxlLnhdKSB7XHJcbiAgICAgICAgbWFwW3RpbGUueF0gPSB7fTtcclxuICAgICAgfVxyXG4gICAgICBtYXBbdGlsZS54XVt0aWxlLnldID0gdGlsZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBleHRlbnQgPSB7XHJcbiAgICAgIHgxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueCAtIHN0YXRlc1swXS53aWR0aEluVGlsZXMvMixcclxuICAgICAgeDI6IHN0YXRlc1swXS5leGFjdFBvcy54ICsgc3RhdGVzWzBdLndpZHRoSW5UaWxlcy8yLFxyXG4gICAgICB5MTogc3RhdGVzWzBdLmV4YWN0UG9zLnkgLSBzdGF0ZXNbMF0uaGVpZ2h0SW5UaWxlcy8yLFxyXG4gICAgICB5Mjogc3RhdGVzWzBdLmV4YWN0UG9zLnkgKyBzdGF0ZXNbMF0uaGVpZ2h0SW5UaWxlcy8yXHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgZm9yIChsZXQgeSA9IGV4dGVudC55MTsgeSA8IGV4dGVudC55MjsgeSArPSBpbmNyZW1lbnQpIHtcclxuICAgICAgZm9yIChsZXQgeCA9IGV4dGVudC54MTsgeCA8IGV4dGVudC54MjsgeCArPSBpbmNyZW1lbnQpIHtcclxuICAgICAgICBjb25zdCB0aWxlID0ge1xyXG4gICAgICAgICAgeDogTWF0aC5mbG9vcih4KSxcclxuICAgICAgICAgIHk6IE1hdGguZmxvb3IoeSlcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IHB4ID0ge1xyXG4gICAgICAgICAgeDogTWF0aC5mbG9vcigoeCUxKSp0aWxlV2lkdGgpLFxyXG4gICAgICAgICAgeTogTWF0aC5mbG9vcigoeSUxKSp0aWxlV2lkdGgpXHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBpZHggPSBweC55KnRpbGVXaWR0aCArIHB4Lng7XHJcbiAgICAgICAgb3V0cHV0W2krK10gPSBtYXBbdGlsZS54XVt0aWxlLnldLmhlaWdodHNbaWR4XTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgbGV0IHJlc3VsdCA9IHtcclxuICAgICAgZGF0YTogb3V0cHV0LFxyXG4gICAgICBtaW5CZWZvcmU6IE1hdGgucG93KDIsIDMyKSxcclxuICAgICAgbWF4QmVmb3JlOiAwLFxyXG4gICAgICBtaW5BZnRlcjogTWF0aC5wb3coMiwgMzIpLFxyXG4gICAgICBtYXhBZnRlcjogMCxcclxuICAgIH07XHJcbiAgICBpZiAobm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlJlZ3VsYXIpIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5KG91dHB1dCk7XHJcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5TbWFydCkge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydChvdXRwdXQpO1xyXG4gICAgfSBlbHNlIGlmIChub3JtYWxpc2VNb2RlID09IE5vcm1hbGlzZU1vZGUuU21hcnRXaW5kb3cpIHtcclxuICAgICAgcmVzdWx0ID0gdGhpcy5ub3JtYWxpc2VUeXBlZEFycmF5U21hcnRXaW5kb3cob3V0cHV0KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcmVzdWx0Lm1heEFmdGVyID0gTWF0aC5tYXgob3V0cHV0W2ldLCByZXN1bHQubWF4QWZ0ZXIpO1xyXG4gICAgICAgIHJlc3VsdC5taW5BZnRlciA9IE1hdGgubWluKG91dHB1dFtpXSwgcmVzdWx0Lm1pbkFmdGVyKTtcclxuICAgICAgfVxyXG4gICAgICByZXN1bHQubWF4QmVmb3JlID0gcmVzdWx0Lm1heEFmdGVyO1xyXG4gICAgICByZXN1bHQubWluQmVmb3JlID0gcmVzdWx0Lm1pbkFmdGVyO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcbn1cclxuXHJcbkNvbWxpbmsuZXhwb3NlKHByb2Nlc3Nvcik7Il0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9