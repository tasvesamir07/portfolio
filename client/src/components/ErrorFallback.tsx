// @ts-nocheck
import React, { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const { t } = useI18n();

  useEffect(() => {
    if (error) {
      const url = window.location.href;
      const userAgent = navigator.userAgent;
      
      fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || String(error),
          stack: error.stack,
          url,
          userAgent
        })
      }).catch(err => console.error('Failed to report client error:', err));
    }
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 text-center bg-[#fcfaf7] py-16">
      <h2 className="text-xl font-bold text-[#0b3b75] mb-2">
        {t('error.somethingWrong') || 'Something went wrong.'}
      </h2>
      <p className="text-gray-600 mb-4 text-sm">{error?.message || 'Unknown error'}</p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-lg bg-[#0b3b75] px-4 py-2 text-sm text-white font-semibold cursor-pointer hover:bg-black transition-colors"
      >
        {t('error.tryAgain') || 'Try Again'}
      </button>
    </div>
  );
};

export default ErrorFallback;
