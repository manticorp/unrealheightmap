/**
 * Sun position and rise/set times, following NOAA's solar calculator
 * (Meeus-based, good to a fraction of a degree for dates around now).
 * Angles are degrees, longitude is positive east.
 */

export type SunPosition = {
  /** Degrees clockwise from north. */
  azimuth: number;
  /** Degrees above the horizon, including atmospheric refraction. */
  altitude: number;
};

export type SunTimes = {
  /** Null during polar day or polar night. */
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
};

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
/** Sun's centre this far below the horizon at sunrise/sunset (refraction + radius). */
const SUNRISE_ZENITH = 90.833;

const mod360 = (v: number) => ((v % 360) + 360) % 360;

/** Declination (degrees) and equation of time (minutes) at a moment in Unix days. */
const solarCoordinates = (days: number) => {
  const t = (days + 2440587.5 - 2451545) / 36525;
  const meanLong = mod360(280.46646 + t * (36000.76983 + t * 0.0003032));
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const m = meanAnomaly * RAD;
  const centre = Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(2 * m) * (0.019993 - 0.000101 * t)
    + Math.sin(3 * m) * 0.000289;
  const omega = (125.04 - 1934.136 * t) * RAD;
  const apparentLong = (meanLong + centre - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = (meanObliquity + 0.00256 * Math.cos(omega)) * RAD;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(apparentLong)) / RAD;

  const y = Math.tan(obliquity / 2) ** 2;
  const l0 = meanLong * RAD;
  const equationOfTime = 4 / RAD * (
    y * Math.sin(2 * l0)
    - 2 * eccentricity * Math.sin(m)
    + 4 * eccentricity * y * Math.sin(m) * Math.cos(2 * l0)
    - 0.5 * y * y * Math.sin(4 * l0)
    - 1.25 * eccentricity * eccentricity * Math.sin(2 * m)
  );
  return {declination, equationOfTime};
};

/** Refraction in degrees to add to a geometric altitude (NOAA's approximation). */
const refraction = (altitude: number): number => {
  if (altitude > 85) {
    return 0;
  }
  const tanA = Math.tan(altitude * RAD);
  let arcSeconds: number;
  if (altitude > 5) {
    arcSeconds = 58.1 / tanA - 0.07 / tanA ** 3 + 0.000086 / tanA ** 5;
  } else if (altitude > -0.575) {
    arcSeconds = 1735 + altitude * (-518.2 + altitude * (103.4 + altitude * (-12.79 + altitude * 0.711)));
  } else {
    arcSeconds = -20.774 / tanA;
  }
  return arcSeconds / 3600;
};

export const sunPosition = (date: Date, latitude: number, longitude: number): SunPosition => {
  const days = date.getTime() / DAY_MS;
  const {declination, equationOfTime} = solarCoordinates(days);
  const minutesUtc = (days - Math.floor(days)) * 1440;
  const trueSolarMinutes = minutesUtc + equationOfTime + 4 * longitude;
  const hourAngle = (trueSolarMinutes / 4 - 180) * RAD;
  const lat = latitude * RAD;
  const dec = declination * RAD;

  const cosZenith = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle);
  const altitude = 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / RAD;
  // Measured from south towards west, then turned to clockwise from north
  const azimuth = mod360(Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
  ) / RAD + 180);
  return {azimuth, altitude: altitude + refraction(altitude)};
};

/** Unit vector towards the sun with +x east, +y north and +z up. */
export const sunDirectionZUp = (azimuth: number, altitude: number): [number, number, number] => {
  const az = azimuth * RAD;
  const alt = altitude * RAD;
  return [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)];
};

/**
 * Sunrise, solar noon and sunset for the local solar day containing `date`
 * at this longitude. Each event is refined once at its own time.
 */
export const sunTimes = (date: Date, latitude: number, longitude: number): SunTimes => {
  const days = date.getTime() / DAY_MS;
  // UTC day number of the local mean solar day
  const day = Math.floor(days + longitude / 360);
  const meanNoon = day + 0.5 - longitude / 360;

  const noonAt = (guess: number) => meanNoon - solarCoordinates(guess).equationOfTime / 1440;
  const noon = noonAt(noonAt(meanNoon));

  const lat = latitude * RAD;
  // Half-day length in days, or null if the sun never crosses the horizon
  const halfDay = (at: number): number | null => {
    const dec = solarCoordinates(at).declination * RAD;
    const cosH = Math.cos(SUNRISE_ZENITH * RAD) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec);
    if (cosH > 1 || cosH < -1) {
      return null;
    }
    return Math.acos(cosH) / RAD / 360;
  };
  const event = (sign: 1 | -1): Date | null => {
    const first = halfDay(noon);
    if (first === null) {
      return null;
    }
    const guess = noon + sign * first;
    const refined = halfDay(guess);
    if (refined === null) {
      return null;
    }
    // Noon shifts slightly over the half day as the equation of time changes
    const eventNoon = meanNoon - solarCoordinates(guess).equationOfTime / 1440;
    return new Date((eventNoon + sign * refined) * DAY_MS);
  };
  return {sunrise: event(-1), sunset: event(1), solarNoon: new Date(noon * DAY_MS)};
};
