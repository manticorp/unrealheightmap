import $ from "jquery";
import {trackEvent} from "./analytics";

const KOFI_URL = 'https://ko-fi.com/L4L212G6M7';
const COUNT_KEY = 'donatePromptCount';
const STOP_KEY = 'donatePromptStopped';
const EVERY = 3;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

let modal: JQuery<HTMLElement> | null = null;

function close() {
  modal?.removeClass('is-active');
  $(document).off('keydown.donatePrompt');
}

function build(): JQuery<HTMLElement> {
  const el = $(`
    <div class="modal donate-prompt" role="dialog" aria-modal="true" aria-labelledby="donatePromptTitle">
      <div class="modal-background"></div>
      <div class="modal-card">
        <section class="modal-card-body">
          <button class="delete is-medium donate-prompt-close" aria-label="Close"></button>
          <h2 id="donatePromptTitle" class="title is-4">Enjoying the heightmap generator?</h2>
          <p>It's free and ad-free, but the map tiles and hosting behind it aren't.
            If it's saved you some time, a coffee helps keep it running.</p>
          <div class="donate-prompt-actions">
            <a class="button donate-prompt-kofi" href="${KOFI_URL}" target="_blank" rel="noopener">
              <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="" width="22" height="22">
              <span>Support me on Ko-fi</span>
            </a>
            <button class="button is-text donate-prompt-dismiss">Maybe later</button>
          </div>
          <p class="donate-prompt-stop"><a href="#">Don't ask me again</a></p>
        </section>
      </div>
    </div>`);

  el.find('.modal-background, .donate-prompt-close, .donate-prompt-dismiss').on('click', () => {
    trackEvent('donate-prompt/dismiss');
    close();
  });
  el.find('.donate-prompt-kofi').on('click', () => {
    trackEvent('donate-prompt/kofi');
    close();
  });
  el.find('.donate-prompt-stop a').on('click', (e) => {
    e.preventDefault();
    write(STOP_KEY, '1');
    trackEvent('donate-prompt/stop');
    close();
  });

  $('body').append(el);
  return el;
}

function show(manual = false) {
  modal ??= build();
  if (modal.hasClass('is-active')) return;
  modal.addClass('is-active');
  if (!manual) trackEvent('donate-prompt/show');
  $(document).on('keydown.donatePrompt', (e) => {
    if (e.key === 'Escape') close();
  });
  modal.find('.donate-prompt-kofi').trigger('focus');
}

/** Call on each generate/download press; shows the Ko-fi prompt every third press unless the user opted out. */
export function countDonatePrompt() {
  if (read(STOP_KEY)) return;
  const count = (parseInt(read(COUNT_KEY) || '0', 10) || 0) + 1;
  write(COUNT_KEY, String(count));
  if (count % EVERY === 0) {
    show();
  }
}

// Hidden shortcut for previewing the prompt: Ctrl+Shift+P. Ignores the opt-out and the counter.
$(document).on('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    show(true);
  }
});
