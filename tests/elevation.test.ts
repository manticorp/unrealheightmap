import {
  Limiter,
  LruCache,
  MapterhornSource,
  decodeTerrarium,
  metresPerPixel,
  parentRegion,
  resampleRegion,
} from '../src/elevation';

describe('elevation helpers', () => {
  test('decodeTerrarium matches the Terrarium formula', () => {
    // 8848 m: 8848 + 32768 = 41616 = 162 * 256 + 144
    const rgba = [162, 144, 0, 255, 128, 0, 0, 255, 127, 255, 128, 255];
    expect(Array.from(decodeTerrarium(rgba, 4, 3))).toEqual([8848, 0, -0.5]);
  });

  test('parentRegion finds the quadrant of a 512 px parent one zoom up', () => {
    // 256 px tile z10 (x=5, y=6) lives in 512 px tile z9 (2, 3), bottom-right quadrant
    expect(parentRegion(10, 5, 6, 9, 512)).toEqual({px: 2, py: 3, x0: 256, y0: 0, size: 256});
    expect(parentRegion(10, 4, 7, 9, 512)).toEqual({px: 2, py: 3, x0: 0, y0: 256, size: 256});
    // Two zooms further up the region is a quarter as wide (128 px)
    expect(parentRegion(10, 5, 6, 8, 512)).toEqual({px: 1, py: 1, x0: 128, y0: 256, size: 128});
  });

  test('resampleRegion copies a 1:1 region exactly', () => {
    const src = new Float32Array(512 * 512).map((_, i) => i);
    const out = resampleRegion(src, 512, 256, 256, 256);
    expect(out[0]).toBe(256 * 512 + 256);
    expect(out[255]).toBe(256 * 512 + 511);
    expect(out[255 * 256]).toBe(511 * 512 + 256);
  });

  test('resampleRegion upsamples smoothly', () => {
    // Linear ramp in x stays linear after 2x upsampling
    const src = new Float32Array(4 * 4).map((_, i) => (i % 4) * 10);
    const out = resampleRegion(src, 4, 0, 0, 4, 8);
    const row = Array.from(out.subarray(0, 8));
    for (let i = 2; i < 6; i++) {
      expect(row[i + 1] - row[i]).toBeCloseTo(5);
    }
  });

  test('metresPerPixel matches the usual Web Mercator figures', () => {
    expect(metresPerPixel(0, 0)).toBeCloseTo(156543, 0);
    expect(metresPerPixel(15, 60)).toBeCloseTo(156543.03392 / 32768 / 2, 3);
  });

  test('LruCache evicts the least recently used entry', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  test('Limiter caps concurrency', async () => {
    const limiter = new Limiter(2);
    let active = 0;
    let peak = 0;
    await Promise.all(Array.from({length: 6}, () => limiter.run(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(r => setTimeout(r, 5));
      active--;
    })));
    expect(peak).toBe(2);
  });
});

describe('MapterhornSource', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  test('falls back to coarser tiles where high-res data is missing, and reports it', async () => {
    const requested: string[] = [];
    // Only z12 and below exist
    global.fetch = jest.fn(async (url: string) => {
      const [z] = url.match(/\/(\d+)\/\d+\/\d+\.webp$/).slice(1).map(Number);
      requested.push(url.replace('https://tiles.mapterhorn.com/', ''));
      return {status: z > 12 ? 404 : 200, ok: z <= 12, blob: async () => new Blob()} as unknown as Response;
    }) as unknown as typeof fetch;
    const source = new MapterhornSource();
    // Skip real image decoding: pretend every existing parent is flat 100 m
    source.fetchParent = (z, x, y) => {
      const key = `${z}/${x}/${y}`;
      return global.fetch(`https://tiles.mapterhorn.com/${key}.webp`).then(r => r.status === 404 ? null : new Float32Array(512 * 512).fill(100));
    };
    const tile = await source.getTile(15, 16984, 11548);
    expect(tile.length).toBe(256 * 256);
    expect(tile[0]).toBe(100);
    // Tried z14 and z13 (missing) before using z12
    expect(requested.map(r => r.split('/')[0])).toEqual(['14', '13', '12']);
    expect(source.getStats()).toEqual({bestZoom: 13, worstZoom: 13});
  });

  test('never asks for more than z17', async () => {
    const source = new MapterhornSource();
    const asked: number[] = [];
    source.fetchParent = async (z) => {
      asked.push(z);
      return new Float32Array(512 * 512);
    };
    await source.getTile(19, 0, 0);
    expect(asked[0]).toBe(17);
  });
});
