import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus, PanelsTopLeft, Search } from 'lucide-react';
import { cn } from '../ui/cn';
import { LogoMark } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useAppStore';

/*
 * v2.0's persistent chrome: a thin icon-only rail, not a nav tree.
 *
 * This is the single clearest structural break from the pre-redesign
 * Sidebar (still used as a drawer — see below): there is no always-visible
 * list of "Products / Warehouses / Suppliers / …". Everything reachable from
 * that list is still reachable — through the "Menu" button here, which opens
 * the same Sidebar content as an on-demand drawer instead of a permanent
 * column, and through the command palette (search). Nothing that used to
 * have a destination lost one; it just isn't parked on screen all the time
 * any more.
 */

function RailButton({ icon: Icon, label, onClick, active, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150',
        active
          ? 'border-b-[1.5px] border-accent text-accent'
          : 'text-content-secondary hover:bg-surface-2 hover:text-content'
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      {badge && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-status-bad"
        />
      )}
    </button>
  );
}

export function IconRail({ onOpenMenu, onOpenSearch }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unreadAlertsCount = useAppStore((s) => s.unreadAlertsCount);
  const clearChat = useAppStore((s) => s.clearChat);
  const setSplitMode = useAppStore((s) => s.setSplitMode);

  const startNewChat = () => {
    clearChat();
    setSplitMode('chat-only');
    navigate('/');
  };

  return (
    <div className="hidden h-full min-h-0 w-16 shrink-0 flex-col items-center border-r border-hairline bg-surface py-4 lg:flex">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Restock home"
        className="mb-7 inline-flex h-[30px] w-[30px] items-center justify-center rounded-md"
      >
        <LogoMark className="h-[30px] w-[30px] text-accent" title="Restock" />
      </button>

      <div className="flex flex-col items-center gap-3.5">
        <RailButton icon={MessageSquarePlus} label="New chat" onClick={startNewChat} />
        <RailButton
          icon={PanelsTopLeft}
          label="Menu"
          onClick={onOpenMenu}
          badge={unreadAlertsCount > 0}
        />
        <RailButton icon={Search} label="Search (⌘K)" onClick={onOpenSearch} />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={user ? 'Account' : 'Sign in'}
        title={user ? (user.full_name || user.email) : 'Sign in'}
        className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-[10.5px] font-semibold uppercase text-content-secondary transition-colors duration-150 hover:text-content"
      >
        {user ? (user.full_name || user.email || '?').trim().charAt(0) : '·'}
      </button>
    </div>
  );
}

export default IconRail;
