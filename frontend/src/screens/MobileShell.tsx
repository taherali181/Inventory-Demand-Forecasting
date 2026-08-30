import { LaserLine, SeverityIcon } from '../components/ui';
import { MobileTopBar, useShell } from '../components/shell';
import { useMobileAlertsData } from '../hooks/useMobileAlertsData';
import { avatarInitials } from '../lib/userDisplay';

/**
 * MobileShell — Layer 4, Mobile.dc.html. Its own composed screen below the ~768px breakpoint (design
 * brief: "hamburger + bottom-sheet mobile shell", "its own component, NOT a responsive resize" — that
 * rule is about MobileTopBar specifically, but the same reasoning applies to this whole screen).
 *
 * DELIBERATE SIMPLIFICATION: Mobile.dc.html has no chat input dock at all — it's a read-only "here's what
 * happened, tap to see the alerts sheet" screen, not a place to type a new question. Rather than reusing
 * the live desktop `ShellState.messages` (which would require a mobile-sized ChatInputDock variant that no
 * mockup shows, and would desync from what the bottom sheet below is actually summarizing), this screen
 * shows the mockup's own fixed two-message exchange (copy only — the alert rows below them are real data
 * from `useMobileAlertsData`, not the mockup's hardcoded three). `mobileSheetOpen` (ShellState) still
 * drives whether the dimmed-chat + scrim + bottom sheet is showing — the hamburger toggles it, `Escape`
 * closes it (already wired in ShellContext), same interaction model as everywhere else in the app.
 *
 * Two flagged, deliberate mockup inconsistencies preserved here (design brief, "build literally, do not
 * fix"): no `.hud-bg` texture anywhere on this screen, and the bottom sheet's laser-line is the FILLED-DIV
 * variant (a plain 2px gradient bar), not a border, per `LaserLine`'s two forms.
 */

export function MobileShell() {
  const { state, dispatch } = useShell();
  const sheetOpen = state.mobileSheetOpen;
  const { alerts } = useMobileAlertsData();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        background: 'rgb(var(--canvas))',
        color: 'rgb(var(--text))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <MobileTopBar
        workspaceLabel="Acme Warehousing"
        // Real initials, matching what IconRail shows on desktop — the mockup's fixed "TA" was a
        // placeholder, and leaving it here would have mobile disagree with desktop about who's signed in.
        avatarInitials={avatarInitials(state.user)}
        onMenuClick={() => dispatch({ type: 'SET_MOBILE_SHEET', open: !sheetOpen })}
      />

      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            filter: sheetOpen ? 'brightness(.5)' : undefined,
          }}
        >
          <div className="flex justify-end">
            <div
              className="bg-surface-2 font-sans"
              style={{
                maxWidth: 240,
                padding: '10px 13px',
                fontSize: '13.5px',
                lineHeight: 1.5,
                borderRadius: 'var(--r-lg) var(--r-lg) 2px var(--r-lg)',
              }}
            >
              Any alerts I should look at today?
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 8 }}>
            <div className="flex items-center" style={{ gap: 6 }}>
              <div style={{ width: 4, height: 4, background: 'rgb(var(--accent))' }} />
              <span className="label">Restock</span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55 }}>
              {alerts.length > 0
                ? `Yes — ${alerts.length} product${alerts.length === 1 ? ' is' : 's are'} below its reorder point. Tap below to see them.`
                : 'Nothing needs attention right now — every product is above its reorder point.'}
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_MOBILE_SHEET', open: true })}
              className="inline-flex self-start items-center text-accent font-semibold"
              style={{
                gap: 6,
                border: '1px solid rgb(var(--border-strong))',
                borderRadius: 999,
                padding: '7px 12px',
                fontSize: 12,
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              View details
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {sheetOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => dispatch({ type: 'SET_MOBILE_SHEET', open: false })}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }}
            />

            <div
              role="dialog"
              aria-label="Alerts"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '58%',
                background: 'rgb(var(--surface))',
                borderTopLeftRadius: 'var(--r-xl)',
                borderTopRightRadius: 'var(--r-xl)',
                border: '1px solid rgb(var(--border-strong))',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="flex justify-center" style={{ padding: '10px 0 6px' }}>
                <div style={{ width: 36, height: 3, borderRadius: 999, background: 'rgb(var(--border-strong))' }} />
              </div>

              <LaserLine className="mx-5" />

              <div
                className="flex items-center justify-between border-b border-hairline"
                style={{ padding: '12px 20px 14px' }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>Alerts ({alerts.length})</span>
                <span className="font-mono text-accent" style={{ fontSize: 12, fontWeight: 600 }}>
                  View all
                </span>
              </div>

              <div className="flex flex-col overflow-auto" style={{ gap: 10, padding: '14px 20px' }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.title}
                    className="flex items-center border border-hairline rounded-md"
                    style={{ gap: 10, padding: 11 }}
                  >
                    <SeverityIcon severity={alert.severity} />
                    <div className="min-w-0 flex-1">
                      <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{alert.title}</div>
                      <div className="font-mono" style={{ fontSize: '11.5px', color: 'rgb(var(--text-3))' }}>
                        {alert.meta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
