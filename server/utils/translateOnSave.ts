import { collectStrings } from './translationExtractor';
import logger = require('./logger');
const { translateTexts } = require('../translate');

export const translateOnSave = async (table: string, body: any): Promise<void> => {
    if (process.env.NODE_ENV === 'test') return;
    if (!body || typeof body !== 'object') return;

    try {
        const stringsSet = new Set<string>();
        // Walk the request body to extract all translatable strings.
        // We use lang='bn' or any target language to collect the strings since extraction logic is independent of the target.
        collectStrings(body, '', stringsSet, 'bn');

        const strings = Array.from(stringsSet);
        if (!strings.length) return;

        logger.info(`[translateOnSave] Extracted ${strings.length} strings from saved row in table "${table}". Auto-translating in background...`);

        // Translate to target languages asynchronously.
        // Since translateTexts is async and saves immediately to Postgres, this works perfectly.
        await Promise.allSettled([
            translateTexts(strings, 'en').catch((e: Error) => logger.error({ err: e }, '[translateOnSave] English translation error')),
            translateTexts(strings, 'bn').catch((e: Error) => logger.error({ err: e }, '[translateOnSave] Bangla translation error')),
            translateTexts(strings, 'ko').catch((e: Error) => logger.error({ err: e }, '[translateOnSave] Korean translation error'))
        ]);
        logger.info(`[translateOnSave] Completed background translation for table "${table}".`);
    } catch (err: unknown) {
        logger.error({ err }, `[translateOnSave] Error translating content on save for table ${table}`);
    }
};
