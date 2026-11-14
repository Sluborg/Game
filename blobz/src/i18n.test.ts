import { beforeEach, describe, expect, it } from 'vitest';
import { detectLang, KEYS, lang, lookName, setLang, t } from './i18n';

describe('i18n (Swedish + English UI)', () => {
  beforeEach(() => setLang('sv'));

  it('first run: sv* browsers get Swedish, everything else English', () => {
    expect(detectLang('sv-SE')).toBe('sv');
    expect(detectLang('sv')).toBe('sv');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang('nb-NO')).toBe('en');
    expect(detectLang('')).toBe('en');
  });

  it('t() picks the current language and fills {vars}', () => {
    expect(t('build.goal', { name: 'Brunn' })).toBe('Bygg Brunn vid huset');
    setLang('en');
    expect(lang()).toBe('en');
    expect(t('build.goal', { name: 'Well' })).toBe('Build Well at the house');
    expect(t('join.roomAria', { name: 'Ada', n: 2, max: 5 })).toBe('Join Ada, 2 of 5');
  });

  it('every key has English text without Swedish letters (å ä ö)', () => {
    setLang('en');
    for (const k of KEYS) {
      expect(t(k), k).not.toBe(k);
      expect(t(k), k).not.toMatch(/[åäöÅÄÖ]/);
    }
  });

  it('designer names: English list in English, blob.ts name in Swedish', () => {
    expect(lookName('hat', 1, 'Krona')).toBe('Krona');
    setLang('en');
    expect(lookName('hat', 1, 'Krona')).toBe('Crown');
    expect(lookName('hat', 99, 'Ny hatt')).toBe('Ny hatt'); // a hat Art adds later falls back
  });
});
