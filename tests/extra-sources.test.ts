import {BODY_RADIUS, EtopoSource, PLANETS, PlanetSource, tileBounds3857, tileXToLng, tileYToLat, zoomForResolution} from '../src/extra-sources';

describe('extra elevation sources', () => {
  test('tile bounds and corners', () => {
    const b = tileBounds3857(0, 0, 0);
    expect(b.xmin).toBeCloseTo(-20037508.34, 1);
    expect(b.ymax).toBeCloseTo(20037508.34, 1);
    expect(tileXToLng(1, 1)).toBe(0);
    expect(tileYToLat(1, 1)).toBeCloseTo(0, 9);
    expect(tileYToLat(0, 0)).toBeCloseTo(85.0511, 3);
  });

  test('ETOPO URL asks for a float tiff of the tile, locked to the ETOPO raster', () => {
    const url = new URL(EtopoSource.tileUrl(8, 16, 113));
    expect(url.searchParams.get('size')).toBe('256,256');
    expect(url.searchParams.get('pixelType')).toBe('F32');
    expect(url.searchParams.get('bboxSR')).toBe('3857');
    expect(JSON.parse(url.searchParams.get('mosaicRule')).lockRasterIds).toEqual([4593]);
  });

  test('planet sources use the body radius and a sensible native zoom', () => {
    const mars = new PlanetSource(PLANETS[0]);
    expect(mars.radius).toBe(BODY_RADIUS.mars);
    // 463 m pixels on Mars ≈ zoom 7.5
    expect(mars.nativeZoom).toBe(7);
    expect(zoomForResolution(118, BODY_RADIUS.moon)).toBeCloseTo(8.5, 1);
    // MOLA's file is in metres on the Mars sphere (its origin sits half a pixel further out, at -10669677)
    expect(mars.toCrs(-180, 0)[0]).toBeCloseTo(-3396190 * Math.PI, 3);
  });
});
