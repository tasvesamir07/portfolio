const { deleteManagedMediaFiles } = require('../upload') as typeof import('../upload');

export const cleanMediaUrls = async (urls: string[] = []): Promise<void> => {
    const failures: string[] = await deleteManagedMediaFiles(urls);
    if (failures.length) {
        console.warn('Managed media cleanup warnings:', failures.join(' | '));
    }
};

export const diffRemovedMediaUrls = (previousUrls: string[] = [], nextUrls: string[] = []): string[] => {
    const normalizedNextUrls = new Set((nextUrls || []).filter(Boolean));
    return [...new Set((previousUrls || []).filter((url: string) => url && !normalizedNextUrls.has(url)))];
};
