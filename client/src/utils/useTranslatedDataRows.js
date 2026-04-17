import { useState, useEffect, useRef } from 'react';
import { shouldRunLiveClientTranslation, translateText } from '../i18n/translator';

/**
 * useTranslatedDataRows
 * 
 * Translates simple string fields across an array of data rows.
 * 
 * @param {Array}  rows      - Array of data objects from API
 * @param {Array}  fields    - Array of field names to translate (e.g. ['degree', 'institution'])
 * @param {string} language  - Current language code
 * @returns {Array}          - Rows with translated field values
 * 
 * Example:
 *   const translated = useTranslatedDataRows(academics, ['degree', 'institution'], language);
 */
export const useTranslatedDataRows = (rows, fields, language, options = {}) => {
    const [translatedRows, setTranslatedRows] = useState(rows);
    const keyRef = useRef(null);
    const force = options?.force === true;

    useEffect(() => {
        if (!rows?.length || !fields?.length || (!force && !shouldRunLiveClientTranslation())) {
            setTranslatedRows(rows);
            return;
        }

        // Collect all (rowIndex, field, value) translation jobs
        const jobs = [];
        rows.forEach((row, ri) => {
            fields.forEach(field => {
                const val = typeof row[field] === 'string' ? row[field].trim() : null;
                if (val) jobs.push({ ri, field, text: val });
            });
        });

        if (!jobs.length) {
            setTranslatedRows(rows);
            return;
        }

        const key = `${language}::${JSON.stringify(jobs.map(j => j.text))}`;
        if (keyRef.current === key) return;
        keyRef.current = key;

        setTranslatedRows(rows); // Show originals while translating

        Promise.all(jobs.map(j => translateText(j.text, language)))
            .then(results => {
                const next = rows.map(r => ({ ...r }));
                results.forEach((result, idx) => {
                    const { ri, field } = jobs[idx];
                    next[ri][field] = result;
                });
                setTranslatedRows(next);
            })
            .catch(() => setTranslatedRows(rows));
    }, [language, JSON.stringify(rows?.map(r => fields.map(f => r[f]).join('|'))), force]);

    return translatedRows;
};
