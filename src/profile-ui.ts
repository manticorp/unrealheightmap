import $ from "jquery";
import * as L from "leaflet";
import {debounce} from "throttle-debounce";
import {ElevationSource} from "./elevation";
import {
  LatLngPoint,
  ProfileSample,
  ProfileStats,
  niceStep,
  profileCsv,
  profileStats,
  profileZoom,
  samplePath,
  sampleTile,
  tilesForSamples,
} from "./profile";

type ProfileToolArgs = {
  map: L.Map;
  /** Element the results panel is inserted after. */
  after: HTMLElement;
  getSource: () => ElevationSource;
  download: (blob: Blob, filename: string) => void;
  track: (event: string) => void;
};

const SAMPLES = 400;

const fmtDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 1 : 2)} km` : `${Math.round(m)} m`;
const fmtHeight = (m: number) => `${Math.round(m).toLocaleString()} m`;

/**
 * Draw a line on the map and see the ground height along it.
 * While drawing, map clicks add points instead of moving the export area.
 */
export class ProfileTool {
  map: L.Map;
  source: () => ElevationSource;
  download: (blob: Blob, filename: string) => void;
  track: (event: string) => void;
  active = false;
  points: LatLngPoint[] = [];
  line: L.Polyline;
  vertices: L.LayerGroup;
  hoverMarker: L.CircleMarker;
  button: HTMLAnchorElement;
  panel: JQuery<HTMLElement>;
  chart: JQuery<HTMLElement>;
  stats: JQuery<HTMLElement>;
  status: JQuery<HTMLElement>;
  finishButton: JQuery<HTMLElement>;
  samples: ProfileSample[] = [];
  heights: Float32Array = new Float32Array(0);
  requestId = 0;
  hadDoubleClickZoom = true;

  constructor({map, after, getSource, download, track}: ProfileToolArgs) {
    this.map = map;
    this.source = getSource;
    this.download = download;
    this.track = track;
    this.line = L.polyline([], {color: '#ffdd57', weight: 3, dashArray: '6 6', interactive: false});
    this.vertices = L.layerGroup();
    this.hoverMarker = L.circleMarker([0, 0], {radius: 6, color: '#fff', weight: 2, fillColor: '#ffdd57', fillOpacity: 1, interactive: false});

    const Control = L.Control.extend({
      onAdd: () => {
        const wrap = L.DomUtil.create('div', 'leaflet-bar profile-control');
        const a = L.DomUtil.create('a', '', wrap) as HTMLAnchorElement;
        a.href = '#';
        a.title = 'Elevation profile: draw a line to see the heights along it';
        a.setAttribute('role', 'button');
        a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 20 L8 9 L12 14 L16 6 L22 20 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.on(a, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          this.active ? this.finish() : this.start();
        });
        this.button = a;
        return wrap;
      },
    });
    new Control({position: 'topleft'}).addTo(map);

    this.panel = $('<section class="profile-panel">').hide();
    const header = $('<div class="profile-panel__header">');
    this.status = $('<span class="profile-panel__status">');
    this.finishButton = $('<button class="button is-small is-primary" type="button">Finish</button>');
    const csv = $('<button class="button is-small" type="button">Download CSV</button>');
    const clear = $('<button class="button is-small" type="button">Clear</button>');
    header.append($('<strong>Elevation profile</strong>'), this.status, $('<span class="profile-panel__spacer">'), this.finishButton, csv, clear);
    this.stats = $('<div class="profile-panel__stats">');
    this.chart = $('<div class="profile-panel__chart">');
    this.panel.append(header, this.stats, this.chart);
    $(after).after(this.panel);

    this.finishButton.on('click', () => this.finish());
    clear.on('click', () => { this.track('profile/clear'); this.clear(); });
    csv.on('click', () => {
      if (!this.samples.length) return;
      this.track('profile/csv');
      this.download(new Blob([profileCsv(this.samples, this.heights)], {type: 'text/csv'}), 'elevation_profile.csv');
    });

    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      if (this.active) {
        L.DomEvent.stop(e as any);
        this.finish();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.key === 'Escape' || e.key === 'Enter') this.finish();
      if (e.key === 'Backspace' && this.points.length && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        this.points.pop();
        this.redrawLine();
        this.updateDebounced();
      }
    });
    window.addEventListener('resize', debounce(100, () => this.renderChart()));
  }

  start() {
    this.track('profile/start');
    if (!this.active && this.points.length >= 2) {
      this.clear();
    }
    this.active = true;
    this.button?.classList.add('is-active');
    this.map.getContainer().classList.add('is-drawing-profile');
    this.hadDoubleClickZoom = this.map.doubleClickZoom.enabled();
    this.map.doubleClickZoom.disable();
    this.line.addTo(this.map);
    this.vertices.addTo(this.map);
    this.panel.show();
    this.finishButton.show();
    this.updateStatus();
  }

  finish() {
    this.active = false;
    this.button?.classList.remove('is-active');
    this.map.getContainer().classList.remove('is-drawing-profile');
    if (this.hadDoubleClickZoom) this.map.doubleClickZoom.enable();
    this.finishButton.hide();
    if (this.points.length < 2) {
      this.clear();
      return;
    }
    this.updateStatus();
  }

  clear() {
    this.points = [];
    this.samples = [];
    this.heights = new Float32Array(0);
    this.requestId++;
    this.redrawLine();
    this.hoverMarker.remove();
    this.chart.empty();
    this.stats.empty();
    if (!this.active) {
      this.line.remove();
      this.vertices.remove();
      this.panel.hide();
    }
    this.updateStatus();
  }

  /** Returns true when the click was used for the profile (so the map shouldn't move). */
  handleMapClick(latlng: L.LatLng): boolean {
    if (!this.active) return false;
    this.points.push({lat: latlng.lat, lng: latlng.lng});
    this.redrawLine();
    this.updateDebounced();
    return true;
  }

  redrawLine() {
    this.line.setLatLngs(this.points.map(p => [p.lat, p.lng] as L.LatLngTuple));
    this.vertices.clearLayers();
    for (const p of this.points) {
      L.circleMarker([p.lat, p.lng], {radius: 4, color: '#ffdd57', weight: 2, fillColor: '#222', fillOpacity: 1, interactive: false}).addTo(this.vertices);
    }
    this.updateStatus();
  }

  updateStatus() {
    if (this.active) {
      this.status.text(this.points.length < 2
        ? 'Click the map to add points. Double-click, Enter or Finish to stop.'
        : 'Keep clicking to add points. Backspace removes the last one.');
    } else {
      this.status.text(this.samples.length ? `Data: ${this.source().label}` : '');
    }
  }

  updateDebounced = debounce(250, () => this.update());

  async update() {
    if (this.points.length < 2) {
      this.chart.empty();
      this.stats.empty();
      return;
    }
    const id = ++this.requestId;
    const source = this.source();
    const radius = source.radius ?? 6371e3;
    const samples = samplePath(this.points, SAMPLES, radius);
    const length = samples[samples.length - 1].distance;
    const zoom = profileZoom(length, SAMPLES, this.points[0].lat, source.maxZoom, source.radius ?? 6378137);
    const tiles = tilesForSamples(samples, zoom);
    this.stats.text(`Loading heights (${tiles.length} tiles)…`);
    const heights = new Float32Array(samples.length);
    try {
      await Promise.all(tiles.map(async tile => {
        const grid = await source.getTile(tile.z, tile.x, tile.y);
        for (const i of tile.indices) {
          heights[i] = sampleTile(grid, tile.x, tile.y, samples[i].lat, samples[i].lng, tile.z);
        }
      }));
    } catch (e) {
      console.error('Profile failed', e);
      if (id === this.requestId) this.stats.text('Could not load heights for this line. Please try again.');
      return;
    }
    if (id !== this.requestId) return;
    this.samples = samples;
    this.heights = heights;
    this.renderStats(profileStats(samples, heights));
    this.renderChart();
    this.updateStatus();
  }

  renderStats(s: ProfileStats) {
    const item = (label: string, value: string) => `<span><span class="profile-panel__label">${label}</span> ${value}</span>`;
    this.stats.html([
      item('Length', fmtDistance(s.length)),
      item('Lowest', fmtHeight(s.min)),
      item('Highest', fmtHeight(s.max)),
      item('Climb', `↑ ${fmtHeight(s.gain)}`),
      item('Descent', `↓ ${fmtHeight(s.loss)}`),
      item('Steepest', `${s.maxGradePercent.toFixed(0)}%`),
    ].join(''));
  }

  renderChart() {
    const samples = this.samples;
    const heights = this.heights;
    if (samples.length < 2 || !this.panel.is(':visible')) return;
    const width = Math.max(280, this.chart.width() || 600);
    const height = 220;
    const pad = {left: 56, right: 12, top: 12, bottom: 28};
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const length = samples[samples.length - 1].distance || 1;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < heights.length; i++) { min = Math.min(min, heights[i]); max = Math.max(max, heights[i]); }
    const yStep = niceStep(Math.max(1, max - min), 4);
    const yMin = Math.floor(min / yStep) * yStep;
    const yMax = Math.max(yMin + yStep, Math.ceil(max / yStep) * yStep);
    const xUnit = length >= 2000 ? 1000 : 1;
    const xStep = niceStep(length / xUnit, 6) * xUnit;
    const sx = (d: number) => pad.left + d / length * plotW;
    const sy = (h: number) => pad.top + (1 - (h - yMin) / (yMax - yMin)) * plotH;

    const parts: string[] = [];
    for (let v = yMin; v <= yMax + 1e-6; v += yStep) {
      const y = sy(v).toFixed(1);
      parts.push(`<line class="profile-chart__grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"/>`);
      parts.push(`<text class="profile-chart__tick" x="${pad.left - 6}" y="${y}" text-anchor="end" dominant-baseline="middle">${Math.round(v).toLocaleString()}</text>`);
    }
    for (let d = 0; d <= length + 1e-6; d += xStep) {
      const x = sx(d).toFixed(1);
      const label = xUnit === 1000 ? `${+(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;
      parts.push(`<text class="profile-chart__tick" x="${x}" y="${height - 8}" text-anchor="middle">${label}</text>`);
    }
    let path = '';
    samples.forEach((s, i) => { path += `${i ? 'L' : 'M'}${sx(s.distance).toFixed(1)},${sy(heights[i]).toFixed(1)}`; });
    const base = sy(yMin).toFixed(1);
    parts.push(`<path class="profile-chart__area" d="${path}L${sx(length).toFixed(1)},${base}L${pad.left},${base}Z"/>`);
    parts.push(`<path class="profile-chart__line" d="${path}"/>`);
    parts.push(`<line class="profile-chart__axis" x1="${pad.left}" x2="${width - pad.right}" y1="${base}" y2="${base}"/>`);
    parts.push(`<g class="profile-chart__hover" style="display:none"><line y1="${pad.top}" y2="${height - pad.bottom}"/><circle r="4"/></g>`);
    parts.push(`<rect class="profile-chart__hit" x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}"/>`);
    const svg = `<svg class="profile-chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Elevation profile chart">${parts.join('')}</svg>`;
    const tooltip = $('<div class="profile-chart__tooltip">').hide();
    this.chart.empty().append(svg, tooltip);

    const svgEl = this.chart.find('svg')[0] as unknown as SVGSVGElement;
    const hover = $(svgEl).find('.profile-chart__hover');
    const hoverLine = hover.find('line');
    const hoverDot = hover.find('circle');
    const hide = () => { hover.hide(); tooltip.hide(); this.hoverMarker.remove(); };
    $(svgEl).find('.profile-chart__hit')
      .on('mousemove touchmove', (e) => {
        const ev = (e.originalEvent as any).touches?.[0] ?? e.originalEvent as MouseEvent;
        const rect = svgEl.getBoundingClientRect();
        const x = (ev.clientX - rect.left) * width / rect.width;
        const d = Math.max(0, Math.min(length, (x - pad.left) / plotW * length));
        const i = Math.max(0, Math.min(samples.length - 1, Math.round(d / length * (samples.length - 1))));
        const px = sx(samples[i].distance), py = sy(heights[i]);
        hover.show();
        hoverLine.attr({x1: px, x2: px});
        hoverDot.attr({cx: px, cy: py});
        tooltip.show().html(`<strong>${fmtHeight(heights[i])}</strong><br>${fmtDistance(samples[i].distance)}`)
          .css({left: `${px / width * 100}%`, top: `${py / height * 100}%`});
        this.hoverMarker.setLatLng([samples[i].lat, samples[i].lng]).addTo(this.map);
      })
      .on('mouseleave touchend', hide);
  }
}
