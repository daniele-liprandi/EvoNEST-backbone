// Each parser emits only the quantities it declares

import { readFileSync } from 'fs';
import { resolve, basename } from 'path';
import { DataFormatParserRegistry } from '../utils/file-management/readable-data-extractors/registry';
import type { ParsedDataResult, ParserDescription } from '../utils/file-management/readable-data-extractors/types';

const SNAKE = /^[a-z][a-z0-9_]*$/;

describe('parser registry contract', () => {
  let registry: DataFormatParserRegistry;
  let parsers: ParserDescription[];

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    registry = new DataFormatParserRegistry();
    parsers = registry.listParsers();
  });

  afterAll(() => jest.restoreAllMocks());

  test('every parser declares label, technique, family and format', () => {
    expect(parsers.length).toBeGreaterThan(0);
    for (const p of parsers) {
      expect(p.label).toBeTruthy();
      expect(p.technique).toMatch(SNAKE);
      expect(['mechanics', 'logging', 'generic']).toContain(p.family);
      expect(p.formatDescription).toBeTruthy();
    }
  });

  test('declared quantities are snake_case with a label and a unit', () => {
    for (const p of parsers) {
      if (p.dynamicTraits) {
        expect(p.generatedTraits).toEqual([]);
        continue;
      }
      expect(p.generatedTraits.length).toBeGreaterThan(0);
      for (const t of p.generatedTraits) {
        expect(t.value).toMatch(SNAKE);
        expect(t.label).toBeTruthy();
        expect(t.unit).toBeTruthy();
      }
    }
  });

  test.each([
    'TensileTestFormatParser',
    'LoggerMateTemperatureParser',
    'LoggerMateGPSParser',
    'LoggerMateAccelerometerParser',
    'StarOddiParser',
  ])('%s emits only declared quantities from its example file', (name) => {
    const p = parsers.find((x) => x.name === name)!;
    expect(p.exampleFile).toBeTruthy();
    const file = resolve(process.cwd(), 'public', p.exampleFile!.replace(/^\//, ''));
    const parsed = registry.parse(readFileSync(file, 'utf-8'), { filename: basename(file) }) as ParsedDataResult;

    expect(parsed?.parserName).toBe(name);
    expect(parsed.experimentData.technique).toBe(p.technique);
    const emitted = new Set<string>((parsed.experimentData.traits ?? []).map((t: { quantity: string }) => t.quantity));
    expect(emitted.size).toBeGreaterThan(0);
    const declared = new Set(p.generatedTraits.map((t) => t.value));
    expect([...emitted].filter((q) => !declared.has(q))).toEqual([]);
  });

  test('the CSV parser names quantities after the numeric columns', () => {
    const csv = 'Sample,Body mass (g),Wing length\nA,1.2,30\nB,1.4,31\nC,1.1,29\n';
    const parsed = registry.getByName('CSVFormatParser')!.parse(csv, { filename: 'x.csv' });
    const quantities = new Set(parsed.experimentData.traits.map((t: { quantity: string }) => t.quantity));
    expect([...quantities].sort()).toEqual(['body_mass_g', 'wing_length']);
  });
});
