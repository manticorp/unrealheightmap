/** Small pure helpers used by the worker, kept separate so they can be unit tested. */

/** A round interval (1, 2, 2.5 or 5 × 10^n) giving about `target` contour levels. */
export const autoContourInterval = (range : number, target : number = 20) : number => {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 2.25 ? 2 : n < 3.5 ? 2.5 : n < 7.5 ? 5 : 10) * mag;
};
