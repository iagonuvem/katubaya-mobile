import { expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ptBR, en } from './index';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

it('pt-BR and en define the same keys', () => {
  expect(keys(en).sort()).toEqual(keys(ptBR).sort());
});

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) && !name.includes('.test.') ? [path] : [];
  });

it('every literal t() key used in the code exists', () => {
  const defined = new Set(keys(ptBR).map(k => k.replace(/_(one|other|zero)$/, '')));
  const missing: string[] = [];
  for (const file of files(join(__dirname, '..'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!defined.has(m[1])) missing.push(`${m[1]} (${file.split('/src/')[1]})`);
    }
  }
  expect(missing).toEqual([]);
});

it('plural keys are always called with a count', () => {
  const all = keys(ptBR);
  const pluralOnly = new Set(all.filter(k => k.endsWith('_other')).map(k => k.slice(0, -6)).filter(k => !all.includes(k)));
  const missing: string[] = [];
  for (const file of files(join(__dirname, '..'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!pluralOnly.has(m[1])) continue;
      // the call's arguments, up to its balanced closing parenthesis
      let depth = 1, i = m.index! + m[0].length;
      while (i < src.length && depth > 0) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++; }
      if (!/count/.test(src.slice(m.index! + m[0].length, i))) missing.push(`${m[1]} (${file.split('/src/')[1]})`);
    }
  }
  expect(missing).toEqual([]);
});
