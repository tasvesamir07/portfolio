/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import api from '../api';
import { showSiteAlert } from '../utils/siteAlerts';
import { clearTranslationCache } from '../i18n/translator';

const TranslateAllButton = () => {
    const [progress, setProgress] = useState({ current: 0, total: 0, lang: '', done: false });
    const [running, setRunning] = useState(false);

    const handleTranslateAll = async () => {
        if (running) return;
        setRunning(true);
        const languages = ['en', 'bn', 'ko'];

        try {
            for (const lang of languages) {
                let done = false;
                setProgress({ current: 0, total: 0, lang, done: false });

                while (!done) {
                    const res = await api.post('/translate/run-batch', { lang, batchSize: 200 });
                    setProgress(res.data);
                    done = res.data.done;

                    // Smooth delay to guarantee visibility of progress steps and states
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }

            showSiteAlert({ message: 'All translations completed successfully!', type: 'success' });
            clearTranslationCache();
            window.location.reload();
        } catch (err: any) {
            console.error('Batch translation failed:', err);
            showSiteAlert({ message: 'Failed to run batch translations', type: 'error' });
        } finally {
            setRunning(false);
        }
    };

    const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <button
            onClick={handleTranslateAll}
            disabled={running}
            className={`flex items-center justify-center gap-2.5 w-full px-5 py-3 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border ${
                running
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-white border-gray-200 hover:border-[#0b3b75] hover:bg-[#0b3b75]/5 text-gray-700 hover:text-[#0b3b75]'
            }`}
        >
            {running ? (
                <>
                    <Loader2 size={14} className="animate-spin text-amber-600 shrink-0" />
                    <span className="truncate">
                        Translating {progress.lang.toUpperCase()}... {progress.current}/{progress.total} ({percent}%)
                    </span>
                </>
            ) : (
                <>
                    <Languages size={14} className="shrink-0" />
                    <span>Translate All Content</span>
                </>
            )}
        </button>
    );
};

export default TranslateAllButton;
