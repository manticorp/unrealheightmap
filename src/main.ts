import './sass/main.scss';

import header from "./templates/header.html";
import footer from "./templates/footer.html";

import * as $ from "jquery";
import App from "./app";

$('body').prepend(header);
$('body').append(footer);

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

  const container : HTMLElement = document.getElementById('app');
  if (container) {
    const app = new App({container});
    //@ts-ignore
    window.app = app;

    // const url = 'public/test/tiny16bitpng.png';
    // App.getPngFromUrl(url).then(png => {
    //   return app.typedArrayToStl(
    //     png.getImageDataTransformed(),
    //     png.getWidth(),
    //     png.getHeight()
    //   );
    // }).then((stlData) => {
    //   return app.download(new Blob([stlData]), 'stl.stl');
    // });
  }
});