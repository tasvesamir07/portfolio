import dotenv = require('dotenv');
import path = require('path');

// Initialize environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import db = require('../db');
const { translateTexts } = require('../translate');
import crypto = require('crypto');

const CONFIG = [
  { table: 'about', columns: ['name', 'title', 'location', 'bio_text', 'sub_bio', 'custom_nav', 'custom_sidebar_order'] },
  { table: 'pages', columns: ['title', 'content', 'details_json'] },
  { table: 'academics', columns: ['institution', 'degree', 'details_json'] },
  { table: 'experiences', columns: ['company', 'position', 'location', 'description', 'details_json'] },
  { table: 'trainings', columns: ['title', 'topic', 'instructor', 'details_json'] },
  { table: 'skills', columns: ['category', 'items', 'details_json'] },
  { table: 'research_interests', columns: ['interest', 'details', 'details_json'] },
  { table: 'research', columns: ['title', 'description', 'status', 'details_json'] },
  { table: 'publications', columns: ['title', 'journal_name', 'authors', 'introduction', 'methods', 'details_json'] },
  { table: 'gallery', columns: ['caption'] },
  { table: 'gallery_categories', columns: ['name'] },
  { table: 'newspapers', columns: ['title', 'short_description'] }
];

const SKIP_TRANSLATION_KEYS = new Set([
    'id', 'slug', 'path', 'url', 'link', 'link_url', 'file_url', 'image_url', 'logo_url',
    'hero_image_url', 'resume_url', 'thumbnail_url', 'icon_name', 'color_class',
    'created_at', 'updated_at', 'sort_order', 'show_in_nav', 'token', 'password_hash',
    'custom_nav', 'custom_sidebar_order'
]);

const HTML_REGEX = /<[a-z][\s\S]*>/i;
const URLISH_REGEX = /^(https?:\/\/|mailto:|tel:|data:|\/uploads\/)/i;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_TRANSLATABLE_SYMBOLIC_REGEX = /^[\d\s.,:/()\-+%]+$/;
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

const isLikelyAlreadyInTargetLanguage = (value = '', language = 'en'): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return true;

    const hasBangla = BANGLA_REGEX.test(trimmed);
    const hasHangul = HANGUL_REGEX.test(trimmed);
    const hasLatin = /[A-Za-z]/.test(trimmed);

    if (language === 'bn') {
        return hasBangla && !hasHangul && !hasLatin;
    }
    if (language === 'ko') {
        return hasHangul && !hasBangla;
    }
    return !hasBangla && !hasHangul;
};

const shouldSkipStringTranslation = (key = '', value = '', language = 'en'): boolean => {
    if (!value || !value.trim()) return true;
    if (SKIP_TRANSLATION_KEYS.has(key) || key.endsWith('_url')) return true;
    const localizedSuffixMatch = key.match(/_(en|bn|ko)$/i);
    if (localizedSuffixMatch) {
        const keyLanguage = localizedSuffixMatch[1].toLowerCase();
        if (keyLanguage !== language) return true;
    }
    if (URLISH_REGEX.test(value.trim())) return true;
    if (EMAIL_REGEX.test(value.trim())) return true;
    if (NON_TRANSLATABLE_SYMBOLIC_REGEX.test(value.trim())) return true;
    if (isLikelyAlreadyInTargetLanguage(value, language)) return true;
    return false;
};

const looksLikeStructuredJson = (value = '', key = ''): boolean => {
    if (!value || !value.trim().startsWith('[')) return false;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
    } catch {
        return false;
    }
};

const collectStrings = (value: unknown, key = '', collected = new Set<string>(), lang = 'bn'): void => {
    if (value == null || SKIP_TRANSLATION_KEYS.has(key) || (typeof key === 'string' && key.endsWith('_url'))) {
        return;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && !shouldSkipStringTranslation(key, trimmed, lang)) {
            if (looksLikeStructuredJson(trimmed, key)) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item: any) => {
                            if (!item || typeof item !== 'object') return;
                            if (typeof item.title === 'string' && item.title.trim() && !shouldSkipStringTranslation(key, item.title.trim(), lang)) {
                                collected.add(item.title.trim());
                            }
                            if (typeof item.text === 'string' && item.text.trim()) {
                                if (HTML_REGEX.test(item.text)) {
                                    const segments = item.text.split(/(<[^>]+>)/g);
                                    segments.forEach((segment: string) => {
                                        if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), lang)) {
                                            collected.add(segment.trim());
                                        }
                                    });
                                } else if (!shouldSkipStringTranslation(key, item.text.trim(), lang)) {
                                    collected.add(item.text.trim());
                                }
                            }
                            if (typeof item.value === 'string' && item.value.trim()) {
                                if (HTML_REGEX.test(item.value)) {
                                    const segments = item.value.split(/(<[^>]+>)/g);
                                    segments.forEach((segment: string) => {
                                        if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), lang)) {
                                            collected.add(segment.trim());
                                        }
                                    });
                                } else if (!shouldSkipStringTranslation(key, item.value.trim(), lang)) {
                                    collected.add(item.value.trim());
                                }
                            }
                            if (Array.isArray(item.values)) {
                                item.values.forEach((v: any) => {
                                    if (typeof v === 'string' && v.trim()) {
                                        if (HTML_REGEX.test(v)) {
                                            const segments = v.split(/(<[^>]+>)/g);
                                            segments.forEach((segment: string) => {
                                                if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), lang)) {
                                                    collected.add(segment.trim());
                                                }
                                            });
                                        } else if (!shouldSkipStringTranslation(key, v.trim(), lang)) {
                                            collected.add(v.trim());
                                        }
                                    }
                                });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            } else if (HTML_REGEX.test(trimmed)) {
                const segments = trimmed.split(/(<[^>]+>)/g);
                segments.forEach((segment: string) => {
                    if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), lang)) {
                        collected.add(segment.trim());
                    }
                });
            } else {
                collected.add(trimmed);
            }
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((entry) => collectStrings(entry, key, collected, lang));
        return;
    }

    if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
            collectStrings(entryValue, entryKey, collected, lang);
        });
    }
};

const getHash = (text: string, lang: string): string => {
    return crypto.createHash('sha256')
        .update(text + lang)
        .digest('hex');
};

const main = async () => {
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const langArg = args.find(a => a.startsWith('--lang='));
    const targetLanguages = langArg ? [langArg.split('=')[1]] : ['bn', 'ko'];

    for (const lang of targetLanguages) {
        console.log(`\n[Translate-All] Starting extraction of translatable strings for language: ${lang}...`);

        const allStrings = new Set<string>();

        for (const entry of CONFIG) {
            try {
                const tableCheck = await db.query(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                    [entry.table]
                );
                if (!tableCheck.rows[0]?.exists) {
                    continue;
                }

                const columnsToSelect = entry.columns.join(', ');
                const queryResult = await db.query(`SELECT ${columnsToSelect} FROM ${entry.table}`);
                
                for (const row of queryResult.rows) {
                    entry.columns.forEach(col => {
                        const val = row[col];
                        collectStrings(val, col, allStrings, lang);
                    });
                }
            } catch (err: any) {
                console.warn(`[Translate-All] Failed to extract from table ${entry.table}:`, err.message);
            }
        }

        console.log(`[Translate-All] Extracted ${allStrings.size} unique translatable strings for ${lang}.`);
        
        let missingTexts: string[] = [];

        if (force) {
            missingTexts = Array.from(allStrings);
        } else {
            // Query DB to see what hashes exist
            try {
                const dbResults = await db.query(
                    'SELECT source_hash FROM translations WHERE target_lang = $1',
                    [lang]
                );
                const existingHashes = new Set<string>(dbResults.rows.map((row: any) => row.source_hash));
                
                for (const text of allStrings) {
                    const hash = getHash(text, lang);
                    if (!existingHashes.has(hash)) {
                        missingTexts.push(text);
                    }
                }
            } catch (err: any) {
                console.error(`[Translate-All] Failed checking existing translations in DB for ${lang}:`, err.message);
                missingTexts = Array.from(allStrings);
            }
        }

        if (missingTexts.length === 0) {
            console.log(`[Translate-All] All strings are already translated/cached for language: ${lang}`);
            continue;
        }

        console.log(`[Translate-All] Translating ${missingTexts.length} missing strings for language: ${lang}`);

        const BATCH_SIZE = 50;
        let translatedCount = 0;
        const startTime = Date.now();

        for (let i = 0; i < missingTexts.length; i += BATCH_SIZE) {
            const batch = missingTexts.slice(i, i + BATCH_SIZE);
            try {
                await translateTexts(batch, lang);
            } catch (err: any) {
                console.error(`[Translate-All] Batch translation error:`, err.message);
            }
            
            translatedCount += batch.length;

            const elapsedMs = Date.now() - startTime;
            const rate = translatedCount / (elapsedMs / 1000); // strings per second
            const remaining = missingTexts.length - translatedCount;
            const etaSeconds = rate > 0 ? Math.round(remaining / rate) : 0;

            const percent = ((translatedCount / missingTexts.length) * 100).toFixed(1);
            console.log(`[Translate-All] ${translatedCount} / ${missingTexts.length} unique strings (${percent}%) — ETA ${etaSeconds}s`);
        }
    }

    console.log('\n[Translate-All] Bulk translation run completed successfully.');
};

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[Translate-All] Fatal error:', err);
        process.exit(1);
    });
