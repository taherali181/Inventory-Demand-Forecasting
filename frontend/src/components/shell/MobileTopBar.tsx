import { cn } from '../ui';

/**
 * MobileTopBar — Layer 1 shell primitive. Its own component, NOT a responsive resize of TopHeader
 * (design brief is explicit about this).
 *
 * Verbatim from Mobile.dc.html:
 *   height:52px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between;
 *   padding:0 16px; border-bottom:1px solid var(--border);
 *
 *   left    hamburger: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
 *           stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
 *           (no explicit color on the svg in source — it inherits the page's full `--text`, same as the
 *           label below, NOT the muted rail-icon treatment.)
 *   center  <span class="label" style="color:var(--text);">{workspaceLabel}</span> — note the color
 *           OVERRIDE to full `--text`, not `.label`'s default `--text-3`.
 *   right   26×26 avatar chip (smaller than the icon rail's 30px): border-radius:999px;
 *           background:var(--surface-2); border:1px solid var(--border-strong); font-size:10px;
 *           font-weight:600; font-family:mono; color:var(--text-2); content "TA".
 *
 * Present only below the ~768px breakpoint (an extrapolation — no tablet mockup exists to pin the exact
 * value; Layer 4 owns where that breakpoint is applied).
 */
export interface MobileTopBarProps {
  workspaceLabel: string;
  /** Avatar chip initials. Defaults to "TA" (the only value shown in any mockup). */
  avatarInitials?: string;
  onMenuClick?: () => void;
  onAvatarClick?: () => void;
  className?: string;
}

export function MobileTopBar({
  workspaceLabel,
  avatarInitials = 'TA',
  onMenuClick,
  onAvatarClick,
  className,
}: MobileTopBarProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-between border-b border-hairline px-4', className)}
      style={{ height: 52 }}
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex items-center justify-center text-content"
        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <span className="label" style={{ color: 'rgb(var(--text))' }}>
        {workspaceLabel}
      </span>

      <button
        type="button"
        onClick={onAvatarClick}
        aria-label="Account"
        className="flex items-center justify-center rounded-full border border-hairline-strong bg-surface-2 font-mono font-semibold text-content-secondary"
        style={{ width: 26, height: 26, fontSize: '10px', padding: 0 }}
      >
        {avatarInitials}
      </button>
    </div>
  );
}
