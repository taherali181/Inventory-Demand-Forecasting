import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from './cn';
import { useTheme, THEMES } from '../../theme';

/*
 * The only entry point to light mode.
 *
 * src/theme.js has existed with zero importers, which meant the light half of
 * tokens.css was unreachable from the UI. This is a 3-way segmented control
 * rather than a 2-state toggle because 'system' is a real, distinct choice —
 * collapsing it into "light/dark" silently strands anyone whose OS flips at
 * sunset.
 *
 * Each segment is its own <button> with a real accessible name, so the whole
 * control is reachable by keyboard and announced correctly; `aria-pressed`
 * carries the current selection.
 */

const OPTIONS = {
  light: { icon: Sun, label: 'Light theme' },
  dark: { icon: Moon, label: 'Dark theme' },
  system: { icon: Monitor, label: 'System theme' },
};

export function ThemeToggle({ className, compact = false }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    // Collapsed sidebar / tight chrome: cycle through the same three states
    // from one button instead of showing a segmented control.
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    const Icon = OPTIONS[theme]?.icon ?? Monitor;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Theme: ${theme}. Switch to ${next}.`}
        title={`Theme: ${theme}`}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline',
          'bg-surface text-content-secondary transition-colors duration-150',
          'hover:bg-surface-2 hover:text-content',
          className
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-hairline bg-surface p-0.5',
        className
      )}
    >
      {THEMES.map((value) => {
        const { icon: Icon, label } = OPTIONS[value];
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150',
              isActive
                ? 'bg-surface-2 text-content shadow-sm'
                : 'bg-transparent text-content-muted hover:text-content-secondary'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
