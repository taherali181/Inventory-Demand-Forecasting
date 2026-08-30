import { IconButton, cn, laserLineBorder } from '../../ui';

/**
 * CanvasPanelHeader — Layer 3 Group A. ChatWithCanvas.dc.html's canvas-panel header, verbatim:
 *
 *   header  height:56px; flex; align-items:center; justify-content:space-between; padding:0 20px;
 *           border-bottom:2px solid {{accent}}; border-image:linear-gradient(90deg,transparent,
 *           rgba({{accentRgb}},.9),transparent) 1;
 *           — this is the LaserLine BORDER form (see ui/LaserLine.tsx): applied as the `laserLineBorder`
 *           (`.laser-line`) class on the header element itself, not a child div.
 *   tabs    left group, gap:4px. `.tab` (index.css, already written): padding:7px 12px; radius:--r-sm;
 *           mono 11.5px/600; letter-spacing:.03em; uppercase; color:--text-3; border-bottom:1.5px solid
 *           transparent. Active tab (source shows "Alerts" active): adds color:{{accent}} +
 *           border-bottom-color:{{accent}} — done here as `text-accent border-b-accent` (directional
 *           color utility, so it never fights the base class's other-side borders).
 *   icons   right group, gap:6px. Two 28px IconButtons (`fill="none"`, default muted color = --text-3,
 *           matching the source's unstyled `color:var(--text-3)` on both):
 *             expand  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
 *                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
 *                       <path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6"/></svg>
 *             close   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
 *                     stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
 *                     (source's close icon has no stroke-linejoin attribute — kept faithful, not added).
 *
 * Tab order is fixed per the design brief: Alerts, Reorder, Forecast. `activeTab`/`onTabChange` are
 * controlled — no internal state — so Package 5's shell can drive it from ShellState.canvas.tab.
 */

export type CanvasPanelTab = 'alerts' | 'reorder' | 'forecast';

const TABS: Array<{ value: CanvasPanelTab; label: string }> = [
  { value: 'alerts', label: 'Alerts' },
  { value: 'reorder', label: 'Reorder' },
  { value: 'forecast', label: 'Forecast' },
];

export interface CanvasPanelHeaderProps {
  activeTab: CanvasPanelTab;
  onTabChange?: (tab: CanvasPanelTab) => void;
  onExpand?: () => void;
  onClose?: () => void;
  className?: string;
}

export function CanvasPanelHeader({
  activeTab,
  onTabChange,
  onExpand,
  onClose,
  className,
}: CanvasPanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center justify-between px-5',
        laserLineBorder,
        className
      )}
    >
      <div className="flex gap-1">
        {TABS.map(({ value, label }) => {
          const isActive = value === activeTab;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn('tab border-none bg-transparent cursor-pointer', isActive && 'text-accent border-b-accent')}
              onClick={() => onTabChange?.(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        <IconButton aria-label="Expand canvas" size={28} fill="none" onClick={onExpand}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" />
          </svg>
        </IconButton>
        <IconButton aria-label="Close canvas" size={28} fill="none" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}
