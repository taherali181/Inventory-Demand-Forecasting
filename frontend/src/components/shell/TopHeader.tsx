import { IconButton, Kbd } from '../ui';

/**
 * TopHeader — Layer 1 shell primitive.
 *
 * Two GENUINELY different variants (design brief: "don't collapse them into one component with optional
 * props that happen to differ" — this is one component, but the two branches share no incidental props;
 * each renders its own complete markup for its own variant):
 *
 * `app` (Main.dc.html):
 *   height:56px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between;
 *   padding:0 24px; border-bottom:1px solid var(--border);
 *   left: <div class="label">{workspaceLabel}</div>
 *   right: gap:14px — a `<Kbd variant="hint">⌘K</Kbd>` chip, then a 30×30 rounded-md icon box
 *          (color:var(--text-3)) holding a 16×16 crescent-shaped path (verbatim from source — it is NOT
 *          a bell glyph despite representing notifications, build the path exactly as given):
 *          `<path d="M20 14.5A8.5 8.5 0 1110 3.8a7 7 0 0010 10.7z"/>`, stroke-width 1.6.
 *
 * `chatColumn` (ChatWithCanvas.dc.html):
 *   height:56px; flex-shrink:0; display:flex; align-items:center; padding:0 20px;
 *   border-bottom:1px solid var(--border); NO justify-content:space-between (nothing on the right —
 *   deliberate reduction, the canvas panel claims its own header real estate).
 *   content: <span class="label">{workspaceLabel}</span> only.
 */

interface TopHeaderAppProps {
  variant: 'app';
  workspaceLabel: string;
  /** Fires when the ⌘K chip is clicked — wire to `dispatch({ type: 'TOGGLE_PALETTE' })`. */
  onPaletteOpen?: () => void;
  /** Fires when the notification icon is clicked. */
  onBellClick?: () => void;
}

interface TopHeaderChatColumnProps {
  variant: 'chatColumn';
  workspaceLabel: string;
}

export type TopHeaderProps = TopHeaderAppProps | TopHeaderChatColumnProps;

export function TopHeader(props: TopHeaderProps) {
  if (props.variant === 'chatColumn') {
    return (
      <div className="flex h-14 shrink-0 items-center border-b border-hairline px-5">
        <span className="label">{props.workspaceLabel}</span>
      </div>
    );
  }

  const { workspaceLabel, onPaletteOpen, onBellClick } = props;

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-6">
      <div className="label">{workspaceLabel}</div>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onPaletteOpen}
          aria-label="Open command palette"
          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
        >
          <Kbd variant="hint">⌘K</Kbd>
        </button>
        <IconButton size={30} onClick={onBellClick} aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 14.5A8.5 8.5 0 1110 3.8a7 7 0 0010 10.7z" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}
