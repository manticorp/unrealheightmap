import * as fs from 'fs';
import * as path from 'path';
import {SETTINGS, SettingKey} from '../src/url-state';
import {PARAM_META, buildUrlParamsSpec} from '../src/url-params-meta';

const root = path.resolve(__dirname, '..');

const allMatches = (text: string, re: RegExp): RegExpExecArray[] => {
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m);
  return out;
};

describe('agent-facing docs', () => {
  test('every URL setting has metadata, and nothing extra', () => {
    const settings = Object.keys(SETTINGS).sort();
    const meta = Object.keys(PARAM_META).sort();
    expect(meta).toEqual(settings);
  });

  test('enum settings list their allowed values and defaults are allowed', () => {
    for (const key of Object.keys(SETTINGS) as SettingKey[]) {
      const m = PARAM_META[key];
      if (m.type === 'enum') {
        expect(m.values && m.values.length).toBeGreaterThan(0);
      }
      expect(m.description.length).toBeGreaterThan(5);
    }
  });

  test('url-params.json is up to date (run `npm run docs:agents`)', () => {
    const onDisk = fs.readFileSync(path.join(root, 'url-params.json'), 'utf8');
    expect(onDisk).toBe(JSON.stringify(buildUrlParamsSpec(), null, 2) + '\n');
  });

  test('llms.txt links only to files that exist', () => {
    const text = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
    const base = 'https://manticorp.github.io/unrealheightmap/';
    const local = allMatches(text, /\]\((https:\/\/manticorp\.github\.io\/unrealheightmap\/)([^)#]*)\)/g)
      .map(m => m[2])
      .filter(p => p !== '');
    expect(local.length).toBeGreaterThan(5);
    for (const file of local) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
    expect(text.startsWith('# ')).toBe(true);
    expect(base).toBeTruthy();
  });

  test('every documentation page has JSON-LD and a Markdown mirror', () => {
    for (const page of ['instructions', 'guides', 'guide-unreal', 'guide-blender', 'guide-godot', 'guide-unity', 'guide-3d-printing', 'guide-other', 'examples', 'rights']) {
      const html = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
      expect(html).toContain('application/ld+json');
      expect(fs.existsSync(path.join(root, `${page}.md`))).toBe(true);
    }
  });

  test('JSON-LD blocks parse', () => {
    for (const page of ['index', 'instructions', 'guides', 'guide-unreal', 'examples', 'rights']) {
      const html = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
      const blocks = allMatches(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        expect(() => JSON.parse(b[1])).not.toThrow();
      }
    }
  });
});
