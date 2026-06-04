import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

const NotFound = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-[#fcfaf7] py-20">
      <div className="max-w-md w-full bg-white border border-[#eae5dd] rounded-2xl shadow-xl p-10 flex flex-col items-center transition-all duration-300 hover:shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-[#f6f1ea] flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 text-[#0b3b75]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-7xl font-black text-[#0b3b75] mb-2 tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-3">
          {t('error.pageNotFound') || 'Page Not Found'}
        </h2>
        <p className="text-gray-600 mb-8 text-sm leading-relaxed">
          {t('dynamicPage.notFoundDescription') || "The page you're looking for doesn't exist."}
        </p>
        <Link
          to="/"
          className="w-full rounded-xl bg-[#0b3b75] hover:bg-[#082a54] text-white px-6 py-3.5 text-sm font-bold shadow-lg shadow-blue-900/10 hover:shadow-xl hover:shadow-blue-900/20 active:scale-[0.98] transition-all duration-200"
        >
          {t('error.backToHome') || 'Back to Home'}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
