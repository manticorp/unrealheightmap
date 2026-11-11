import {BAND_COUNT, buildTintLut, getPalette, hexToRgb, LUT_SIZE, oklabToRgb, PALETTES, rampColour, rgbToOklab, tintColour} from "../src/palettes";

describe('palettes', () => {
  it('round-trips colours through Oklab', () => {
    for (const rgb of [[0, 0, 0], [255, 255, 255], [200, 30, 90], [12, 140, 220]] as [number, number, number][]) {
      const back = oklabToRgb(rgbToOklab(rgb));
      back.forEach((c, i) => expect(Math.abs(c - rgb[i])).toBeLessThanOrEqual(1));
    }
  });

  it('hits the end stops of a ramp exactly', () => {
    expect(rampColour(['#000000', '#ffffff'], 0)).toEqual([0, 0, 0]);
    expect(rampColour(['#000000', '#ffffff'], 1)).toEqual([255, 255, 255]);
    expect(rampColour(['#102030'], 0.5)).toEqual(hexToRgb('#102030'));
  });

  it('falls back to the first palette for an unknown id', () => {
    expect(getPalette('nope')).toBe(PALETTES[0]);
    expect(getPalette('viridis').id).toBe('viridis');
  });

  it('uses the sea ramp below sea level and the land ramp above', () => {
    const p = getPalette('globe');
    expect(tintColour(p, -1000, -1000, 1000, false)).toEqual(hexToRgb(p.sea![0]));
    expect(tintColour(p, 0, -1000, 1000, false)).toEqual(hexToRgb(p.land[0]));
    expect(tintColour(p, 1000, -1000, 1000, false)).toEqual(hexToRgb(p.land[p.land.length - 1]));
  });

  it('ignores the sea ramp when the range stays above sea level', () => {
    const p = getPalette('globe');
    expect(tintColour(p, 100, 100, 900, false)).toEqual(hexToRgb(p.land[0]));
  });

  it('snaps to a fixed number of colours in bands mode', () => {
    const p = getPalette('viridis');
    const seen = new Set<string>();
    for (let h = 0; h <= 1000; h += 5) seen.add(tintColour(p, h, 0, 1000, true).join(','));
    expect(seen.size).toBe(BAND_COUNT);
  });

  it('builds a lookup table spanning the range', () => {
    const p = getPalette('grey');
    const lut = buildTintLut(p, 0, 100, false);
    expect(lut.length).toBe(LUT_SIZE * 3);
    expect([lut[0], lut[1], lut[2]]).toEqual([16, 16, 16]);
    expect([lut[lut.length - 3], lut[lut.length - 2], lut[lut.length - 1]]).toEqual([255, 255, 255]);
  });
});

import {CUSTOM_ID, decodeCustomPalette, editablePalette, defaultCustomPalette, encodeCustomPalette, tintKeyTicks} from "../src/palettes";

describe('custom palettes', () => {
  it('starts as a copy of Globe', () => {
    const c = defaultCustomPalette();
    expect(c.id).toBe(CUSTOM_ID);
    expect(c.land).toEqual(getPalette('globe').land);
    expect(c.sea).toEqual(getPalette('globe').sea);
    expect(c.land).not.toBe(getPalette('globe').land);
  });

  it('round-trips through its stored form', () => {
    const c = defaultCustomPalette();
    expect(decodeCustomPalette(encodeCustomPalette(c))).toEqual(c);
    const noSea = {land: ['#112233', '#ffeedd']};
    expect(decodeCustomPalette(encodeCustomPalette(noSea))).toEqual({id: CUSTOM_ID, label: 'Custom', sea: undefined, land: noSea.land});
  });

  it('rejects invalid stored palettes', () => {
    expect(decodeCustomPalette('')).toBeUndefined();
    expect(decodeCustomPalette('112233_')).toBeUndefined();
    expect(decodeCustomPalette('_zzzzzz')).toBeUndefined();
    expect(decodeCustomPalette('a_b_c')).toBeUndefined();
  });
});

describe('tintKeyTicks', () => {
  it('labels both ends and sea level', () => {
    const ticks = tintKeyTicks(getPalette('globe'), -1000, 3000);
    expect(ticks[0]).toMatchObject({value: -1000, fraction: 0});
    expect(ticks[ticks.length - 1]).toMatchObject({value: 3000, fraction: 1});
    expect(ticks.some(t => t.value === 0 && t.label === '0 m')).toBe(true);
    expect(ticks.map(t => t.fraction)).toEqual([...ticks.map(t => t.fraction)].sort((a, b) => a - b));
  });

  it('has no sea level tick when the palette has no sea ramp', () => {
    expect(tintKeyTicks(getPalette('viridis'), -1000, 2000).some(t => t.value === 0)).toBe(false);
    expect(tintKeyTicks(getPalette('globe'), -1000, 2000).some(t => t.value === 0)).toBe(true);
  });
});

describe('palette stop positions', () => {
  it('places stops where `at` says, with a hard edge for repeated positions', () => {
    const stops = ['#0000ff', '#0000ff', '#000000', '#ffffff'], at = [0, 0.1, 0.1, 1];
    expect(rampColour(stops, 0.05, at)).toEqual([0, 0, 255]);
    expect(rampColour(stops, 0.1, at)).toEqual([0, 0, 0]);
    expect(rampColour(stops, 1, at)).toEqual([255, 255, 255]);
  });

  it('marks the lowest heights blue in Coldest and the highest red in Hottest', () => {
    const cold = getPalette('coldest'), hot = getPalette('hottest');
    const blueish = ([r, , b]: number[]) => b > 200 && r < 120;
    const reddish = ([r, g]: number[]) => r > 200 && g < 120;
    expect(blueish(tintColour(cold, 50, 0, 1000, false))).toBe(true);
    expect(blueish(tintColour(cold, 500, 0, 1000, false))).toBe(false);
    expect(reddish(tintColour(hot, 950, 0, 1000, false))).toBe(true);
    expect(reddish(tintColour(hot, 500, 0, 1000, false))).toBe(false);
  });

  it('has valid, unique palettes', () => {
    const ids = PALETTES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PALETTES) {
      for (const c of [...(p.sea ?? []), ...p.land]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      if (p.landAt) {
        expect(p.landAt.length).toBe(p.land.length);
        expect(p.landAt.every((v, i) => i === 0 || v >= p.landAt![i - 1])).toBe(true);
      }
    }
  });
});

describe('editing a built-in palette', () => {
  it('copies an evenly spaced palette exactly, and it survives the round trip', () => {
    const copy = editablePalette(getPalette('globe'));
    expect(copy.id).toBe(CUSTOM_ID);
    expect(copy.sea).toEqual(getPalette('globe').sea!.map(c => c.toLowerCase()));
    expect(copy.land).toEqual(getPalette('globe').land.map(c => c.toLowerCase()));
    expect(decodeCustomPalette(encodeCustomPalette(copy))).toEqual(copy);
  });

  it('resamples a hard-edged palette so it still looks the same', () => {
    const hottest = getPalette('hottest');
    const copy = editablePalette(hottest);
    expect(copy.landAt).toBeUndefined();
    expect(decodeCustomPalette(encodeCustomPalette(copy))).toEqual(copy);
    for (const h of [0, 300, 700, 1000]) {
      const a = tintColour(hottest, h, 0, 1000, false), b = tintColour(copy, h, 0, 1000, false);
      a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThanOrEqual(2));
    }
  });
});
