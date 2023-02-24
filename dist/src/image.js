var loaded = function (im, timeout) {
    if (timeout === void 0) { timeout = 10000; }
    if (im.complete || im.naturalWidth > 0) {
        return Promise.resolve(im);
    }
    else {
        return new Promise(function (resolve, reject) {
            var to = setTimeout(function () { return reject('Image not loaded'); }, timeout);
            im.addEventListener('load', function () {
                clearTimeout(to);
                resolve(im);
            });
        });
    }
};
export default { loaded: loaded };
//# sourceMappingURL=image.js.map