import './sass/main.scss';
import PNG from "./png";
import App from "./app";
var srcTerrarium = 'test/terrarium.png';
var srcBw = 'test/bw16bit.png';
var srcsToCombine = [
    'test/13-4092-2724.png',
    'test/13-4093-2724.png',
    'test/13-4094-2724.png',
    'test/13-4095-2724.png',
    'test/13-4096-2724.png',
    'test/13-4097-2724.png',
];
var black = 0;
document.addEventListener('DOMContentLoaded', function () {
    // Get all "navbar-burger" elements
    var $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    // Add a click event on each of them
    $navbarBurgers.forEach(function (el) {
        el.addEventListener('click', function () {
            // Get the target from the "data-target" attribute
            var target = el.dataset.target;
            var $target = document.getElementById(target);
            // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
            el.classList.toggle('is-active');
            $target.classList.toggle('is-active');
        });
    });
    var container = document.getElementById('app');
    if (container) {
        var myapp = new App({ container: container });
        App.getImageAt({ x: 2724, y: 4093, z: 13 }).then(function (a) { return PNG.fromBuffer(a); }).then(function (a) { return console.log(a); });
        App.getUpngDecodeFromUrl('test/tiny16bitpng.png').then(function (a) {
            console.log('UPNG decode image 16 bit', a);
        });
        var exampleOfHowToReadAndDownload = false;
        if (exampleOfHowToReadAndDownload) {
            App.getPngFromUrl('test/terrarium.png').then(function (a) {
                a.populateChunks();
                console.log('terrarium', a.getImageData());
                var w = a.getWidth(), h = a.getHeight();
                var grays = a.terrariumToGrayscaleNormalised();
                console.log({ grays: grays });
                App.encodeToPng([PNG.Float32ArrayToPng16Bit(grays)], w, h, 1, 0, 16).then(function (a) {
                    var blob = new Blob([a]);
                    var url = URL.createObjectURL(blob);
                    var img = new Image();
                    img.src = url;
                    // So the Blob can be Garbage Collected
                    // img.onload = e => URL.revokeObjectURL( url );
                    document.body.appendChild(img);
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
            });
        }
        //@ts-ignore
        window.app = myapp;
    }
    // Promise.all([
    //   ...srcsToCombine.map(url => {
    //     const im = new Image();
    //     im.src = url;
    //     return imageHelper.loaded(im);
    //   })
    // ]).then((ims) => {
    //   ims.map(im => container.appendChild(im));
    // }).catch(e => {
    //   console.error('Some images could not be loaded');
    // });
});
//# sourceMappingURL=main.js.map