/**
 * Editors for the material painter rules and scatter sets.
 */
import $ from "jquery";
import {Facing, PAINT_PRESETS, PaintRule, PaintSettings, blankRule, defaultPaint} from "./painter";
import {SCATTER_PRESETS, ScatterSet, blankScatter} from "./scatter";
import {OSM_LAYERS} from "./osm-layers";
import {button, checkbox, field, grid, numberInput, selectControl, selectInput, textInput} from "./ui";

const numOrNull = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const osmOptions = (anywhere: string): [string, string][] => [['', anywhere], ...OSM_LAYERS.map(l => [l.id, `OSM: ${l.label}`] as [string, string])];

export class PainterEditor {
  el: JQuery<HTMLElement>;
  enabled: JQuery<HTMLInputElement>;
  settings: PaintSettings = defaultPaint();
  onChange: (s: PaintSettings) => void;
  private list: JQuery<HTMLElement>;
  private baseName: JQuery<HTMLInputElement>;
  private baseColor: JQuery<HTMLInputElement>;
  private heightBlend: JQuery<HTMLInputElement>;
  private slopeBlend: JQuery<HTMLInputElement>;
  private body: JQuery<HTMLElement>;
  previewButton: JQuery<HTMLElement>;
  coverage: JQuery<HTMLElement>;

  constructor(onChange: (s: PaintSettings) => void) {
    this.onChange = onChange;
    this.el = $('<div class="painter">');
    const toggle = checkbox('Paint material layers from rules', 'paint-on',
      'Builds landscape layer weightmaps from rules on height, slope, facing and OpenStreetMap layers. Rules apply top to bottom: each takes its share of what the rules above left, and the base layer gets the rest, so the weightmaps always add up to 100%.');
    this.enabled = toggle.input;
    this.el.append(toggle.label);
    this.body = $('<div class="painter__body">');
    this.el.append(this.body);

    const preset = selectInput('paint-preset', [['', 'Start from a preset…'], ...PAINT_PRESETS.map(p => [p.id, p.label] as [string, string])]);
    preset.on('change', () => {
      const p = PAINT_PRESETS.find(x => x.id === preset.val());
      if (p) {
        this.settings = {enabled: true, ...JSON.parse(JSON.stringify(p.settings))};
        this.render();
        this.emit();
      }
      preset.val('');
    });
    this.baseName = textInput('paint-base-name');
    this.baseColor = $('<input type="color" class="painter__color" aria-label="Base layer colour">') as JQuery<HTMLInputElement>;
    this.heightBlend = numberInput('paint-hblend', {min: '0', step: '10'});
    this.slopeBlend = numberInput('paint-sblend', {min: '0', step: '1'});
    this.list = $('<div class="painter__rules">');
    const add = button('+ Add layer');
    add.on('click', () => {
      this.settings.rules.push(blankRule(`Layer ${this.settings.rules.length + 1}`));
      this.render();
      this.emit();
    });
    this.previewButton = button('Preview on map', 'is-small is-info is-light');
    this.coverage = $('<div class="painter__coverage">');
    this.body.append(
      selectControl(preset),
      this.list,
      $('<div class="buttons are-small painter__actions">').append(add, this.previewButton),
      $('<div class="painter__base">').append(
        $('<span class="painter__base-label">').text('Base layer (everything else)'),
        $('<div class="painter__row">').append(this.baseColor, this.baseName),
      ),
      grid(
        field('Height blend (m)', this.heightBlend, {tip: 'How softly height limits fade: a rule with "above 2,000 m" is half on at 2,000 m and fully on this far above it.'}),
        field('Slope blend (°)', this.slopeBlend, {tip: 'How softly slope limits fade, in degrees.'}),
      ),
      this.coverage,
    );
    const change = () => {
      this.settings.baseName = (this.baseName.val() ?? '').toString() || 'Base';
      this.settings.baseColor = (this.baseColor.val() ?? '#888888').toString();
      this.settings.heightBlend = numOrNull((this.heightBlend.val() ?? '').toString()) ?? 50;
      this.settings.slopeBlend = numOrNull((this.slopeBlend.val() ?? '').toString()) ?? 5;
      this.emit();
    };
    this.baseName.on('change', change);
    this.baseColor.on('input change', change);
    this.heightBlend.on('change', change);
    this.slopeBlend.on('change', change);
    this.enabled.on('change', () => {
      this.settings.enabled = this.enabled.is(':checked');
      this.body.toggle(this.settings.enabled);
      this.emit();
    });
    this.render();
  }

  set(settings: PaintSettings) {
    this.settings = settings.rules ? settings : defaultPaint();
    this.render();
  }

  emit() {
    this.onChange(this.settings);
  }

  render() {
    const s = this.settings;
    this.enabled.prop('checked', s.enabled);
    this.body.toggle(s.enabled);
    this.baseName.val(s.baseName);
    this.baseColor.val(s.baseColor);
    this.heightBlend.val(s.heightBlend);
    this.slopeBlend.val(s.slopeBlend);
    this.list.empty();
    s.rules.forEach((rule, i) => this.list.append(this.ruleCard(rule, i)));
  }

  private ruleCard(rule: PaintRule, index: number) {
    const card = $('<div class="painter__rule">');
    const color = $('<input type="color" class="painter__color">').val(rule.color).attr('aria-label', `${rule.name} colour`);
    const name = textInput(`paint-name-${index}`).val(rule.name);
    const up = $('<button type="button" class="painter__icon" aria-label="Move up" title="Higher priority">▲</button>').prop('disabled', index === 0);
    const down = $('<button type="button" class="painter__icon" aria-label="Move down" title="Lower priority">▼</button>').prop('disabled', index === this.settings.rules.length - 1);
    const remove = $('<button type="button" class="painter__icon" aria-label="Remove layer" title="Remove">✕</button>');
    const minH = numberInput(`paint-minh-${index}`, {placeholder: 'any', step: '50'}).val(rule.minHeight ?? '');
    const maxH = numberInput(`paint-maxh-${index}`, {placeholder: 'any', step: '50'}).val(rule.maxHeight ?? '');
    const minS = numberInput(`paint-mins-${index}`, {placeholder: '0', min: '0', max: '90'}).val(rule.minSlope ?? '');
    const maxS = numberInput(`paint-maxs-${index}`, {placeholder: '90', min: '0', max: '90'}).val(rule.maxSlope ?? '');
    const facing = selectInput(`paint-facing-${index}`, [['any', 'Any direction'], ['north', 'North-facing'], ['south', 'South-facing'], ['east', 'East-facing'], ['west', 'West-facing']], rule.facing);
    const osm = selectInput(`paint-osm-${index}`, osmOptions('Anywhere'), rule.osm);
    const strength = numberInput(`paint-str-${index}`, {min: '0', max: '100', step: '5'}).val(Math.round(rule.strength * 100));
    const noise = numberInput(`paint-noise-${index}`, {min: '0', max: '100', step: '5'}).val(Math.round(rule.noise * 100));
    card.append(
      $('<div class="painter__row painter__row--head">').append($('<span class="painter__num">').text(`${index + 1}`), color, name, up, down, remove),
      grid(
        field('Height from (m)', minH), field('to (m)', maxH),
        field('Slope from (°)', minS), field('to (°)', maxS),
        field('Facing', selectControl(facing)), field('Where', selectControl(osm)),
        field('Strength %', strength, {tip: 'How much of the remaining ground this layer may take where its rules match.'}),
        field('Noise %', noise, {tip: 'Breaks up the edges into natural-looking patches.'}),
      ),
    );
    const update = () => {
      rule.color = (color.val() ?? '#888888').toString();
      rule.name = (name.val() ?? '').toString() || `Layer ${index + 1}`;
      rule.minHeight = numOrNull((minH.val() ?? '').toString());
      rule.maxHeight = numOrNull((maxH.val() ?? '').toString());
      rule.minSlope = numOrNull((minS.val() ?? '').toString());
      rule.maxSlope = numOrNull((maxS.val() ?? '').toString());
      rule.facing = (facing.val() ?? 'any').toString() as Facing;
      rule.osm = (osm.val() ?? '').toString();
      rule.strength = Math.min(1, Math.max(0, (numOrNull((strength.val() ?? '').toString()) ?? 100) / 100));
      rule.noise = Math.min(1, Math.max(0, (numOrNull((noise.val() ?? '').toString()) ?? 0) / 100));
      this.emit();
    };
    card.find('input, select').on('change', update);
    color.on('input', update);
    const move = (delta: number) => {
      const rules = this.settings.rules;
      const j = index + delta;
      if (j < 0 || j >= rules.length) return;
      [rules[index], rules[j]] = [rules[j], rules[index]];
      this.render();
      this.emit();
    };
    up.on('click', () => move(-1));
    down.on('click', () => move(1));
    remove.on('click', () => {
      this.settings.rules.splice(index, 1);
      this.render();
      this.emit();
    });
    return card;
  }

  showCoverage(coverage: number[]) {
    const names = [...this.settings.rules.map(r => r.name), this.settings.baseName];
    const colors = [...this.settings.rules.map(r => r.color), this.settings.baseColor];
    this.coverage.empty();
    const bar = $('<div class="painter__bar">');
    const legend = $('<ul class="painter__legend">');
    coverage.forEach((share, i) => {
      if (share < 0.001) return;
      bar.append($('<span>').css({width: `${share * 100}%`, background: colors[i]}).attr('title', `${names[i]}: ${(share * 100).toFixed(1)}%`));
      legend.append($('<li>').append($('<span class="painter__swatch">').css('background', colors[i]), document.createTextNode(` ${names[i]} ${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`)));
    });
    this.coverage.append(bar, legend);
  }
}

export class ScatterEditor {
  el: JQuery<HTMLElement>;
  sets: ScatterSet[] = [];
  onChange: (sets: ScatterSet[]) => void;
  /** Names of painter layers, for the "where" list (rules then base). */
  paintLayers: string[] = [];
  private list: JQuery<HTMLElement>;

  constructor(onChange: (sets: ScatterSet[]) => void) {
    this.onChange = onChange;
    this.el = $('<div class="scatter">');
    this.list = $('<div class="painter__rules">');
    const add = selectInput('scatter-add', [['', '+ Add a set…'], ...SCATTER_PRESETS.map((p, i) => [`${i}`, p.name] as [string, string]), ['blank', 'Empty set']]);
    add.on('change', () => {
      const v = (add.val() ?? '').toString();
      if (v === 'blank') this.sets.push(blankScatter('Points', 'all'));
      else if (v !== '') this.sets.push({...SCATTER_PRESETS[parseInt(v, 10)]});
      add.val('');
      this.render();
      this.emit();
    });
    this.el.append(this.list, selectControl(add));
    this.render();
  }

  set(sets: ScatterSet[]) {
    this.sets = sets;
    this.render();
  }

  setPaintLayers(names: string[]) {
    this.paintLayers = names;
    this.render();
  }

  emit() {
    this.onChange(this.sets);
  }

  render() {
    this.list.empty();
    if (!this.sets.length) {
      this.list.append($('<p class="ui-note">').text('No scatter sets. Add trees, rocks or bushes below.'));
    }
    this.sets.forEach((set, i) => this.list.append(this.card(set, i)));
  }

  private card(set: ScatterSet, index: number) {
    const card = $('<div class="painter__rule">');
    const name = textInput(`scatter-name-${index}`).val(set.name);
    const remove = $('<button type="button" class="painter__icon" aria-label="Remove set" title="Remove">✕</button>');
    const sources: [string, string][] = [['all', 'Everywhere'],
      ...this.paintLayers.map((n, i) => [`paint:${i}`, `Painted: ${n}`] as [string, string]),
      ...OSM_LAYERS.map(l => [`osm:${l.id}`, `OSM: ${l.label}`] as [string, string])];
    if (!sources.some(s => s[0] === set.source)) sources.push([set.source, set.source]);
    const source = selectInput(`scatter-src-${index}`, sources, set.source);
    const density = numberInput(`scatter-density-${index}`, {min: '0', step: '10'}).val(set.density);
    const spacing = numberInput(`scatter-spacing-${index}`, {min: '0.25', step: '0.5'}).val(set.spacing);
    const minScale = numberInput(`scatter-mins-${index}`, {min: '0', step: '0.1'}).val(set.minScale);
    const maxScale = numberInput(`scatter-maxs-${index}`, {min: '0', step: '0.1'}).val(set.maxScale);
    const maxSlope = numberInput(`scatter-slope-${index}`, {min: '0', max: '90'}).val(set.maxSlope);
    const mesh = textInput(`scatter-mesh-${index}`).val(set.mesh);
    card.append(
      $('<div class="painter__row painter__row--head">').append(name, remove),
      grid(
        field('Where', selectControl(source), {full: true}),
        field('Per hectare', density, {tip: 'Points per hectare (100 × 100 m) where the "where" layer is fully on.'}),
        field('Min spacing (m)', spacing),
        field('Scale from', minScale), field('to', maxScale),
        field('Max slope (°)', maxSlope),
        field('Unreal mesh', mesh, {full: true, tip: 'Asset path of the static mesh to instance, e.g. /Game/Foliage/SM_Pine.SM_Pine. A basic shape until you change it.'}),
      ),
    );
    const num = (el: JQuery<HTMLElement>, d: number) => {
      const v = parseFloat((el.val() ?? '').toString());
      return Number.isFinite(v) ? v : d;
    };
    card.find('input, select').on('change', () => {
      set.name = (name.val() ?? '').toString() || 'Points';
      set.source = (source.val() ?? 'all').toString();
      set.density = Math.max(0, num(density, set.density));
      set.spacing = Math.max(0.25, num(spacing, set.spacing));
      set.minScale = num(minScale, set.minScale);
      set.maxScale = Math.max(set.minScale, num(maxScale, set.maxScale));
      set.maxSlope = num(maxSlope, set.maxSlope);
      set.mesh = (mesh.val() ?? '').toString() || blankScatter().mesh;
      this.emit();
    });
    remove.on('click', () => {
      this.sets.splice(index, 1);
      this.render();
      this.emit();
    });
    return card;
  }
}
