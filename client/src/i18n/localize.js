export const getLocalizedField = (record, baseKey, language, fallback = '') => {
    if (!record) return fallback;

    // Prioritize specifically localized table columns (e.g. bio_text_ko) if they exist and are populated
    const langKey = `${baseKey}_${language}`;
    if (record[langKey] !== undefined && record[langKey] !== null && record[langKey] !== '') {
        return record[langKey];
    }

    // Next, check the baseKey (The server may provide translated base fields in some scenarios)
    if (record[baseKey] !== undefined && record[baseKey] !== null && record[baseKey] !== '') {
        return record[baseKey];
    }

    // Final fallback to English key if it exists
    const enKey = `${baseKey}_en`;
    if (record[enKey] !== undefined && record[enKey] !== null && record[enKey] !== '') {
        return record[enKey];
    }

    return fallback;
};

export const getLocalizedFirstField = (record, baseKeys, language, fallback = '') => {
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
    research: 'nav.research',
    publications: 'nav.publications',
    gallery: 'nav.gallery',
    contact: 'nav.contact',
    blog: 'nav.blog'
};

export const normalizeLabel = (value = '') =>
    value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

export const getLocalizedNavName = (item, language, t) => {
    if (!item) return '';

    // Try only the current language's specific field (no cross-language fallback)
    const langKey = `name_${language}`;
    if (item?.[langKey]) return item[langKey];

    // Then check if the base name matches a localized label
    const translationKey = knownNavLabelKeys[normalizeLabel(item?.name)];
    if (translationKey) return t(translationKey);

    // Fall back to raw name
    return item?.name || '';
};
