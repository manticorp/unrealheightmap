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
var KEY = 'FOkBTi_OQyaSFYGMo5x_-Q';
var format = function (str, obj) {
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        str = str.replace("{".concat(key, "}"), value.toString());
    }
    return str;
};
var NextZen = /** @class */ (function () {
    function NextZen() {
    }
    NextZen.getUrl = function (args) {
        return format(this.baseUrl, __assign(__assign({}, args), { key: KEY }));
    };
    NextZen.getApiKeyedUrl = function () {
        return format(this.baseUrl, { key: KEY });
    };
    NextZen.baseUrl = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png?api_key={key}";
    NextZen.tileWidth = 256;
    NextZen.tileHeight = 256;
    return NextZen;
}());
export default NextZen;
//# sourceMappingURL=nextzen.js.map