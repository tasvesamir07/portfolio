let sitemapCache = null;
let sitemapCacheTimestamp = 0;
const ONE_HOUR_MS = 60 * 60 * 1000;

module.exports = {
    get: () => {
        if (sitemapCache && (Date.now() - sitemapCacheTimestamp < ONE_HOUR_MS)) {
            return sitemapCache;
        }
        return null;
    },
    set: (xml) => {
        sitemapCache = xml;
        sitemapCacheTimestamp = Date.now();
    },
    invalidate: () => {
        sitemapCache = null;
        sitemapCacheTimestamp = 0;
        console.log('[Sitemap-Cache] Sitemap cache invalidated.');
    }
};
