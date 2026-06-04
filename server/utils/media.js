const { deleteManagedMediaFiles } = require('../upload');

const cleanMediaUrls = async (urls = []) => {
    const failures = await deleteManagedMediaFiles(urls);
    if (failures.length) {
        console.warn('Managed media cleanup warnings:', failures.join(' | '));
    }
};

const diffRemovedMediaUrls = (previousUrls = [], nextUrls = []) => {
    const normalizedNextUrls = new Set((nextUrls || []).filter(Boolean));
    return [...new Set((previousUrls || []).filter((url) => url && !normalizedNextUrls.has(url)))];
};

module.exports = {
    cleanMediaUrls,
    diffRemovedMediaUrls
};
