import { describe, expect, it } from 'vitest';

import { STRINGS, interpolate, stringFor, stringsFor, type StringKey } from './strings';

/** Sorted "{token}" names a template carries, e.g. "duplicates,malformed,running". */
const tokens = (template: string) =>
  [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('STRINGS parity', () => {
  it('bn carries every en key (compile-enforced; runtime-checked)', () => {
    expect(Object.keys(STRINGS.bn).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });

  it('every key carries the same {tokens} in both languages', () => {
    for (const key of Object.keys(STRINGS.en) as StringKey[]) {
      expect(tokens(STRINGS.bn[key]), key).toBe(tokens(STRINGS.en[key]));
    }
  });
});

describe('interpolate', () => {
  it('substitutes numbers and strings', () => {
    expect(interpolate('{n} work blocks', { n: 3 })).toBe('3 work blocks');
    expect(interpolate('Last export: {date}', { date: 'Jul 12, 2026' })).toBe(
      'Last export: Jul 12, 2026',
    );
  });

  it('substitutes several tokens in one pass', () => {
    expect(
      interpolate('Skipped {duplicates} duplicates, {running} running.', {
        duplicates: 2,
        running: 1,
      }),
    ).toBe('Skipped 2 duplicates, 1 running.');
  });

  it('leaves a missing param literal rather than throwing', () => {
    expect(interpolate('{n} sessions', {})).toBe('{n} sessions');
    expect(interpolate('{n} sessions', { other: 1 })).toBe('{n} sessions');
  });

  it('returns the template untouched without params', () => {
    expect(interpolate('Plain {not} expanded')).toBe('Plain {not} expanded');
  });
});

describe('stringFor', () => {
  it('localizes and interpolates in one call', () => {
    expect(stringFor('en', 'nBlocks', { n: 3 })).toBe('3 work blocks');
    expect(stringFor('bn', 'nBlocks', { n: 3 })).toBe('3টি কাজের ব্লক');
    expect(stringFor('en', 'noBlocks')).toBe('No work blocks yet');
  });
});

describe('stringsFor', () => {
  it('hands the whole dictionary to non-React callers', () => {
    expect(stringsFor('bn').checkIn).toBe('চেক ইন');
    expect(stringsFor('en').checkIn).toBe('Check in');
  });
});
