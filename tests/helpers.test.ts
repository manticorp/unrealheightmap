import {
  clamp,
  roll,
  format,
  promiseAllInBatches,
  roundDigits,
  localFormatNumber,
} from './../src/helpers';

describe('helpers', () => {
  test('clamp constrains numbers', () => {
    expect(clamp(5, 0, 2)).toBe(2);
    expect(clamp(-3, 0, 2)).toBe(0);
    expect(clamp(1, 0, 2)).toBe(1);
  });

  test('roll wraps numbers inside bounds', () => {
    expect(roll(5, 0, 4)).toBe(1);
    expect(roll(-1, 0, 4)).toBe(3);
  });

  test('format replaces tokens', () => {
    expect(format('{a}_{b}', { a: 'foo', b: 3 })).toBe('foo_3');
  });

  test('roundDigits caps precision without scientific drift', () => {
    expect(roundDigits(1.23456, 2)).toBeCloseTo(1.23);
    expect(roundDigits(0.0000123456, 6)).toBeCloseTo(0.000012);
  });

  test('localFormatNumber mirrors locale-aware rounding', () => {
    const result = localFormatNumber(1234.5678, 2);
    expect(result).toBe(roundDigits(1234.5678, 2).toLocaleString());
  });
});

describe('promiseAllInBatches', () => {
  test('limits concurrent work to batch size', async () => {
    const inFlight: number[] = [];
    let active = 0;
    const task = async (value: number) => {
      active++;
      inFlight.push(active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active--;
      return value * 2;
    };

    const result = await promiseAllInBatches(task, [1, 2, 3, 4, 5], 2);

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(Math.max(...inFlight)).toBeLessThanOrEqual(2);
  });
});
