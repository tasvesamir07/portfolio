let sitemapCache: string | null = null;
let sitemapCacheTimestamp: number = 0;
const ONE_HOUR_MS = 60 * 60 * 1000;

export const get = (): string | null => {
    if (sitemapCache && (Date.now() - sitemapCacheTimestamp < ONE_HOUR_MS)) {
        return sitemapCache;
    }
    return null;
};

export const set = (xml: string): void => {
    sitemapCache = xml;
    sitemapCacheTimestamp = Date.now();
};

export const invalidate = (): void => {
    sitemapCache = null;
    sitemapCacheTimestamp = 0;
    console.log('[Sitemap-Cache] Sitemap cache invalidated.');
};
