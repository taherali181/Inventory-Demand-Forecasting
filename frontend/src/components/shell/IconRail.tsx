import type { CSSProperties, ReactNode } from 'react';
import { cn, LogoMark } from '../ui';

/**
 * IconRail — Layer 1 shell primitive.
 *
 * Verbatim from the source (Main.dc.html / ChatWithCanvas.dc.html / POKanban.dc.html — identical markup
 * in all three except which icon, if any, carries the active treatment):
 *
 *   container  width:64px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;
 *              padding:18px 0 16px; border-right:1px solid var(--border);
 *              NO background — this is a deliberate divergence from the design brief's IconRail bullet,
 *              which says `bg-surface`. The mockup source itself sets no background on this div at all,
 *              so the parent `.hud-bg` grid/scanline texture shows straight through it, matching the main
 *              content area exactly. `--surface` (#131313) and `--canvas` (#0A0A0A) are NOT the same
 *              color — painting `bg-surface` here produces a flat, textureless, visibly-edged panel that
 *              the reference screenshot does not show. Source wins over the brief's paraphrase.
 *   logo       LogoMark (default size, 30px/8px notch) — margin-bottom:28px
 *   icon group display:flex; flex-direction:column; gap:14px; align-items:center;
 *   .rail-icon width:18px; height:18px; padding-bottom:8px; border-bottom:1.5px solid transparent;
 *              color:var(--text-3);
 *   active     color:#3E7BFA (--accent); border-bottom-color:#3E7BFA;
 *   spacer     flex:1
 *   avatar     width:30px; height:30px; border-radius:999px; background:var(--surface-2);
 *              border:1px solid var(--border-strong); font-size:10.5px; font-weight:600;
 *              font-family:mono; color:var(--text-2); content "TA"
 *
 * Icon order is fixed: new-chat (plus) → history (clock) → search (magnifier). Main and ChatWithCanvas
 * show `history` active; POKanban shows none active — hence `activeIcon` accepts `'none'`.
 *
 * Present on Main/ChatWithCanvas/POKanban. Absent on CommandPalette (overlay) and Mobile (hamburger
 * instead, see MobileTopBar) — this component is simply not rendered on those screens by Layer 4.
 */

export type RailIconName = 'new-chat' | 'history' | 'search';

export interface IconRailProps {
  /** Which icon shows the accent/active treatment. Pass `'none'` for POKanban, where none are active. */
  activeIcon: RailIconName | 'none';
  /** Avatar chip initials. Defaults to "TA" (the only value shown in any mockup). */
  avatarInitials?: string;
  onNewChat?: () => void;
  onHistory?: () => void;
  onSearch?: () => void;
  onAvatarClick?: () => void;
  className?: string;
}

/*
 * NOTE: no `display`/`alignItems`/`justifyContent` here, on purpose. The source `.rail-icon` is a plain
 * block div — box-sizing:border-box + height:18px + padding-bottom:8px + border-bottom:1.5px leaves only
 * an 8.5px content box, and the 18px `<svg>` child top-aligns and overflows downward rather than being
 * centered in it. Flex-centering this box (a prior version did) shifts every glyph up by
 * (18 − 8.5) / 2 = 4.75px, visibly detaching the active icon's accent underline from its glyph. Leave
 * this a plain box; the glyph is already 18×18 filling the full declared width/height.
 */
const RAIL_ICON_BASE_STYLE: CSSProperties = {
  width: 18,
  height: 18,
  padding: 0,
  paddingBottom: 8,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
};

function railIconStyle(active: boolean): CSSProperties {
  return {
    ...RAIL_ICON_BASE_STYLE,
    borderBottom: `1.5px solid ${active ? 'rgb(var(--accent))' : 'transparent'}`,
    color: active ? 'rgb(var(--accent))' : 'rgb(var(--text-3))',
  };
}

function RailIconButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={railIconStyle(active)}
    >
      {children}
    </button>
  );
}

/** `<path d="M12 5v14M5 12h14"/>`, stroke-width 1.7, round caps — new-chat. */
function PlusGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`, stroke-width 1.6 — history. */
function ClockGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

/** `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`, stroke-width 1.6 — search. */
function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function IconRail({
  activeIcon,
  avatarInitials = 'TA',
  onNewChat,
  onHistory,
  onSearch,
  onAvatarClick,
  className,
}: IconRailProps) {
  return (
    <div
      className={cn('flex w-16 shrink-0 flex-col items-center border-r border-hairline', className)}
      style={{ padding: '18px 0 16px' }}
    >
      <LogoMark className="mb-7" />

      <div className="flex flex-col items-center gap-3.5">
        <RailIconButton active={activeIcon === 'new-chat'} label="New chat" onClick={onNewChat}>
          <PlusGlyph />
        </RailIconButton>
        <RailIconButton active={activeIcon === 'history'} label="History" onClick={onHistory}>
          <ClockGlyph />
        </RailIconButton>
        <RailIconButton active={activeIcon === 'search'} label="Search" onClick={onSearch}>
          <SearchGlyph />
        </RailIconButton>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        aria-label="Account"
        onClick={onAvatarClick}
        className="flex items-center justify-center rounded-full border border-hairline-strong bg-surface-2 font-mono font-semibold text-content-secondary"
        style={{ width: 30, height: 30, fontSize: '10.5px', padding: 0 }}
      >
        {avatarInitials}
      </button>
    </div>
  );
}
