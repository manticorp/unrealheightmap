import {sunDirectionZUp, sunPosition, sunTimes} from '../src/sun';

const minutesBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 60000;

describe('sun', () => {
  test('London midsummer midday is high in the south', () => {
    const {azimuth, altitude} = sunPosition(new Date('2024-06-21T12:00:00Z'), 51.5074, -0.1278);
    expect(altitude).toBeCloseTo(61.9, 0);
    expect(Math.abs(azimuth - 180)).toBeLessThan(3);
  });

  test('Sydney midwinter midday is low in the north', () => {
    // Noon AEST; solar noon is a few minutes earlier
    const {azimuth, altitude} = sunPosition(new Date('2024-06-21T02:00:00Z'), -33.8688, 151.2093);
    expect(altitude).toBeCloseTo(32.7, 0);
    expect(Math.min(azimuth, 360 - azimuth)).toBeLessThan(3);
  });

  test('equator at the March equinox has the sun nearly overhead at solar noon', () => {
    const {solarNoon} = sunTimes(new Date('2024-03-20T12:00:00Z'), 0, 0);
    // Equation of time is about -7.5 minutes in late March
    expect(minutesBetween(solarNoon, new Date('2024-03-20T12:07:30Z'))).toBeLessThan(1);
    expect(sunPosition(solarNoon, 0, 0).altitude).toBeGreaterThan(89.5);
  });

  test('afternoon sun is in the west and below the horizon at night', () => {
    expect(sunPosition(new Date('2024-06-21T17:00:00Z'), 51.5, 0).azimuth).toBeGreaterThan(250);
    expect(sunPosition(new Date('2024-06-21T00:00:00Z'), 51.5, 0).altitude).toBeLessThan(-10);
  });

  test('London sunrise and sunset on the solstice', () => {
    const times = sunTimes(new Date('2024-06-21T12:00:00Z'), 51.5074, -0.1278);
    // 04:43 and 21:21 BST
    expect(minutesBetween(times.sunrise!, new Date('2024-06-21T03:43:00Z'))).toBeLessThan(2);
    expect(minutesBetween(times.sunset!, new Date('2024-06-21T20:21:00Z'))).toBeLessThan(2);
    expect(minutesBetween(times.solarNoon, new Date('2024-06-21T12:02:00Z'))).toBeLessThan(1);
  });

  test('polar night and polar day have no sunrise or sunset', () => {
    const night = sunTimes(new Date('2024-12-21T12:00:00Z'), 78.22, 15.65);
    expect(night.sunrise).toBeNull();
    expect(night.sunset).toBeNull();
    expect(sunPosition(night.solarNoon, 78.22, 15.65).altitude).toBeLessThan(0);
    const day = sunTimes(new Date('2024-06-21T12:00:00Z'), 78.22, 15.65);
    expect(day.sunrise).toBeNull();
    expect(day.sunset).toBeNull();
  });

  test('sun direction is a unit vector with +x east, +y north, +z up', () => {
    const close = (v: number[], e: number[]) => v.forEach((c, i) => expect(c).toBeCloseTo(e[i], 6));
    close(sunDirectionZUp(0, 0), [0, 1, 0]);
    close(sunDirectionZUp(90, 0), [1, 0, 0]);
    close(sunDirectionZUp(123, 90), [0, 0, 1]);
    const [x, y, z] = sunDirectionZUp(200, 30);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    expect(z).toBeCloseTo(0.5, 9);
  });
});
