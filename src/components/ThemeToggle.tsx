import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-full p-2 text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all duration-200 border border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-surface)] shadow-xs focus-ring cursor-pointer ${className}`}
      aria-label={isDark ? 'Switch to light boutique theme' : 'Switch to dark evening theme'}
      title={isDark ? 'Switch to light boutique theme' : 'Switch to dark evening theme'}
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
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
