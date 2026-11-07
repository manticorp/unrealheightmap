import {buildImportScripts, unrealXYScale, unrealZLocation, unrealZScale} from '../src/import-scripts';

const input = {
  name: '27_994_86_925_13_505_505',
  width: 505,
  height: 505,
  physWidth: 9000,
  physHeight: 9000,
  minHeight: 4000,
  maxHeight: 8848,
  encoding: 'normalised' as const,
  format: 'png' as const,
  tiles: [{file: 'a.png', startX: 0, startY: 0, width: 505, height: 505}],
  albedoFile: 'albedo.png',
  extraFiles: ['n.png'],
};

describe('import scripts', () => {
  test('unreal scale maths', () => {
    expect(unrealZScale(512)).toBe(100);
    expect(unrealXYScale(100, 100)).toBe(100);
    // value 32768 sits at local zero, so the actor goes to ~ the middle height
    expect(unrealZLocation(0, 100) / 100).toBeCloseTo(50, 2);
  });

  test('builds blender, unreal and readme files', () => {
    const files = buildImportScripts(input);
    expect(files.map(f => f.filename)).toEqual([
      `${input.name}_blender_import.py`,
      `${input.name}_unreal_set_scale.py`,
      `${input.name}_README.txt`,
    ]);
    const blender = files[0].contents;
    expect(blender).toContain('HEIGHT_STRENGTH = 4848');
    expect(blender).toContain('HEIGHT_OFFSET = 4000');
    expect(blender).toContain('("a.png", 0, 0, 505, 505),');
    expect(blender).toContain('ALBEDO = "albedo.png"');
    const unreal = files[1].contents;
    expect(unreal).toContain(`Z_SCALE = ${Number((4848 / 65535 * 12800).toFixed(4))}`);
  });

  test('raw metres PNGs scale 1 unit to 1 metre', () => {
    const files = buildImportScripts({...input, encoding: 'metres', minHeight: 0, maxHeight: 8848});
    expect(files[0].contents).toContain('HEIGHT_STRENGTH = 65535');
    expect(files[1].contents).toContain('Z_SCALE = 12800');
    const exr = buildImportScripts({...input, encoding: 'metres', format: 'exr'});
    expect(exr.map(f => f.filename).some(f => f.includes('unreal'))).toBe(false);
    expect(exr[0].contents).toContain('HEIGHT_STRENGTH = 1\n');
  });
});
