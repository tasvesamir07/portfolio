import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border border-[#ceb079]/70 bg-white/10 text-[#ceb079] hover:bg-white/15 outline-none transition-all focus:border-[#ceb079] focus:bg-white/15 cursor-pointer ${className}`.trim()}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
            {theme === 'light' ? <Moon size={18} className="text-white" /> : <Sun size={18} className="text-[#ceb079]" />}
        </button>
    );
};

export default ThemeToggle;
