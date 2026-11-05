import $ from "jquery";
import * as L from "leaflet";
import { debounce } from "throttle-debounce";

/**
 * Place-name search box with suggestions, backed by Photon
 * (https://photon.komoot.io), a free OpenStreetMap geocoder that allows
 * search-as-you-type. Typing coordinates jumps straight there instead.
 */

export type Place = {
  label: string;
  detail: string;
  center: L.LatLngLiteral;
  bounds?: L.LatLngBounds;
};

type PlaceSearchArgs = {
  onSelect: (place: Place) => void;
  /** Returns coordinates if the text is a lat/lng the app understands. */
  parseCoordinates: (text: string) => L.LatLngLiteral | null;
  onNoResults?: () => void;
  onError?: () => void;
};

type PhotonFeature = {
  geometry: {coordinates: [number, number]};
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_value?: string;
    extent?: [number, number, number, number];
  };
};

const PHOTON_URL = 'https://photon.komoot.io/api/';
const MIN_QUERY_LENGTH = 3;

export const photonFeatureToPlace = (feature: PhotonFeature): Place => {
  const p = feature.properties || {};
  const [lng, lat] = feature.geometry.coordinates;
  const label = p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.city || p.country || 'Unnamed place';
  const detail = [p.city !== label ? p.city : null, p.state, p.country]
    .filter((v, i, arr) => v && v !== label && arr.indexOf(v) === i)
    .join(', ');
  const place: Place = {label, detail, center: {lat, lng}};
  if (p.extent && p.extent.length === 4) {
    // Photon extent is [minLon, maxLat, maxLon, minLat]
    const [minLon, maxLat, maxLon, minLat] = p.extent;
    place.bounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
  }
  return place;
};

export class PlaceSearch {
  el: JQuery<HTMLElement>;
  input: JQuery<HTMLInputElement>;
  list: JQuery<HTMLElement>;
  results: Place[] = [];
  active = -1;
  controller: AbortController | null = null;
  args: PlaceSearchArgs;

  constructor(args: PlaceSearchArgs) {
    this.args = args;
    this.el = $('<div class="control place-search has-icons-left">');
    this.input = $('<input class="input" type="search" name="place-search" id="place-search" autocomplete="off" spellcheck="false">')
      .attr('placeholder', 'Mountain, valley, town or coordinates…')
      .attr('role', 'combobox')
      .attr('aria-autocomplete', 'list')
      .attr('aria-expanded', 'false')
      .attr('aria-controls', 'place-search-results') as JQuery<HTMLInputElement>;
    this.list = $('<ul class="place-search__results" id="place-search-results" role="listbox">').hide();
    const icon = $('<span class="icon is-left" aria-hidden="true">🔍</span>');
    const credit = $('<p class="place-search__credit">Search by <a href="https://photon.komoot.io" target="_blank" rel="noopener">Photon</a>, data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>');
    this.el.append(this.input, icon, this.list, credit);

    const search = debounce(350, () => this.search());
    this.input.on('input', () => {
      if (this.input.val().toString().trim().length >= MIN_QUERY_LENGTH) {
        search();
      } else {
        this.close();
      }
    });
    this.input.on('keydown', (e) => this.onKeyDown(e as unknown as KeyboardEvent));
    this.input.on('focus', () => {
      if (this.results.length) this.open();
    });
    // Delay so a click on a result registers before the list hides
    this.input.on('blur', () => setTimeout(() => this.close(), 150));
    // Leaflet and the app listen for paste on window; keep the box's own paste local
    this.input.on('paste', (e) => e.stopPropagation());
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this.results.length) return;
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      this.setActive((this.active + delta + this.results.length) % this.results.length);
      this.open();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const text = this.input.val().toString().trim();
      const coords = this.args.parseCoordinates(text);
      if (coords) {
        this.choose({label: text, detail: '', center: coords});
      } else if (this.active >= 0 && this.results[this.active]) {
        this.choose(this.results[this.active]);
      } else if (this.results.length) {
        this.choose(this.results[0]);
      } else {
        this.search();
      }
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  async search() {
    const query = this.input.val().toString().trim();
    if (query.length < MIN_QUERY_LENGTH) return;
    const coords = this.args.parseCoordinates(query);
    if (coords) {
      this.results = [{label: 'Go to coordinates', detail: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, center: coords}];
      this.render();
      return;
    }
    this.controller?.abort();
    this.controller = new AbortController();
    this.showMessage('Searching…');
    try {
      const params = new URLSearchParams({q: query, limit: '6'});
      const response = await fetch(`${PHOTON_URL}?${params}`, {signal: this.controller.signal});
      if (!response.ok) throw new Error(`Search failed (${response.status})`);
      const json = await response.json() as {features?: PhotonFeature[]};
      this.results = (json.features || []).map(photonFeatureToPlace);
      if (this.results.length) {
        this.render();
      } else {
        this.showMessage('No places found. Try a different spelling, or paste coordinates.');
        this.args.onNoResults?.();
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.results = [];
      this.showMessage('Search is unavailable right now. You can still paste coordinates.');
      this.args.onError?.();
    }
  }

  render() {
    this.list.empty();
    this.active = -1;
    this.results.forEach((place, i) => {
      const item = $('<li class="place-search__item" role="option">').attr('id', `place-search-option-${i}`);
      item.append($('<span class="place-search__label">').text(place.label));
      if (place.detail) item.append($('<span class="place-search__detail">').text(place.detail));
      // mousedown fires before the input's blur
      item.on('mousedown', (e) => {
        e.preventDefault();
        this.choose(place);
      });
      this.list.append(item);
    });
    this.open();
  }

  showMessage(text: string) {
    this.list.empty().append($('<li class="place-search__message">').text(text));
    this.active = -1;
    this.open();
  }

  setActive(index: number) {
    this.active = index;
    this.list.children().removeClass('is-active').attr('aria-selected', 'false');
    const item = this.list.children().eq(index).addClass('is-active').attr('aria-selected', 'true');
    this.input.attr('aria-activedescendant', item.attr('id') || '');
  }

  choose(place: Place) {
    this.input.val(place.detail ? `${place.label}, ${place.detail}` : place.label);
    this.close();
    this.args.onSelect(place);
  }

  open() {
    this.list.show();
    this.input.attr('aria-expanded', 'true');
  }

  close() {
    this.list.hide();
    this.input.attr('aria-expanded', 'false');
  }
}
