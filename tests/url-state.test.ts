import { buildHash, parseHash } from '../src/url-state';

describe('url-state', () => {
  test('writes short params, rounds coordinates and skips defaults', () => {
    const hash = buildHash({
      latitude: '27.994401411046148',
      longitude: '86.92520141601562',
      zoom: '13',
      outputzoom: '12',
      width: '1009',
      height: '1009',
      outputformat: 'png16', // default, omitted
      normmode: '3',         // default (smart), omitted
      tilemode: 'off',       // default, omitted
      watermask: '1',
      heightbands: '500,1500',
    });
    expect(hash).toBe('#lat=27.9944&lng=86.9252&z=13&oz=12&w=1009&h=1009&wmask=1&bands=500,1500');
  });

  test('normalisation mode is a word in the URL', () => {
    expect(buildHash({normmode: '0'})).toBe('#norm=off');
    expect(buildHash({normmode: '1'})).toBe('#norm=regular');
    expect(parseHash('#norm=regular').normmode).toBe('1');
  });

  test('round-trips through parseHash', () => {
    const values = {
      latitude: '-33.8688',
      longitude: '151.2093',
      zoom: '10',
      outputzoom: '11',
      width: '2017',
      height: '505',
      outputformat: 'exr32',
      maptype: 'imagery',
      tilemode: 'count',
      tilecountx: '4',
      tilecounty: '2',
      tilezip: '1',
      waterlevel: '-2.5',
      flattenwater: '1',
      normalmap: 'directx',
      heightbands: '200, 800',
    };
    expect(parseHash(buildHash(values))).toEqual(values);
  });

  test('reads the legacy slash format', () => {
    expect(parseHash('#latitude/27.99/longitude/86.92/zoom/13/outputzoom/13/width/505/height/505/outputformat/png16')).toEqual({
      latitude: '27.99',
      longitude: '86.92',
      zoom: '13',
      outputzoom: '13',
      width: '505',
      height: '505',
      outputformat: 'png16',
    });
  });

  test('ignores unknown and empty input', () => {
    expect(parseHash('')).toEqual({});
    expect(parseHash('#')).toEqual({});
    expect(parseHash('#foo=1&lat=1')).toEqual({latitude: '1'});
    expect(parseHash('#foo/bar')).toEqual({});
  });
});
