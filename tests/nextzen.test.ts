import NextZen from '../src/nextzen';

describe('NextZen tile URLs', () => {
  it('substitutes coordinates and api key for getUrl', () => {
    const url = NextZen.getUrl({ x: 1, y: 2, z: 3 });
    expect(url).toBe('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/3/1/2.png?api_key=FOkBTi_OQyaSFYGMo5x_-Q');
  });

  it('leaves coordinate placeholders intact for layer previews', () => {
    const templatedUrl = NextZen.getApiKeyedUrl();
    expect(templatedUrl).toContain('{z}/{x}/{y}');
    expect(templatedUrl).toContain('FOkBTi_OQyaSFYGMo5x_-Q');
  });
});
