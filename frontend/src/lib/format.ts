/** Small display-formatting helpers shared by the canvas widgets' real-data wiring. */

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The dashboard's existing convention (see root CLAUDE.md): a null KPI value renders as "—", never a fake 0. */
export function formatMultiplier(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}×`;
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}
