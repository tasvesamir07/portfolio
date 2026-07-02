import React from 'react';
import { useI18n } from '../i18n/I18nContext';

const RouteFallback = () => {
    const { t } = useI18n();

    return (
        <div className="min-h-[40vh] flex items-center justify-center px-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#0b3b75]">
            {t('app.loading') || 'Loading...'}
        </div>
    );
};

export default RouteFallback;
