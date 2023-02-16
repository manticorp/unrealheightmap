import PNG from "./png";

require('./sass/main.scss');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Hello Bulma!');
});

const container : HTMLElement = document.getElementById('app');

const srcTerrarium = 'test/terrarium.png';
const srcBw = 'test/bw16bit.png';

const srcsToCombine = [
  'test/13-4092-2724.png',
  'test/13-4093-2724.png',
  'test/13-4094-2724.png',
  'test/13-4095-2724.png',
  'test/13-4096-2724.png',
  'test/13-4097-2724.png',
];

const loaded = (im : HTMLImageElement, timeout = 10000) : Promise<HTMLImageElement> => {
  if (im.complete || im.naturalWidth > 0) {
    return Promise.resolve(im);
  } else {
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => reject('Image not loaded'), timeout);
      im.addEventListener('load', () => {
        clearTimeout(to);
        resolve(im);
      });
    });
  }
}

Promise.all([
  ...srcsToCombine.map(url => {
    const im = new Image();
    im.src = url;
    return loaded(im);
  })
]).then((ims) => {
  ims.map(im => container.appendChild(im));
}).catch(e => {
  console.error('Some images could not be loaded');
});

var xhr = new XMLHttpRequest();
xhr.open("GET", srcsToCombine[0]);
xhr.responseType = "arraybuffer";
xhr.onload = function(e) {
  console.log(PNG.fromBuffer(this.response));
};
xhr.send();


document.addEventListener('DOMContentLoaded', () => {

  // Get all "navbar-burger" elements
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  // Add a click event on each of them
  $navbarBurgers.forEach( (el : HTMLElement) => {
    el.addEventListener('click', () => {

      // Get the target from the "data-target" attribute
      const target = el.dataset.target;
      const $target = document.getElementById(target);

      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      el.classList.toggle('is-active');
      $target.classList.toggle('is-active');

    });
  });

});