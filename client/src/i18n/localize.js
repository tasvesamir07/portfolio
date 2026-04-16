export const getLocalizedField = (record, baseKey, language, fallback = '') => {
    if (!record) return fallback;

    // The server now provides translated base fields (e.g. name is already translated to Korean)
    // We prioritize the baseKey itself.
    if (record[baseKey] !== undefined && record[baseKey] !== null && record[baseKey] !== '') {
        return record[baseKey];
    }

    // Fallback for any legacy keys if they somehow still exist in cached responses
    const legacyKeys = [`${baseKey}_${language}`, `${baseKey}_en`].filter(k => k !== baseKey);
    for (const key of legacyKeys) {
        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
            return record[key];
        }
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
