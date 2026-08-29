import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Package,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useAppStore';

/*
 * The app's full destination list — reachable now through an on-demand
 * drawer (opened from IconRail's "Menu" button, or Topbar's hamburger on
 * mobile), not a permanent column. Every route the router serves is still
 * listed here, grouped by what the user is trying to do rather than by which
 * backend router happens to serve it — that grouping predates the v2.0
 * redesign and nothing about which destinations exist has changed, only how
 * the list gets on screen.
 */

const SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Ask', icon: MessageSquare, end: true },
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/forecast', label: 'Forecast', icon: TrendingUp },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
      { to: '/purchase-orders', label: 'Purchase orders', icon: ShoppingCart },
      { to: '/alerts', label: 'Alerts', icon: ShieldAlert, badge: 'alerts' },
      { to: '/eda', label: 'Analysis', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
    ],
  },
  {
    label: 'Operations',
    items: [
      // `end` so /stock does not stay lit while the user is on /stock/movements.
      { to: '/stock', label: 'Stock', icon: Layers, end: true },
      { to: '/stock/movements', label: 'Stock movements', icon: ArrowLeftRight },
      { to: '/reorder-suggestions', label: 'Reorder suggestions', icon: RefreshCw },
      { to: '/upload', label: 'Import data', icon: Upload },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/audit-log', label: 'Audit log', icon: ScrollText },
      { to: '/users', label: 'Users', icon: Users, adminOnly: true },
    ],
  },
];

function NavItem({ item, unreadAlertsCount, onNavigate }) {
  const Icon = item.icon;
  const showBadge = item.badge === 'alerts' && unreadAlertsCount > 0;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150',
          isActive
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-content-secondary hover:bg-surface-2 hover:text-content'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {showBadge && (
        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-status-bad/15 px-1.5 text-[11px] font-semibold tabular-nums text-status-bad">
          {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
        </span>
      )}
    </NavLink>
  );
}

/**
 * On-demand nav drawer. Slides over content from the left — it does not
 * displace it, unlike the old persistent column, so it never fights the
 * canvas for width.
 */
export function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();
  const unreadAlertsCount = useAppStore((s) => s.unreadAlertsCount);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
      />
      <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-hairline bg-surface">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3.5">
          <NavLink to="/" onClick={onClose} className="flex items-center rounded-md" aria-label="Restock home">
            <Logo size="md" />
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-content"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
          {SECTIONS.map((section) => {
            const items = section.items.filter((item) => !item.adminOnly || user?.role === 'admin');
            if (items.length === 0) return null;
            return (
              <div key={section.label} className="mb-4 last:mb-0">
                <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                  {section.label}
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavItem key={item.to} item={item} unreadAlertsCount={unreadAlertsCount} onNavigate={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-hairline px-2.5 py-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold uppercase text-accent"
              >
                {(user.full_name || user.email || '?').trim().charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-content">{user.full_name || user.email}</div>
                <div className="truncate text-xs capitalize text-content-muted">{user.role}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-2 hover:text-status-bad"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              onClick={onClose}
              className="flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface px-2.5 text-sm font-medium text-content transition-colors duration-150 hover:bg-surface-2"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              <span>Sign in</span>
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
