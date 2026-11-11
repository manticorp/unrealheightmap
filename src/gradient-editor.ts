/**
 * A gradient bar with draggable colour stops, like a paint program's gradient
 * editor: click the bar to add a stop, click a stop to change its colour, drag
 * it to move it, and double-click it or drag it off the bar to remove it.
 * Two stops in the same place make a hard edge; the selected one is drawn on top.
 */
import $ from "jquery";
import {ColourStop, fromStops, rampColour, stopsColour, toStops} from "./palettes";

export type GradientEditorOptions = {
  title: string;
  /** Tooltip for the title. */
  help: string;
  stops: ColourStop[];
  /** Fewest stops the ramp may have. */
  minimum: number;
  /** Colour of a stop added to an empty ramp. */
  firstColour: string;
  /** Called with the stops (in the order they were made, not sorted) whenever they change. */
  onChange: (stops: ColourStop[]) => void;
};

/** How far (px) above or below the bar a dragged stop has to go to be removed. */
const REMOVE_DISTANCE = 28;
/** A click waits this long (ms) before opening the colour picker, so a double-click can remove instead. */
const CLICK_DELAY = 250;
/** Pointer travel (px) before a press on a stop counts as a drag. */
const DRAG_THRESHOLD = 3;
/** Two presses on the same stop within this time (ms) are a double-click. */
const DOUBLE_PRESS = 350;

type Drag = {index: number, pointerId: number, x: number, y: number, moved: boolean, removing: boolean, added: boolean};

export const gradientEditor = (options: GradientEditorOptions): JQuery<HTMLElement> => {
  const stops: ColourStop[] = options.stops.map(s => ({...s}));
  let selected = -1;
  let drag: Drag | null = null;
  let pickerTimer = 0;
  // Pointer capture sends the browser's dblclick to the bar, not the stop, so double presses are spotted here
  let lastPress: {index: number, time: number} | null = null;
  let added: {index: number, time: number} | null = null;

  const root = $('<div class="tint-grad">');
  const title = $('<span class="tint-grad__title">').text(options.title).attr('title', options.help);
  const canvas = $('<canvas class="tint-grad__bar" width="256" height="1">');
  const hint = $('<span class="tint-grad__hint">').text('Click to add a colour');
  const dots = $('<div class="tint-grad__stops">');
  const track = $('<div class="tint-grad__track">').attr('title', 'Click to add a colour').append(canvas, hint, dots);
  const picker = $('<input type="color" class="tint-grad__colour">').attr('aria-label', `${options.title} colour`) as JQuery<HTMLInputElement>;
  const position = $('<input type="number" class="input is-small tint-grad__pos" min="0" max="100" step="0.1">')
    .attr('aria-label', `${options.title} colour position (%)`) as JQuery<HTMLInputElement>;
  const remove = $('<button type="button" class="button is-small is-light tint-grad__remove">').text('Remove');
  const details = $('<div class="tint-grad__details">').append(
    $('<label class="tint-grad__label">').text('Colour'), picker,
    $('<label class="tint-grad__label">').text('Position'), position, $('<span class="tint-grad__unit">').text('%'),
    remove,
  ).hide();
  root.append($('<div class="tint-grad__row">').append(title, track), details);

  const live = () => drag?.removing ? stops.filter((_, i) => i !== drag!.index) : stops;
  const emit = () => options.onChange(live().map(s => ({...s})));
  const canRemove = () => stops.length > options.minimum;

  const draw = (focus = false) => {
    const shown = live();
    const ctx = (canvas[0] as HTMLCanvasElement).getContext('2d');
    if (ctx) {
      const width = (canvas[0] as HTMLCanvasElement).width;
      ctx.clearRect(0, 0, width, 1);
      if (shown.length) {
        const {colours, at} = fromStops(shown);
        const image = ctx.createImageData(width, 1);
        for (let x = 0; x < width; x++) {
          const c = rampColour(colours, x / (width - 1), at ?? toStops(colours).map(s => s.at));
          image.data.set([c[0], c[1], c[2], 255], x * 4);
        }
        ctx.putImageData(image, 0, 0);
      }
    }
    track.toggleClass('is-empty', !shown.length);
    hint.toggle(!shown.length);
    dots.empty();
    stops.forEach((stop, i) => {
      const dot = $('<button type="button" class="tint-grad__stop">')
        .attr({'data-index': i, 'aria-label': `${options.title} colour ${i + 1} at ${Math.round(stop.at * 1000) / 10}%`,
          title: 'Click to change the colour, drag to move, double-click or drag off the bar to remove'})
        .css({left: `${stop.at * 100}%`, '--stop-colour': stop.colour})
        .toggleClass('is-selected', i === selected)
        .toggleClass('is-removing', !!drag?.removing && drag.index === i);
      dots.append(dot);
    });
    details.toggle(selected >= 0);
    if (selected >= 0) {
      picker.val(stops[selected].colour);
      if (document.activeElement !== position[0]) position.val(Math.round(stops[selected].at * 1000) / 10);
      remove.prop('disabled', !canRemove());
    }
    if (focus && selected >= 0) dots.children().eq(selected).trigger('focus');
  };

  const removeStop = (index: number) => {
    if (index < 0 || !canRemove()) return;
    stops.splice(index, 1);
    selected = -1;
    lastPress = null;
    added = null;
    draw();
    emit();
  };
  const openPicker = () => {
    const input = picker[0] as HTMLInputElement & {showPicker?: () => void};
    try {
      if (input.showPicker) input.showPicker(); else input.click();
    } catch {
      input.click();
    }
  };
  const fraction = (clientX: number) => {
    const rect = track[0].getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
  };

  track.on('pointerdown', (event) => {
    const e = event.originalEvent as PointerEvent;
    if (e.button !== 0) return;
    window.clearTimeout(pickerTimer);
    const dot = $(e.target as HTMLElement).closest('.tint-grad__stop');
    let index: number;
    let isNew = false;
    if (dot.length) {
      index = parseInt(dot.attr('data-index') ?? '-1', 10);
      const double = lastPress?.index === index && e.timeStamp - lastPress.time < DOUBLE_PRESS;
      // The double-click that just added this stop shouldn't take it away again
      const justAdded = added?.index === index && e.timeStamp - added.time < 2 * DOUBLE_PRESS;
      lastPress = {index, time: e.timeStamp};
      if (double && !justAdded) {
        e.preventDefault();
        removeStop(index);
        return;
      }
    } else {
      // A new stop takes the colour the bar already has there
      const at = fraction(e.clientX);
      stops.push({colour: stops.length ? stopsColour(stops, at) : options.firstColour, at});
      index = stops.length - 1;
      isNew = true;
      added = {index, time: e.timeStamp};
      lastPress = {index, time: e.timeStamp};
    }
    selected = index;
    drag = {index, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false, removing: false, added: isNew};
    track[0].setPointerCapture(e.pointerId);
    e.preventDefault();
    draw();
    if (isNew) emit();
  });
  track.on('pointermove', (event) => {
    const e = event.originalEvent as PointerEvent;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const rect = track[0].getBoundingClientRect();
    const away = e.clientY < rect.top - REMOVE_DISTANCE || e.clientY > rect.bottom + REMOVE_DISTANCE;
    drag.removing = away && canRemove();
    stops[drag.index].at = fraction(e.clientX);
    draw();
    emit();
  });
  const endDrag = (event: JQuery.TriggeredEvent) => {
    const e = event.originalEvent as PointerEvent;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const done = drag;
    drag = null;
    if (done.removing) {
      removeStop(done.index);
      return;
    }
    if (event.type === 'pointerup' && !done.moved && !done.added) {
      pickerTimer = window.setTimeout(openPicker, CLICK_DELAY);
    }
    draw();
  };
  track.on('pointerup pointercancel', endDrag);
  dots.on('keydown', '.tint-grad__stop', (event) => {
    const index = parseInt($(event.currentTarget).attr('data-index') ?? '-1', 10);
    if (index < 0) return;
    selected = index;
    const step = event.shiftKey ? 0.1 : 0.01;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      stops[index].at = Math.max(0, Math.min(1, stops[index].at + (event.key === 'ArrowLeft' ? -step : step)));
      draw(true);
      emit();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      removeStop(index);
    } else if (event.key === 'Enter' || event.key === ' ') {
      draw(true);
      openPicker();
    } else {
      return;
    }
    event.preventDefault();
  });
  dots.on('focus', '.tint-grad__stop', (event) => {
    const index = parseInt($(event.currentTarget).attr('data-index') ?? '-1', 10);
    if (index !== selected && !drag) {
      selected = index;
      draw(true);
    }
  });

  picker.on('input change', () => {
    if (selected < 0) return;
    stops[selected].colour = (picker.val() ?? '').toString();
    draw();
    emit();
  });
  position.on('input change', () => {
    const value = parseFloat((position.val() ?? '').toString());
    if (selected < 0 || !Number.isFinite(value)) return;
    stops[selected].at = Math.max(0, Math.min(100, value)) / 100;
    draw();
    emit();
  });
  remove.on('click', () => removeStop(selected));

  draw();
  return root;
};
