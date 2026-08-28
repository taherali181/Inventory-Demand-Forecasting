import { useMemo } from 'react';
import { useTheme } from '../theme';

/*
 * Bridge between the CSS token layer and recharts.
 *
 * recharts needs literal color strings — it cannot consume a Tailwind class or
 * an unresolved `var()` for canvas-drawn elements. So we read the custom
 * properties off <html> at render time and wrap them back into rgb().
 *
 * Tokens are stored as space-separated RGB channels ("99 102 241"), which is
 * what lets `rgb(<channels> / <alpha>)` work — see src/styles/tokens.css.
 */

function readToken(name, alpha) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return undefined;
    return alpha === undefined ? `rgb(${raw})` : `rgb(${raw} / ${alpha})`;
  } catch {
    return undefined;
  }
}

/**
 * Chart colors for the CURRENT theme.
 *
 * Keyed on `resolvedTheme` so the memo recomputes when the user toggles — the
 * custom properties change underneath us and a stale memo would leave a dark
 * chart painted with light-theme axes.
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();

  return useMemo(
    () => ({
      grid: readToken('--border'),
      axis: readToken('--text-muted'),
      surface: readToken('--surface'),
      border: readToken('--border'),
      text: readToken('--text'),
      textMuted: readToken('--text-muted'),
      cursor: readToken('--text', 0.06),
      series: [
        readToken('--accent'),
        readToken('--info'),
        readToken('--good'),
        readToken('--warn'),
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedTheme]
  );
}

/**
 * Shared recharts props. Spread onto CartesianGrid / XAxis / YAxis so every
 * chart in the app reads as one system instead of each restating hex values.
 */
export function chartAxisProps(t) {
  return {
    stroke: t.axis,
    tick: { fontSize: 11, fill: t.textMuted },
    tickLine: false,
    axisLine: { stroke: t.grid },
  };
}

export function chartGridProps(t) {
  return { strokeDasharray: '3 3', stroke: t.grid, vertical: false };
}

/**
 * Tooltip styling. recharts' default is a hardcoded white box, which floating
 * over a dark chart is one of the most visible "unfinished" tells there is.
 */
export function chartTooltipProps(t) {
  return {
    contentStyle: {
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      color: t.text,
      fontSize: 12,
      boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.25)',
    },
    labelStyle: { color: t.textMuted, fontSize: 11, marginBottom: 4 },
    itemStyle: { color: t.text, fontSize: 12 },
    cursor: { fill: t.cursor },
  };
}
