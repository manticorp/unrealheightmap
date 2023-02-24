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

export default {loaded}