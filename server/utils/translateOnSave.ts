import { collectStrings } from './translationExtractor';
const { translateTexts } = require('../translate');

export const translateOnSave = async (table: string, body: any): Promise<void> => {
    if (!body || typeof body !== 'object') return;

    try {
        const stringsSet = new Set<string>();
        // Walk the request body to extract all translatable strings.
        // We use lang='bn' or any target language to collect the strings since extraction logic is independent of the target.
        Object.entries(body).forEach(([key, val]) => {
            collectStrings(val, key, stringsSet, 'bn');
        });

        const strings = Array.from(stringsSet);
        if (strings.length === 0) return;

        console.log(`[translateOnSave] Extracted ${strings.length} strings from saved row in table "${table}". Auto-translating in background...`);
        // Translate to target languages asynchronously.
        // Since translateTexts is async and saves immediately to Postgres, this works perfectly.
        await Promise.allSettled([
            translateTexts(strings, 'en').catch((e: Error) => console.error(`[translateOnSave] English translation error:`, e.message)),
            translateTexts(strings, 'bn').catch((e: Error) => console.error(`[translateOnSave] Bangla translation error:`, e.message)),
            translateTexts(strings, 'ko').catch((e: Error) => console.error(`[translateOnSave] Korean translation error:`, e.message))
        ]);
        console.log(`[translateOnSave] Completed background translation for table "${table}".`);
    } catch (err: any) {
        console.error(`[translateOnSave] Error translating content on save for table ${table}:`, err.message);
    }
};
