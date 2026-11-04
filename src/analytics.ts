// Thin wrapper around GoatCounter (https://www.goatcounter.com), which is loaded
// by the <script data-goatcounter> tag in each page's <head>. If it's blocked or
// hasn't loaded yet, events are silently dropped.

declare global {
  interface Window {
    goatcounter?: {
      count?: (vars: {path: string, title?: string, event?: boolean}) => void
    }
  }
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();

const send = (path: string) => {
  try {
    window.goatcounter?.count?.({path, title: path, event: true});
  } catch (e) {
    // never let analytics break the app
  }
};

/**
 * Record an event straight away, e.g. a button press or a download.
 */
export const trackEvent = (path: string) => send(path);

/**
 * Record a control change. Changes sharing the same key are debounced, so
 * typing "1024" or holding a number spinner counts once rather than per
 * keystroke; only the last value within the window is sent.
 */
export const trackControl = (key: string, value?: string|number|boolean, delay: number = 1500) => {
  const path = value === undefined || value === '' ? `control/${key}` : `control/${key}/${value}`;
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    send(path);
  }, delay));
};
