/**
 * Terrain analysis: yearly sunlight with terrain shadows, and viewsheds
 * (what can be seen from a point). Pure, runs in the worker.
 */

import {sunDirectionZUp, sunPosition} from './sun';
import {sampleBilinear} from './area';

/* ------------------------------- sunlight -------------------------------- */

export type InsolationOptions = {
  latitude: number;
  longitude: number;
  year: number;
  /** Hours between sun positions sampled through each day. */
  stepHours: number;
};

export type InsolationResult = {
  /** kWh per m² per year for each pixel of the analysis grid. */
  data: Float32Array;
  width: number;
  height: number;
  min: number;
  max: number;
  mean: number;
  /** What a flat, unshaded square metre here would get, for comparison. */
  flatReference: number;
};

/** Clear-sky direct beam on a surface facing the sun, W/m² (Kasten–Young air mass). */
export const clearSkyBeam = (altitudeDeg: number) => {
  if (altitudeDeg <= 0) return 0;
  const am = 1 / (Math.sin(altitudeDeg * Math.PI / 180) + 0.50572 * Math.pow(altitudeDeg + 6.07995, -1.6364));
  return 1361 * Math.pow(0.7, Math.pow(am, 0.678));
};

/**
 * Is a point shadowed by terrain towards the sun? Marches outwards along the
 * sun's azimuth with growing steps until the ray clears the highest point.
 */
const shadowed = (
  heights: Float32Array, width: number, height: number, x: number, y: number, h0: number,
  stepX: number, stepY: number, metresPerUnit: number, tanAlt: number, maxH: number,
) => {
  let r = 1;
  for (;;) {
    const sx = x + stepX * r, sy = y + stepY * r;
    if (sx < 0 || sy < 0 || sx > width - 1 || sy > height - 1) return false;
    const rayH = h0 + r * metresPerUnit * tanAlt;
    if (rayH > maxH) return false;
    if (sampleBilinear(heights, width, height, sx, sy) > rayH + 0.5) return true;
    r = Math.max(r + 1, r * 1.12);
  }
};

/**
 * Yearly solar energy per pixel: one day per month, sampled every `stepHours`,
 * with terrain shadows, the slope and facing of each pixel, clear skies and
 * a simple sky-diffuse term. Values are kWh/m²/year (clear-sky, so higher than
 * a real, cloudy year: use them as relative brightness).
 */
export const annualInsolation = (
  heights: Float32Array, width: number, height: number, mpp: {x: number, y: number},
  options: InsolationOptions, progress?: (done: number, total: number) => void,
): InsolationResult => {
  const n = width * height;
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n);
  let maxH = -Infinity;
  for (let y = 0; y < height; y++) {
    const ya = Math.max(0, y - 1), yb = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const xa = Math.max(0, x - 1), xb = Math.min(width - 1, x + 1);
      const i = y * width + x;
      const dEast = (heights[y * width + xb] - heights[y * width + xa]) / ((xb - xa || 1) * mpp.x);
      const dNorth = -(heights[yb * width + x] - heights[ya * width + x]) / ((yb - ya || 1) * mpp.y);
      const len = Math.hypot(dEast, dNorth, 1);
      nx[i] = -dEast / len; ny[i] = -dNorth / len; nz[i] = 1 / len;
      if (heights[i] > maxH) maxH = heights[i];
    }
  }
  const energy = new Float64Array(n);
  let flat = 0;
  const step = Math.max(0.25, options.stepHours);
  const samples: {az: number, alt: number, weightH: number}[] = [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(Date.UTC(options.year, month + 1, 0)).getUTCDate();
    for (let hour = 0; hour < 24; hour += step) {
      const date = new Date(Date.UTC(options.year, month, 15, 0, 0, 0) + (hour + step / 2) * 3600000);
      const pos = sunPosition(date, options.latitude, options.longitude);
      if (pos.altitude > 0.5) samples.push({az: pos.azimuth, alt: pos.altitude, weightH: step * daysInMonth});
    }
  }
  samples.forEach((s, k) => {
    const [sx, sy, sz] = sunDirectionZUp(s.az, s.alt);
    const beam = clearSkyBeam(s.alt);
    const diffuse = 0.12 * beam;
    // Step one pixel along the azimuth: east is +x, north is -y
    const horiz = Math.hypot(sx / mpp.x, sy / mpp.y) || 1;
    const stepX = (sx / mpp.x) / horiz, stepY = (-sy / mpp.y) / horiz;
    const metresPerUnit = Math.hypot(stepX * mpp.x, stepY * mpp.y);
    const tanAlt = Math.tan(s.alt * Math.PI / 180);
    flat += (beam * sz + diffuse) * s.weightH;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let e = diffuse * (1 + nz[i]) / 2;
        const cos = nx[i] * sx + ny[i] * sy + nz[i] * sz;
        if (cos > 0 && !shadowed(heights, width, height, x, y, heights[i], stepX, stepY, metresPerUnit, tanAlt, maxH)) {
          e += beam * cos;
        }
        energy[i] += e * s.weightH;
      }
    }
    progress?.(k + 1, samples.length);
  });
  const data = new Float32Array(n);
  let min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < n; i++) {
    const v = energy[i] / 1000;
    data[i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return {data, width, height, min, max, mean: sum / n, flatReference: flat / 1000};
};

/* -------------------------------- viewshed -------------------------------- */

export type ViewshedOptions = {
  /** Observer position in grid pixels. */
  x: number;
  y: number;
  /** Eye height above the ground, metres. */
  observerHeight: number;
  /** Height of what is being looked for (0 = the ground itself), metres. */
  targetHeight: number;
  /** Planet radius for the curvature drop (with standard refraction). */
  radius: number;
};

export type ViewshedResult = {
  /** 255 where visible, 0 where hidden. */
  visible: Uint8Array;
  fraction: number;
  observerGround: number;
};

/**
 * Line-of-sight from one point to every pixel, by casting a ray to each
 * border pixel and tracking the steepest terrain angle along it (an "R2"
 * viewshed). Allows for the curvature of the planet.
 */
export const viewshed = (
  heights: Float32Array, width: number, height: number, mpp: {x: number, y: number}, options: ViewshedOptions,
): ViewshedResult => {
  const visible = new Uint8Array(width * height);
  const ox = Math.min(width - 1, Math.max(0, options.x));
  const oy = Math.min(height - 1, Math.max(0, options.y));
  const oi = Math.floor(oy) * width + Math.floor(ox);
  // Stand on the observer's own cell: on a summit, an interpolated height can sit
  // below the neighbouring cell and wrongly hide everything behind it
  let ground = heights[oi];
  const cx = Math.floor(ox), cy = Math.floor(oy);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < width && y < height) ground = Math.max(ground, heights[y * width + x]);
    }
  }
  const eye = ground + options.observerHeight;
  const k = (1 - 0.13) / (2 * options.radius);
  visible[oi] = 255;
  const cast = (tx: number, ty: number) => {
    const dx = tx + 0.5 - ox, dy = ty + 0.5 - oy;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
    if (steps < 1) return;
    const stepLen = Math.hypot(dx * mpp.x, dy * mpp.y) / steps;
    let maxTan = -Infinity;
    for (let s = 1; s <= steps; s++) {
      const px = Math.floor(ox + dx * s / steps), py = Math.floor(oy + dy * s / steps);
      if (px < 0 || py < 0 || px >= width || py >= height) break;
      const i = py * width + px;
      const d = stepLen * s;
      const drop = d * d * k;
      const h = heights[i] - drop;
      const tanGround = (h - eye) / d;
      const tanTarget = (h + options.targetHeight - eye) / d;
      if (tanTarget >= maxTan) visible[i] = 255;
      if (tanGround > maxTan) maxTan = tanGround;
    }
  };
  for (let x = 0; x < width; x++) {
    cast(x, 0);
    cast(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    cast(0, y);
    cast(width - 1, y);
  }
  let count = 0;
  for (let i = 0; i < visible.length; i++) if (visible[i]) count++;
  return {visible, fraction: count / visible.length, observerGround: ground};
};

/** Bilinear upsample of a float grid to a new size. */
export const resizeGrid = (src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array => {
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const fy = (y + 0.5) * sh / dh - 0.5;
    for (let x = 0; x < dw; x++) {
      out[y * dw + x] = sampleBilinear(src, sw, sh, (x + 0.5) * sw / dw - 0.5, fy);
    }
  }
  return out;
};
