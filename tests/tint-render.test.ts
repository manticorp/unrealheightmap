import {TILE_SIZE} from "../src/elevation";
import {NO_EDGES, TintParams, paintTint, tileEdges} from "../src/tint-render";

const N = TILE_SIZE;
// A smooth, curved surface in world pixels, so slopes differ everywhere
const world = (gx: number, gy: number) => 800 * Math.sin(gx / 37) + 500 * Math.cos(gy / 23) + 0.4 * gx * gy / 50;

/** A 256 × 256 tile whose top-left corner sits at world pixel (ox, oy). */
const tileAt = (ox: number, oy: number) => {
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] = world(ox + x, oy + y);
  return h;
};

const params: TintParams = {mode: 'hillshade', palette: 'grey', min: -2000, max: 2000};
const paint = (h: Float32Array, edges = NO_EDGES) => {
  const out = new Uint8ClampedArray(N * N * 4);
  paintTint(h, params, 30, out, edges);
  return out;
};
const pixel = (img: Uint8ClampedArray, x: number, y: number) => Array.from(img.slice((y * N + x) * 4, (y * N + x) * 4 + 3));

describe('tint hillshade across tile borders', () => {
  const z = 2;
  const fetch = async (x: number, y: number) => tileAt(x * N, y * N);

  it('shades border pixels exactly as an interior pixel would be', async () => {
    const centre = paint(tileAt(N, N), await tileEdges(fetch, z, 1, 1));
    const right = paint(tileAt(2 * N, N), await tileEdges(fetch, z, 2, 1));
    const below = paint(tileAt(N, 2 * N), await tileEdges(fetch, z, 1, 2));
    // Tiles offset by half a tile put the same ground in their interior
    const acrossX = paint(tileAt(N + N / 2, N));
    const acrossY = paint(tileAt(N, N + N / 2));
    for (const y of [1, 77, 200]) {
      expect(pixel(centre, N - 1, y)).toEqual(pixel(acrossX, N / 2 - 1, y));
      expect(pixel(right, 0, y)).toEqual(pixel(acrossX, N / 2, y));
    }
    for (const x of [1, 77, 200]) {
      expect(pixel(centre, x, N - 1)).toEqual(pixel(acrossY, x, N / 2 - 1));
      expect(pixel(below, x, 0)).toEqual(pixel(acrossY, x, N / 2));
    }
  });

  it('wraps around in longitude and leaves the poles without a neighbour', async () => {
    const asked: string[] = [];
    const edges = await tileEdges(async (x, y) => { asked.push(`${x},${y}`); return tileAt(x * N, y * N); }, z, 0, 0);
    expect(asked.sort()).toEqual(['0,1', '1,0', '3,0']);
    expect(edges.top).toBeNull();
    expect(edges.left).not.toBeNull();
  });

  it('carries on when a neighbour fails to load', async () => {
    const edges = await tileEdges(async (x, y) => { if (x === 2) throw new Error('offline'); return tileAt(x * N, y * N); }, z, 1, 1);
    expect(edges.right).toBeNull();
    expect(edges.left).not.toBeNull();
    // Still paints, using a one-sided slope at that edge
    expect(() => paint(tileAt(N, N), edges)).not.toThrow();
  });
});
