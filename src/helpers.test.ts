import { clamp, roll, format } from './helpers';

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
});
