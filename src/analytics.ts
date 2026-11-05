// Thin wrapper around GoatCounter (https://www.goatcounter.com), which is loaded
// by the <script data-goatcounter> tag in each page's <head>. That script loads
// async, so events fired before it arrives (e.g. opening a share link) are
// queued and sent once it's ready. If it's blocked, events are silently dropped.

declare global {
  interface Window {
    goatcounter?: {
      count?: (vars: {path: string, title?: string, event?: boolean}) => void
    }
  }
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();
const queue: string[] = [];
const QUEUE_POLL_MS = 250;
const QUEUE_GIVE_UP_MS = 15000;
let queueTimer: ReturnType<typeof setInterval> | null = null;

const countNow = (path: string) => {
  try {
    window.goatcounter.count({path, title: path, event: true});
  } catch (e) {
    // never let analytics break the app
  }
};

const ready = () => typeof window.goatcounter?.count === 'function';

const flushWhenReady = () => {
  if (queueTimer) return;
  const started = Date.now();
  queueTimer = setInterval(() => {
    if (ready()) {
      queue.splice(0).forEach(countNow);
    } else if (Date.now() - started < QUEUE_GIVE_UP_MS) {
      return;
    } else {
      queue.length = 0; // blocked by an ad blocker, or offline
    }
    clearInterval(queueTimer);
    queueTimer = null;
  }, QUEUE_POLL_MS);
};

const send = (path: string) => {
  if (ready()) {
    countNow(path);
  } else {
    queue.push(path);
    flushWhenReady();
  }
};

/**
 * Record an event straight away, e.g. a button press or a download.
 */
export const trackEvent = (path: string) => send(path);

/**
 * Record an event, but only once per burst: repeat calls with the same key
 * within `delay` ms replace the earlier one, so only the last is sent.
 */
export const trackDebounced = (key: string, path: string, delay: number = 1500) => {
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    send(path);
  }, delay));
};

/**
 * Record a control change. Changes sharing the same key are debounced, so
 * typing "1024" or holding a number spinner counts once rather than per
 * keystroke; only the last value within the window is sent.
 */
export const trackControl = (key: string, value?: string|number|boolean, delay: number = 1500) => {
  const path = value === undefined || value === '' ? `control/${key}` : `control/${key}/${value}`;
  trackDebounced(`control/${key}`, path, delay);
};

const slug = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Count clicks on links anywhere on the page (header, footer and docs):
 * Ko-fi donations, outbound links by host, and the example location tags.
 * Delegated, so it covers links added later too.
 */
export const trackLinkClicks = (root: Document = document) => {
  root.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    try {
      const url = new URL(link.href, location.href);
      if (url.hostname.endsWith('ko-fi.com')) {
        send(`link/ko-fi/${slug((location.pathname.split('/').pop() || 'index').replace(/\.html$/, '')) || 'index'}`);
      } else if (url.origin !== location.origin) {
        send(`link/outbound/${url.hostname.replace(/^www\./, '')}`);
      } else if (link.closest('.map-locations')) {
        send(`link/example/${slug(link.textContent || '') || 'unknown'}`);
      }
    } catch (err) {
      // ignore malformed links
    }
  }, {capture: true});
};
