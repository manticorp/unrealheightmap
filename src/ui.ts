/**
 * Small builders for the sidebar UI: tabs, collapsible sections and fields.
 */
import $ from "jquery";
import tippy from 'tippy.js';

export const tippyDefaults = {interactive: true, allowHTML: true, theme: 'light'};

export type TabDef = {id: string, label: string, icon: string};

/** Read/write a remembered UI preference, ignoring blocked storage. */
export const pref = {
  get(key: string): string | null {
    try { return localStorage.getItem(`ui:${key}`); } catch (e) { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(`ui:${key}`, value); } catch (e) { /* storage blocked */ }
  },
};

export class Tabs {
  nav: JQuery<HTMLElement>;
  panels: JQuery<HTMLElement>;
  current = '';
  onChange?: (id: string) => void;
  private panelEls: {[id: string]: JQuery<HTMLElement>} = {};
  private buttons: {[id: string]: JQuery<HTMLElement>} = {};

  constructor(tabs: TabDef[]) {
    this.nav = $('<nav class="sidebar-tabs" role="tablist" aria-label="Settings">');
    this.panels = $('<div class="sidebar-panels">');
    for (const tab of tabs) {
      const button = $(`<button type="button" role="tab" class="sidebar-tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}">`)
        .append($('<span class="sidebar-tab__icon" aria-hidden="true">').text(tab.icon))
        .append($('<span class="sidebar-tab__label">').text(tab.label))
        .append($('<span class="sidebar-tab__badge" hidden>'));
      button.on('click', () => this.show(tab.id));
      this.nav.append(button);
      this.buttons[tab.id] = button;
      const panel = $(`<div class="sidebar-panel" role="tabpanel" id="panel-${tab.id}" aria-labelledby="tab-${tab.id}">`);
      this.panels.append(panel);
      this.panelEls[tab.id] = panel;
    }
    this.nav.on('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const ids = tabs.map(t => t.id);
      const next = ids[(ids.indexOf(this.current) + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      this.show(next);
      this.buttons[next].trigger('focus');
    });
    const saved = pref.get('tab');
    this.show(saved && this.panelEls[saved] && saved !== 'results' ? saved : tabs[0].id);
  }

  panel(id: string) {
    return this.panelEls[id];
  }

  show(id: string) {
    if (!this.panelEls[id]) return;
    this.current = id;
    for (const [key, panel] of Object.entries(this.panelEls)) {
      const active = key === id;
      panel.toggleClass('is-active', active);
      this.buttons[key].toggleClass('is-active', active).attr('aria-selected', active ? 'true' : 'false').attr('tabindex', active ? '0' : '-1');
    }
    this.panels.scrollTop(0);
    pref.set('tab', id);
    this.onChange?.(id);
  }

  badge(id: string, text: string | null) {
    const badge = this.buttons[id]?.find('.sidebar-tab__badge');
    if (!badge) return;
    if (text) badge.text(text).removeAttr('hidden');
    else badge.attr('hidden', 'hidden');
  }
}

/**
 * A collapsible section in a tab panel. Returns its body. Open/closed state
 * is remembered per section.
 */
export const section = (panel: JQuery<HTMLElement>, id: string, title: string, options: {open?: boolean, summary?: string} = {}) => {
  const saved = pref.get(`section:${id}`);
  const open = saved === null ? options.open !== false : saved === '1';
  const details = $(`<details class="ui-section" data-section="${id}">`).prop('open', open);
  const summary = $('<summary class="ui-section__title">').append($('<span>').text(title));
  const status = $('<span class="ui-section__status">');
  summary.append(status);
  details.append(summary);
  const body = $('<div class="ui-section__body">');
  if (options.summary) body.append($('<p class="ui-section__intro">').html(options.summary));
  details.append(body);
  details.on('toggle', () => pref.set(`section:${id}`, (details[0] as HTMLDetailsElement).open ? '1' : '0'));
  panel.append(details);
  body.data('status', status);
  return body;
};

/** Set the little status text shown on a section's title bar (e.g. "On"). */
export const sectionStatus = (body: JQuery<HTMLElement>, text: string, on = false) => {
  const status = body.data('status') as JQuery<HTMLElement> | undefined;
  status?.text(text).toggleClass('is-on', on);
};

export const info = (content: string) => {
  const icon = $('<button type="button" class="info-icon" aria-label="More information">i</button>');
  tippy(icon[0], {...tippyDefaults, content});
  return icon;
};

/** Label + control (+ optional help text and tooltip) as one field. */
export const field = (label: string, control: JQuery<HTMLElement>, options: {help?: string, tip?: string, full?: boolean, id?: string} = {}) => {
  const wrap = $('<div class="field ui-field">').toggleClass('is-full', !!options.full);
  const lab = $('<label class="label">').text(label);
  if (options.id) lab.attr('for', options.id);
  if (options.tip) lab.append(' ', info(options.tip));
  wrap.append(lab);
  wrap.append(control.is('.control') ? control : $('<div class="control">').append(control));
  if (options.help) wrap.append($('<p class="help">').html(options.help));
  return wrap;
};

export const selectInput = (name: string, options: [string, string][], value?: string): JQuery<HTMLSelectElement> => {
  const select = $(`<select name="${name}" id="in-${name}">`) as JQuery<HTMLSelectElement>;
  for (const [v, label] of options) select.append($('<option>').attr('value', v).text(label));
  if (value !== undefined) select.val(value);
  return select;
};

export const selectControl = (select: JQuery<HTMLElement>) =>
  $('<div class="control">').append($('<div class="select is-fullwidth is-small">').append(select));

export const numberInput = (name: string, attrs: {[k: string]: string} = {}): JQuery<HTMLInputElement> =>
  $('<input class="input is-small" type="number">').attr({name, id: `in-${name}`, ...attrs}) as JQuery<HTMLInputElement>;

export const textInput = (name: string, attrs: {[k: string]: string} = {}): JQuery<HTMLInputElement> =>
  $('<input class="input is-small" type="text">').attr({name, id: `in-${name}`, ...attrs}) as JQuery<HTMLInputElement>;

export const checkbox = (label: string, name: string, tip?: string) => {
  const el = $(`<label class="checkbox ui-check"><input type="checkbox" name="${name}" id="in-${name}"> </label>`) as JQuery<HTMLLabelElement>;
  el.append(document.createTextNode(label));
  if (tip) el.append(' ', info(tip));
  return {label: el, input: el.find('input') as JQuery<HTMLInputElement>};
};

/** A grid of fields that wraps to the sidebar width. */
export const grid = (...children: JQuery<HTMLElement>[]) => $('<div class="ui-grid">').append(...children);

export const button = (text: string, cls = 'is-small') => $(`<button type="button" class="button ${cls}">`).text(text);

export const note = (html = '') => $('<p class="ui-note">').html(html);
