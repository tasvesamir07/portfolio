type RecordWithStringKeys = Record<string, unknown>;

export const getLocalizedField = (record: RecordWithStringKeys | null | undefined, baseKey: string, language: string, fallback = ''): string => {
  if (!record) return fallback;

  const langKey = `${baseKey}_${language}`;
  if (record[langKey] !== undefined && record[langKey] !== null && record[langKey] !== '') {
    return String(record[langKey]);
  }

  if (record[baseKey] !== undefined && record[baseKey] !== null && record[baseKey] !== '') {
    return String(record[baseKey]);
  }

  const enKey = `${baseKey}_en`;
  if (record[enKey] !== undefined && record[enKey] !== null && record[enKey] !== '') {
    return String(record[enKey]);
  }

  return fallback;
};

export const getLocalizedFirstField = (record: RecordWithStringKeys | null | undefined, baseKeys: string[], language: string, fallback = ''): string => {
  for (const baseKey of baseKeys) {
    const value = getLocalizedField(record, baseKey, language);
    if (value && value !== '[]' && value !== '[ ]') return value;
  }
  return fallback;
};


const knownNavLabelKeys = {
    home: 'nav.home',
    'personal profile': 'nav.personalProfile',
    education: 'nav.education',
    experiences: 'nav.experiences',
    'research interests': 'nav.researchInterests',
    publications: 'nav.publications',
    conferences: 'nav.conferences',
    gallery: 'nav.gallery',
    contact: 'nav.contact',
    blog: 'nav.blog',
    newspaper: 'nav.newspaper',
    'anon. message': 'nav.anonymousMessage',
    more: 'nav.more'
};

export const normalizeLabel = (value = ''): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const getLocalizedNavName = (item: Record<string, unknown> | null | undefined, language: string, t: (key: string) => string): string => {
  if (!item) return '';

  const langKey = `name_${language}`;
  let resolvedName = '';

  if (item?.[langKey]) {
    resolvedName = String(item[langKey]);
  } else {
    const normalized = normalizeLabel(String(item?.name ?? ''));
    const translationKey = knownNavLabelKeys[normalized as keyof typeof knownNavLabelKeys];
    if (translationKey) {
      resolvedName = t(translationKey);
    } else {
      resolvedName = String(item?.name ?? '');
    }
  }

  return resolvedName.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, ' ').trim();
};

const BANGLA_NUMERALS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const localizeNumbers = (value: string | number | null | undefined, language: string): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (language !== 'bn') return str;
  return str.replace(/[0-9]/g, (digit) => BANGLA_NUMERALS[parseInt(digit, 10)] || digit);
};
