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
            minBefore: actualMin,
            maxBefore: actualMax,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFFRCwyQ0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9zcmMvaGVscGVycy50cyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL25vZGVfbW9kdWxlcy9jb21saW5rL2Rpc3QvZXNtL2NvbWxpbmsubWpzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvLi9zcmMvcHJvY2Vzc29yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBmb3JtYXQgPSAoc3RyIDogc3RyaW5nLCBvYmogOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmd8bnVtYmVyPikgOiBzdHJpbmcgPT4ge1xyXG4gIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XHJcbiAgICBzdHIgPSBzdHIucmVwbGFjZShgeyR7a2V5fX1gLCB2YWx1ZS50b1N0cmluZygpKTtcclxuICB9XHJcbiAgcmV0dXJuIHN0cjtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXkgPVxyXG4gIHwgSW50OEFycmF5XHJcbiAgfCBVaW50OEFycmF5XHJcbiAgfCBVaW50OENsYW1wZWRBcnJheVxyXG4gIHwgSW50MTZBcnJheVxyXG4gIHwgVWludDE2QXJyYXlcclxuICB8IEludDMyQXJyYXlcclxuICB8IFVpbnQzMkFycmF5XHJcbiAgfCBGbG9hdDMyQXJyYXlcclxuICB8IEZsb2F0NjRBcnJheTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGlsZUNvb3JkcyB7XHJcbiAgeDogbnVtYmVyLFxyXG4gIHk6IG51bWJlcixcclxuICB6OiBudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIExhdExuZyB7XHJcbiAgbGF0aXR1ZGU6IG51bWJlcixcclxuICBsb25naXR1ZGU6IG51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgTGF0TG5nWm9vbSBleHRlbmRzIExhdExuZyB7XHJcbiAgem9vbTogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbmZpZ1N0YXRlID0gVGlsZUNvb3JkcyAmIExhdExuZ1pvb20gJiB7XHJcbiAgd2lkdGggOiBudW1iZXIsXHJcbiAgaGVpZ2h0IDogbnVtYmVyLFxyXG4gIGV4YWN0UG9zIDogVGlsZUNvb3JkcyxcclxuICB3aWR0aEluVGlsZXMgOiBudW1iZXIsXHJcbiAgaGVpZ2h0SW5UaWxlcyA6IG51bWJlcixcclxuICBzdGFydHg6IG51bWJlcixcclxuICBzdGFydHk6IG51bWJlcixcclxuICBlbmR4OiBudW1iZXIsXHJcbiAgZW5keTogbnVtYmVyLFxyXG4gIHN0YXR1czogc3RyaW5nLFxyXG4gIGJvdW5kczogW0xhdExuZywgTGF0TG5nXSxcclxuICBwaHlzOiB7d2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXJ9XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBUaWxlTG9hZFN0YXRlID0gQ29uZmlnU3RhdGUgJiB7eDogbnVtYmVyLCB5OiBudW1iZXIsIGhlaWdodHM6IEZsb2F0MzJBcnJheX07XHJcblxyXG5leHBvcnQgZW51bSBOb3JtYWxpc2VNb2RlIHtcclxuICBPZmYgPSAwLFxyXG4gIFJlZ3VsYXIgPSAxLFxyXG4gIFNtYXJ0ID0gMixcclxuICBTbWFydFdpbmRvdyA9IDMsXHJcbn0iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuICovXG5jb25zdCBwcm94eU1hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsucHJveHlcIik7XG5jb25zdCBjcmVhdGVFbmRwb2ludCA9IFN5bWJvbChcIkNvbWxpbmsuZW5kcG9pbnRcIik7XG5jb25zdCByZWxlYXNlUHJveHkgPSBTeW1ib2woXCJDb21saW5rLnJlbGVhc2VQcm94eVwiKTtcbmNvbnN0IGZpbmFsaXplciA9IFN5bWJvbChcIkNvbWxpbmsuZmluYWxpemVyXCIpO1xuY29uc3QgdGhyb3dNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnRocm93blwiKTtcbmNvbnN0IGlzT2JqZWN0ID0gKHZhbCkgPT4gKHR5cGVvZiB2YWwgPT09IFwib2JqZWN0XCIgJiYgdmFsICE9PSBudWxsKSB8fCB0eXBlb2YgdmFsID09PSBcImZ1bmN0aW9uXCI7XG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZSB0byBoYW5kbGUgb2JqZWN0cyBtYXJrZWQgdG8gcHJveHkuXG4gKi9cbmNvbnN0IHByb3h5VHJhbnNmZXJIYW5kbGVyID0ge1xuICAgIGNhbkhhbmRsZTogKHZhbCkgPT4gaXNPYmplY3QodmFsKSAmJiB2YWxbcHJveHlNYXJrZXJdLFxuICAgIHNlcmlhbGl6ZShvYmopIHtcbiAgICAgICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICBleHBvc2Uob2JqLCBwb3J0MSk7XG4gICAgICAgIHJldHVybiBbcG9ydDIsIFtwb3J0Ml1dO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemUocG9ydCkge1xuICAgICAgICBwb3J0LnN0YXJ0KCk7XG4gICAgICAgIHJldHVybiB3cmFwKHBvcnQpO1xuICAgIH0sXG59O1xuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGVyIHRvIGhhbmRsZSB0aHJvd24gZXhjZXB0aW9ucy5cbiAqL1xuY29uc3QgdGhyb3dUcmFuc2ZlckhhbmRsZXIgPSB7XG4gICAgY2FuSGFuZGxlOiAodmFsdWUpID0+IGlzT2JqZWN0KHZhbHVlKSAmJiB0aHJvd01hcmtlciBpbiB2YWx1ZSxcbiAgICBzZXJpYWxpemUoeyB2YWx1ZSB9KSB7XG4gICAgICAgIGxldCBzZXJpYWxpemVkO1xuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgc2VyaWFsaXplZCA9IHtcbiAgICAgICAgICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHZhbHVlLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHZhbHVlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrOiB2YWx1ZS5zdGFjayxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlcmlhbGl6ZWQgPSB7IGlzRXJyb3I6IGZhbHNlLCB2YWx1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbc2VyaWFsaXplZCwgW11dO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemUoc2VyaWFsaXplZCkge1xuICAgICAgICBpZiAoc2VyaWFsaXplZC5pc0Vycm9yKSB7XG4gICAgICAgICAgICB0aHJvdyBPYmplY3QuYXNzaWduKG5ldyBFcnJvcihzZXJpYWxpemVkLnZhbHVlLm1lc3NhZ2UpLCBzZXJpYWxpemVkLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBzZXJpYWxpemVkLnZhbHVlO1xuICAgIH0sXG59O1xuLyoqXG4gKiBBbGxvd3MgY3VzdG9taXppbmcgdGhlIHNlcmlhbGl6YXRpb24gb2YgY2VydGFpbiB2YWx1ZXMuXG4gKi9cbmNvbnN0IHRyYW5zZmVySGFuZGxlcnMgPSBuZXcgTWFwKFtcbiAgICBbXCJwcm94eVwiLCBwcm94eVRyYW5zZmVySGFuZGxlcl0sXG4gICAgW1widGhyb3dcIiwgdGhyb3dUcmFuc2ZlckhhbmRsZXJdLFxuXSk7XG5mdW5jdGlvbiBpc0FsbG93ZWRPcmlnaW4oYWxsb3dlZE9yaWdpbnMsIG9yaWdpbikge1xuICAgIGZvciAoY29uc3QgYWxsb3dlZE9yaWdpbiBvZiBhbGxvd2VkT3JpZ2lucykge1xuICAgICAgICBpZiAob3JpZ2luID09PSBhbGxvd2VkT3JpZ2luIHx8IGFsbG93ZWRPcmlnaW4gPT09IFwiKlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWxsb3dlZE9yaWdpbiBpbnN0YW5jZW9mIFJlZ0V4cCAmJiBhbGxvd2VkT3JpZ2luLnRlc3Qob3JpZ2luKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZnVuY3Rpb24gZXhwb3NlKG9iaiwgZXAgPSBnbG9iYWxUaGlzLCBhbGxvd2VkT3JpZ2lucyA9IFtcIipcIl0pIHtcbiAgICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBjYWxsYmFjayhldikge1xuICAgICAgICBpZiAoIWV2IHx8ICFldi5kYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0FsbG93ZWRPcmlnaW4oYWxsb3dlZE9yaWdpbnMsIGV2Lm9yaWdpbikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBvcmlnaW4gJyR7ZXYub3JpZ2lufScgZm9yIGNvbWxpbmsgcHJveHlgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGlkLCB0eXBlLCBwYXRoIH0gPSBPYmplY3QuYXNzaWduKHsgcGF0aDogW10gfSwgZXYuZGF0YSk7XG4gICAgICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IChldi5kYXRhLmFyZ3VtZW50TGlzdCB8fCBbXSkubWFwKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICBsZXQgcmV0dXJuVmFsdWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLnNsaWNlKDAsIC0xKS5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBwYXRoLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiR0VUXCIgLyogTWVzc2FnZVR5cGUuR0VUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJTRVRcIiAvKiBNZXNzYWdlVHlwZS5TRVQgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFtwYXRoLnNsaWNlKC0xKVswXV0gPSBmcm9tV2lyZVZhbHVlKGV2LmRhdGEudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJBUFBMWVwiIC8qIE1lc3NhZ2VUeXBlLkFQUExZICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlLmFwcGx5KHBhcmVudCwgYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiQ09OU1RSVUNUXCIgLyogTWVzc2FnZVR5cGUuQ09OU1RSVUNUICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG5ldyByYXdWYWx1ZSguLi5hcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBwcm94eSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkVORFBPSU5UXCIgLyogTWVzc2FnZVR5cGUuRU5EUE9JTlQgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9zZShvYmosIHBvcnQyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJhbnNmZXIocG9ydDEsIFtwb3J0MV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHJldHVyblZhbHVlKVxuICAgICAgICAgICAgLmNhdGNoKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKChyZXR1cm5WYWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyZXR1cm5WYWx1ZSk7XG4gICAgICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHdpcmVWYWx1ZSksIHsgaWQgfSksIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT09IFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi8pIHtcbiAgICAgICAgICAgICAgICAvLyBkZXRhY2ggYW5kIGRlYWN0aXZlIGFmdGVyIHNlbmRpbmcgcmVsZWFzZSByZXNwb25zZSBhYm92ZS5cbiAgICAgICAgICAgICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgY2xvc2VFbmRQb2ludChlcCk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbmFsaXplciBpbiBvYmogJiYgdHlwZW9mIG9ialtmaW5hbGl6ZXJdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqW2ZpbmFsaXplcl0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAvLyBTZW5kIFNlcmlhbGl6YXRpb24gRXJyb3IgVG8gQ2FsbGVyXG4gICAgICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFR5cGVFcnJvcihcIlVuc2VyaWFsaXphYmxlIHJldHVybiB2YWx1ZVwiKSxcbiAgICAgICAgICAgICAgICBbdGhyb3dNYXJrZXJdOiAwLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHdpcmVWYWx1ZSksIHsgaWQgfSksIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoZXAuc3RhcnQpIHtcbiAgICAgICAgZXAuc3RhcnQoKTtcbiAgICB9XG59XG5mdW5jdGlvbiBpc01lc3NhZ2VQb3J0KGVuZHBvaW50KSB7XG4gICAgcmV0dXJuIGVuZHBvaW50LmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTWVzc2FnZVBvcnRcIjtcbn1cbmZ1bmN0aW9uIGNsb3NlRW5kUG9pbnQoZW5kcG9pbnQpIHtcbiAgICBpZiAoaXNNZXNzYWdlUG9ydChlbmRwb2ludCkpXG4gICAgICAgIGVuZHBvaW50LmNsb3NlKCk7XG59XG5mdW5jdGlvbiB3cmFwKGVwLCB0YXJnZXQpIHtcbiAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIFtdLCB0YXJnZXQpO1xufVxuZnVuY3Rpb24gdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNSZWxlYXNlZCkge1xuICAgIGlmIChpc1JlbGVhc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3h5IGhhcyBiZWVuIHJlbGVhc2VkIGFuZCBpcyBub3QgdXNlYWJsZVwiKTtcbiAgICB9XG59XG5mdW5jdGlvbiByZWxlYXNlRW5kcG9pbnQoZXApIHtcbiAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICB0eXBlOiBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovLFxuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgICB9KTtcbn1cbmNvbnN0IHByb3h5Q291bnRlciA9IG5ldyBXZWFrTWFwKCk7XG5jb25zdCBwcm94eUZpbmFsaXplcnMgPSBcIkZpbmFsaXphdGlvblJlZ2lzdHJ5XCIgaW4gZ2xvYmFsVGhpcyAmJlxuICAgIG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoZXApID0+IHtcbiAgICAgICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgLSAxO1xuICAgICAgICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gICAgICAgIGlmIChuZXdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICAgICAgfVxuICAgIH0pO1xuZnVuY3Rpb24gcmVnaXN0ZXJQcm94eShwcm94eSwgZXApIHtcbiAgICBjb25zdCBuZXdDb3VudCA9IChwcm94eUNvdW50ZXIuZ2V0KGVwKSB8fCAwKSArIDE7XG4gICAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICAgIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICAgICAgcHJveHlGaW5hbGl6ZXJzLnJlZ2lzdGVyKHByb3h5LCBlcCwgcHJveHkpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHVucmVnaXN0ZXJQcm94eShwcm94eSkge1xuICAgIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICAgICAgcHJveHlGaW5hbGl6ZXJzLnVucmVnaXN0ZXIocHJveHkpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNyZWF0ZVByb3h5KGVwLCBwYXRoID0gW10sIHRhcmdldCA9IGZ1bmN0aW9uICgpIHsgfSkge1xuICAgIGxldCBpc1Byb3h5UmVsZWFzZWQgPSBmYWxzZTtcbiAgICBjb25zdCBwcm94eSA9IG5ldyBQcm94eSh0YXJnZXQsIHtcbiAgICAgICAgZ2V0KF90YXJnZXQsIHByb3ApIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBpZiAocHJvcCA9PT0gcmVsZWFzZVByb3h5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlclByb3h5KHByb3h5KTtcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICAgICAgICAgICAgICAgICAgaXNQcm94eVJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3AgPT09IFwidGhlblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRoZW46ICgpID0+IHByb3h5IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIgLyogTWVzc2FnZVR5cGUuR0VUICovLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByLnRoZW4uYmluZChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgWy4uLnBhdGgsIHByb3BdKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0KF90YXJnZXQsIHByb3AsIHJhd1ZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgLy8gRklYTUU6IEVTNiBQcm94eSBIYW5kbGVyIGBzZXRgIG1ldGhvZHMgYXJlIHN1cHBvc2VkIHRvIHJldHVybiBhXG4gICAgICAgICAgICAvLyBib29sZWFuLiBUbyBzaG93IGdvb2Qgd2lsbCwgd2UgcmV0dXJuIHRydWUgYXN5bmNocm9ub3VzbHkgwq9cXF8o44OEKV8vwq9cbiAgICAgICAgICAgIGNvbnN0IFt2YWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyYXdWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiU0VUXCIgLyogTWVzc2FnZVR5cGUuU0VUICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IFsuLi5wYXRoLCBwcm9wXS5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBhcHBseShfdGFyZ2V0LCBfdGhpc0FyZywgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICAgICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgICAgICAgY29uc3QgbGFzdCA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChsYXN0ID09PSBjcmVhdGVFbmRwb2ludCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiRU5EUE9JTlRcIiAvKiBNZXNzYWdlVHlwZS5FTkRQT0lOVCAqLyxcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gV2UganVzdCBwcmV0ZW5kIHRoYXQgYGJpbmQoKWAgZGlkbuKAmXQgaGFwcGVuLlxuICAgICAgICAgICAgaWYgKGxhc3QgPT09IFwiYmluZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBwYXRoLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJBUFBMWVwiIC8qIE1lc3NhZ2VUeXBlLkFQUExZICovLFxuICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnN0cnVjdChfdGFyZ2V0LCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJDT05TVFJVQ1RcIiAvKiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICB9KTtcbiAgICByZWdpc3RlclByb3h5KHByb3h5LCBlcCk7XG4gICAgcmV0dXJuIHByb3h5O1xufVxuZnVuY3Rpb24gbXlGbGF0KGFycikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBhcnIpO1xufVxuZnVuY3Rpb24gcHJvY2Vzc0FyZ3VtZW50cyhhcmd1bWVudExpc3QpIHtcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBhcmd1bWVudExpc3QubWFwKHRvV2lyZVZhbHVlKTtcbiAgICByZXR1cm4gW3Byb2Nlc3NlZC5tYXAoKHYpID0+IHZbMF0pLCBteUZsYXQocHJvY2Vzc2VkLm1hcCgodikgPT4gdlsxXSkpXTtcbn1cbmNvbnN0IHRyYW5zZmVyQ2FjaGUgPSBuZXcgV2Vha01hcCgpO1xuZnVuY3Rpb24gdHJhbnNmZXIob2JqLCB0cmFuc2ZlcnMpIHtcbiAgICB0cmFuc2ZlckNhY2hlLnNldChvYmosIHRyYW5zZmVycyk7XG4gICAgcmV0dXJuIG9iajtcbn1cbmZ1bmN0aW9uIHByb3h5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgeyBbcHJveHlNYXJrZXJdOiB0cnVlIH0pO1xufVxuZnVuY3Rpb24gd2luZG93RW5kcG9pbnQodywgY29udGV4dCA9IGdsb2JhbFRoaXMsIHRhcmdldE9yaWdpbiA9IFwiKlwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcG9zdE1lc3NhZ2U6IChtc2csIHRyYW5zZmVyYWJsZXMpID0+IHcucG9zdE1lc3NhZ2UobXNnLCB0YXJnZXRPcmlnaW4sIHRyYW5zZmVyYWJsZXMpLFxuICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogY29udGV4dC5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRvV2lyZVZhbHVlKHZhbHVlKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgaGFuZGxlcl0gb2YgdHJhbnNmZXJIYW5kbGVycykge1xuICAgICAgICBpZiAoaGFuZGxlci5jYW5IYW5kbGUodmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBbc2VyaWFsaXplZFZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IGhhbmRsZXIuc2VyaWFsaXplKHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkhBTkRMRVJcIiAvKiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIgKi8sXG4gICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzZXJpYWxpemVkVmFsdWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0cmFuc2ZlcmFibGVzLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBcIlJBV1wiIC8qIFdpcmVWYWx1ZVR5cGUuUkFXICovLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyQ2FjaGUuZ2V0KHZhbHVlKSB8fCBbXSxcbiAgICBdO1xufVxuZnVuY3Rpb24gZnJvbVdpcmVWYWx1ZSh2YWx1ZSkge1xuICAgIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgICAgICBjYXNlIFwiSEFORExFUlwiIC8qIFdpcmVWYWx1ZVR5cGUuSEFORExFUiAqLzpcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2ZlckhhbmRsZXJzLmdldCh2YWx1ZS5uYW1lKS5kZXNlcmlhbGl6ZSh2YWx1ZS52YWx1ZSk7XG4gICAgICAgIGNhc2UgXCJSQVdcIiAvKiBXaXJlVmFsdWVUeXBlLlJBVyAqLzpcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS52YWx1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCBtc2csIHRyYW5zZmVycykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjb25zdCBpZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgICAgICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBsKGV2KSB7XG4gICAgICAgICAgICBpZiAoIWV2LmRhdGEgfHwgIWV2LmRhdGEuaWQgfHwgZXYuZGF0YS5pZCAhPT0gaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBsKTtcbiAgICAgICAgICAgIHJlc29sdmUoZXYuZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXAuc3RhcnQpIHtcbiAgICAgICAgICAgIGVwLnN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZXAucG9zdE1lc3NhZ2UoT2JqZWN0LmFzc2lnbih7IGlkIH0sIG1zZyksIHRyYW5zZmVycyk7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKSB7XG4gICAgcmV0dXJuIG5ldyBBcnJheSg0KVxuICAgICAgICAuZmlsbCgwKVxuICAgICAgICAubWFwKCgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKS50b1N0cmluZygxNikpXG4gICAgICAgIC5qb2luKFwiLVwiKTtcbn1cblxuZXhwb3J0IHsgY3JlYXRlRW5kcG9pbnQsIGV4cG9zZSwgZmluYWxpemVyLCBwcm94eSwgcHJveHlNYXJrZXIsIHJlbGVhc2VQcm94eSwgdHJhbnNmZXIsIHRyYW5zZmVySGFuZGxlcnMsIHdpbmRvd0VuZHBvaW50LCB3cmFwIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21saW5rLm1qcy5tYXBcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiaW1wb3J0ICogYXMgQ29tbGluayBmcm9tIFwiY29tbGlua1wiO1xyXG5cclxuaW1wb3J0IHtUeXBlZEFycmF5LCBUaWxlQ29vcmRzLCBMYXRMbmcsIExhdExuZ1pvb20sIENvbmZpZ1N0YXRlLCBUaWxlTG9hZFN0YXRlLCBOb3JtYWxpc2VNb2RlfSBmcm9tIFwiLi9oZWxwZXJzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBOb3JtYWxpc2VSZXN1bHQ8VD4gPSB7XHJcbiAgZGF0YTogVCxcclxuICBtaW5CZWZvcmU6IG51bWJlcixcclxuICBtYXhCZWZvcmU6IG51bWJlcixcclxuICBtaW5BZnRlcjogbnVtYmVyLFxyXG4gIG1heEFmdGVyOiBudW1iZXJcclxufTtcclxuXHJcbmNvbnN0IHByb2Nlc3NvciA9IHtcclxuICBub3JtYWxpc2VUeXBlZEFycmF5PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBUKSA6IE5vcm1hbGlzZVJlc3VsdDxUPiB7XHJcbiAgICBsZXQgYnBlID0gMjtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShpbnApKSB7XHJcbiAgICAgIGlmIChpbnAgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcclxuICAgICAgICBicGUgPSAyO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJwZSA9IGlucC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gRm9yIHNvbWUgcmVhc29uLCB0eXBlc2NyaXB0IGRvZXMgbm90IHRoaW5rIHRoZSByZWR1Y2UgZnVuY3Rpb24gYXNcclxuICAgIC8vIHVzZWQgYmVsb3cgaXMgY29tcGF0aWJsZSB3aXRoIGFsbCB0eXBlZGFycmF5c1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtYXggPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWF4KHByZXYsIGN1ciksIDApO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtaW4gPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWluKHByZXYsIGN1ciksIG1heCk7XHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KTtcclxuICAgIGNvbnN0IG5ld01pbiA9IDA7XHJcbiAgICBjb25zdCBzdWIgPSBtYXggLSBtaW47XHJcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xyXG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xyXG4gICAgaW5wLmZvckVhY2goKGEgOiBudW1iZXIsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogbWluLFxyXG4gICAgICBtYXhCZWZvcmU6IG1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBub3JtYWxpc2VUeXBlZEFycmF5U21hcnQ8VCBleHRlbmRzIFR5cGVkQXJyYXl8bnVtYmVyW10+KGlucCA6IFQpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxyXG5cclxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcclxuXHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1lYW4gPSBpbnAucmVkdWNlKChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA9PiBhICsgYikgLyBuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5tYXgocHJldiwgY3VyKSwgMCk7XHJcbiAgICBjb25zdCBtYXggPSBNYXRoLm1pbihtZWFuK3N0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1heCk7XHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1pbiA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5taW4ocHJldiwgY3VyKSwgbWF4KTtcclxuICAgIGNvbnN0IG1pbiA9IE1hdGgubWF4KG1lYW4tc3RkZGV2ICogbnVtU3RkRGV2aWF0aW9ucywgYWN0dWFsTWluKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyh7biwgbWVhbiwgc3RkZGV2LCBhY3R1YWxNYXgsIG1heCwgYWN0dWFsTWluLCBtaW59KTtcclxuXHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KTtcclxuICAgIGNvbnN0IG5ld01pbiA9IDA7XHJcbiAgICBjb25zdCBzdWIgPSBtYXggLSBtaW47XHJcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xyXG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xyXG4gICAgaW5wLmZvckVhY2goKGEgOiBudW1iZXIsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGlmIChhID49IG1heCkgaW5wW2luZGV4XSA9IG5ld01heDtcclxuICAgICAgZWxzZSBpZiAoYSA8PSBtaW4pIGlucFtpbmRleF0gPSBuZXdNaW47XHJcbiAgICAgIGVsc2UgaW5wW2luZGV4XSA9ICgoKGEtbWluKS9zdWIpICogbnN1YiArIG5ld01pbik7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRhdGE6IGlucCxcclxuICAgICAgbWluQmVmb3JlOiBhY3R1YWxNaW4sXHJcbiAgICAgIG1heEJlZm9yZTogYWN0dWFsTWF4LFxyXG4gICAgICBtaW5BZnRlcjogbmV3TWluLFxyXG4gICAgICBtYXhBZnRlcjogbmV3TWF4LFxyXG4gICAgfTtcclxuICB9LFxyXG4gIG5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydFdpbmRvdzxUIGV4dGVuZHMgVHlwZWRBcnJheT4oaW5wIDogVCkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnN0IG4gPSBpbnAubGVuZ3RoXHJcblxyXG4gICAgY29uc3QgbnVtU3RkRGV2aWF0aW9ucyA9IDEwO1xyXG5cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWVhbiA9IGlucC5yZWR1Y2UoKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpID0+IGEgKyBiKSAvIG5cclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3Qgc3RkZGV2ID0gTWF0aC5zcXJ0KGlucC5tYXAoeCA9PiBNYXRoLnBvdyh4IC0gbWVhbiwgMikpLnJlZHVjZSgoYSwgYikgPT4gYSArIGIpIC8gbilcclxuXHJcbiAgICBjb25zdCBleGNsdWRlID0gMC4wMDA1O1xyXG4gICAgY29uc3QgY29weSA9IGlucC5zbGljZSgwKTtcclxuICAgIGNvcHkuc29ydCgpO1xyXG4gICAgY29uc3Qgb2Zmc2V0ID0gTWF0aC5jZWlsKGNvcHkubGVuZ3RoICogZXhjbHVkZSk7XHJcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmZsb29yKGNvcHkubGVuZ3RoICogKDEtZXhjbHVkZSoyKSk7XHJcbiAgICBjb25zdCB3aW5kb3dlZENvcHkgPSBjb3B5LnN1YmFycmF5KG9mZnNldCwgbGVuZ3RoKTtcclxuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGNvcHlbY29weS5sZW5ndGgtMV07XHJcbiAgICBjb25zdCB3aW5kb3dlZE1heCA9IHdpbmRvd2VkQ29weVt3aW5kb3dlZENvcHkubGVuZ3RoLTFdO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBjb3B5WzBdO1xyXG4gICAgY29uc3Qgd2luZG93ZWRNaW4gPSB3aW5kb3dlZENvcHlbMF07XHJcblxyXG4gICAgY29uc3QgbWF4ID0gKHdpbmRvd2VkTWF4ICsgc3RkZGV2KSA+IGFjdHVhbE1heCA/IGFjdHVhbE1heCA6IHdpbmRvd2VkTWF4O1xyXG4gICAgY29uc3QgbWluID0gKHdpbmRvd2VkTWluIC0gc3RkZGV2KSA8IGFjdHVhbE1pbiA/IGFjdHVhbE1pbiA6IHdpbmRvd2VkTWluO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKHt3aW5kb3dlZE1heCwgd2luZG93ZWRNaW4sIGFjdHVhbE1heCwgYWN0dWFsTWluLCBvZmZzZXQsIGxlbmd0aCwgc3RkZGV2LCBtYXgsIG1pbn0pO1xyXG5cclxuICAgIGNvbnN0IG5ld01heCA9IE1hdGgucG93KDIsIGJwZSAqIDgpLTE7XHJcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xyXG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xyXG4gICAgY29uc3QgbnN1YiA9IG5ld01heCAtIG5ld01pbjtcclxuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcclxuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBpZiAoYSA+PSBtYXgpIGlucFtpbmRleF0gPSBuZXdNYXg7XHJcbiAgICAgIGVsc2UgaWYgKGEgPD0gbWluKSBpbnBbaW5kZXhdID0gbmV3TWluO1xyXG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogYWN0dWFsTWluLFxyXG4gICAgICBtYXhCZWZvcmU6IGFjdHVhbE1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBjb21iaW5lSW1hZ2VzKHN0YXRlcyA6IFRpbGVMb2FkU3RhdGVbXSwgbm9ybWFsaXNlTW9kZSA6IG51bWJlciA9IE5vcm1hbGlzZU1vZGUuUmVndWxhcikgOiBOb3JtYWxpc2VSZXN1bHQ8RmxvYXQzMkFycmF5PiB7XHJcbiAgICBjb25zdCBhcmVhID0gc3RhdGVzWzBdLndpZHRoICogc3RhdGVzWzBdLmhlaWdodDtcclxuICAgIGxldCBvdXRwdXQgPSBuZXcgRmxvYXQzMkFycmF5KGFyZWEpO1xyXG4gICAgY29uc3QgdGlsZVdpZHRoID0gMjU2O1xyXG4gICAgY29uc3QgaW5jcmVtZW50ID0gMS90aWxlV2lkdGg7XHJcbiAgICBjb25zdCBtYXAgOiBSZWNvcmQ8bnVtYmVyLCBSZWNvcmQ8bnVtYmVyLCBUaWxlTG9hZFN0YXRlPj4gPSB7fTtcclxuICAgIGZvciAobGV0IHRpbGUgb2Ygc3RhdGVzKSB7XHJcbiAgICAgIGlmICghbWFwW3RpbGUueF0pIHtcclxuICAgICAgICBtYXBbdGlsZS54XSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIG1hcFt0aWxlLnhdW3RpbGUueV0gPSB0aWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGV4dGVudCA9IHtcclxuICAgICAgeDE6IHN0YXRlc1swXS5leGFjdFBvcy54IC0gc3RhdGVzWzBdLndpZHRoSW5UaWxlcy8yLFxyXG4gICAgICB4Mjogc3RhdGVzWzBdLmV4YWN0UG9zLnggKyBzdGF0ZXNbMF0ud2lkdGhJblRpbGVzLzIsXHJcbiAgICAgIHkxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSAtIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzIsXHJcbiAgICAgIHkyOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSArIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzJcclxuICAgIH1cclxuXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBmb3IgKGxldCB5ID0gZXh0ZW50LnkxOyB5IDwgZXh0ZW50LnkyOyB5ICs9IGluY3JlbWVudCkge1xyXG4gICAgICBmb3IgKGxldCB4ID0gZXh0ZW50LngxOyB4IDwgZXh0ZW50LngyOyB4ICs9IGluY3JlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHRpbGUgPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKHgpLFxyXG4gICAgICAgICAgeTogTWF0aC5mbG9vcih5KVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgcHggPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKCh4JTEpKnRpbGVXaWR0aCksXHJcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKCh5JTEpKnRpbGVXaWR0aClcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IHB4LnkqdGlsZVdpZHRoICsgcHgueDtcclxuICAgICAgICBvdXRwdXRbaSsrXSA9IG1hcFt0aWxlLnhdW3RpbGUueV0uaGVpZ2h0c1tpZHhdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBsZXQgcmVzdWx0ID0ge1xyXG4gICAgICBkYXRhOiBvdXRwdXQsXHJcbiAgICAgIG1pbkJlZm9yZTogTWF0aC5wb3coMiwgMzIpLFxyXG4gICAgICBtYXhCZWZvcmU6IDAsXHJcbiAgICAgIG1pbkFmdGVyOiBNYXRoLnBvdygyLCAzMiksXHJcbiAgICAgIG1heEFmdGVyOiAwLFxyXG4gICAgfTtcclxuICAgIGlmIChub3JtYWxpc2VNb2RlID09IE5vcm1hbGlzZU1vZGUuUmVndWxhcikge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXkob3V0cHV0KTtcclxuICAgIH0gZWxzZSBpZiAobm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlNtYXJ0KSB7XHJcbiAgICAgIHJlc3VsdCA9IHRoaXMubm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0KG91dHB1dCk7XHJcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5TbWFydFdpbmRvdykge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydFdpbmRvdyhvdXRwdXQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICByZXN1bHQubWF4QWZ0ZXIgPSBNYXRoLm1heChvdXRwdXRbaV0sIHJlc3VsdC5tYXhBZnRlcik7XHJcbiAgICAgICAgcmVzdWx0Lm1pbkFmdGVyID0gTWF0aC5taW4ob3V0cHV0W2ldLCByZXN1bHQubWluQWZ0ZXIpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlc3VsdC5tYXhCZWZvcmUgPSByZXN1bHQubWF4QWZ0ZXI7XHJcbiAgICAgIHJlc3VsdC5taW5CZWZvcmUgPSByZXN1bHQubWluQWZ0ZXI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxufVxyXG5cclxuQ29tbGluay5leHBvc2UocHJvY2Vzc29yKTsiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=