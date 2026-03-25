import { resources } from '../../i18n/translations';

function flatKeys(obj: Record<string, any>): string[] {
  return Object.keys(obj).sort();
}

describe('translations completeness', () => {
  const frKeys = flatKeys(resources.fr.translation);
  const enKeys = flatKeys(resources.en.translation);
  const zhKeys = flatKeys(resources.zh.translation);

  it('en has the same keys as fr', () => {
    const missingInEn = frKeys.filter(k => !enKeys.includes(k));
    const extraInEn = enKeys.filter(k => !frKeys.includes(k));
    expect(missingInEn).toEqual([]);
    expect(extraInEn).toEqual([]);
  });

  it('zh has the same keys as fr', () => {
    const missingInZh = frKeys.filter(k => !zhKeys.includes(k));
    const extraInZh = zhKeys.filter(k => !frKeys.includes(k));
    expect(missingInZh).toEqual([]);
    expect(extraInZh).toEqual([]);
  });

  it('no key has empty string value in any language (except known suffix keys)', () => {
    // Keys intentionally empty (e.g. suffix keys used for concatenation)
    const ALLOWED_EMPTY = new Set(['aboutCreatedBySuffix']);
    const emptyKeys: string[] = [];
    const languages = ['fr', 'en', 'zh'] as const;
    for (const lang of languages) {
      const translation = resources[lang].translation as Record<string, string>;
      for (const [key, value] of Object.entries(translation)) {
        if (value === '' && !ALLOWED_EMPTY.has(key)) emptyKeys.push(`${lang}.${key}`);
      }
    }
    expect(emptyKeys).toEqual([]);
  });

  it('every value is a string', () => {
    const nonStrings: string[] = [];
    const languages = ['fr', 'en', 'zh'] as const;
    for (const lang of languages) {
      const translation = resources[lang].translation as Record<string, any>;
      for (const [key, value] of Object.entries(translation)) {
        if (typeof value !== 'string') nonStrings.push(`${lang}.${key} (${typeof value})`);
      }
    }
    expect(nonStrings).toEqual([]);
  });

  it('has at least 100 translation keys', () => {
    expect(frKeys.length).toBeGreaterThan(100);
  });
});
