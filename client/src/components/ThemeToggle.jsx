import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#ceb079]/70 bg-white/10 text-white outline-none transition-all hover:bg-white/15 focus:border-[#ceb079] focus:bg-white/15 cursor-pointer ${className}`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
        >
            {theme === 'dark' ? (
                <Sun size={20} className="text-[#ceb079]" />
            ) : (
                <Moon size={20} className="text-white" />
            )}
        </button>
    );
};

export default ThemeToggle;
