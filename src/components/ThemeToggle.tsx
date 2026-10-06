import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = resolvedTheme === 'dark';
  const themeLabel = isDark ? t('nav.lightMode') : t('nav.darkMode');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-full p-2 text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all duration-200 border border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-surface)] shadow-xs focus-ring cursor-pointer ${className}`}
      aria-label={themeLabel}
      title={themeLabel}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun size={15} className="text-[var(--color-accent)] transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon size={15} className="text-[var(--color-ink)] transition-transform duration-300 hover:-rotate-12" />
        )}
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-semibold tracking-wider uppercase text-[var(--color-ink)]">
          {themeLabel}
        </span>
      )}
    </button>
  );
}
