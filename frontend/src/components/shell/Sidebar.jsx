import React, { useCallback, useEffect, useState } from 'react';
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
  PanelLeft,
  PanelLeftClose,
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
import { Logo, LogoMark } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useAppStore';

/*
 * The app's single navigation surface.
 *
 * Before this existed, ten destinations that already had working pages and
 * routes — stock, movements, reorder suggestions, upload, the whole catalog,
 * the audit log, users — had no entry point anywhere in the UI. They were
 * reachable only by typing the URL. Every route the router serves is listed
 * here, grouped by what the user is trying to do rather than by which backend
 * router happens to serve it.
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

const COLLAPSE_KEY = 'restock-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function NavItem({ item, collapsed, unreadAlertsCount, onNavigate }) {
  const Icon = item.icon;
  const showBadge = item.badge === 'alerts' && unreadAlertsCount > 0;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-md text-sm transition-colors duration-150',
          collapsed ? 'h-9 w-9 justify-center' : 'h-9 gap-2.5 px-2.5',
          isActive
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-content-secondary hover:bg-surface-2 hover:text-content'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {showBadge && !collapsed && (
        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-status-bad/15 px-1.5 text-[11px] font-semibold tabular-nums text-status-bad">
          {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
        </span>
      )}
      {showBadge && collapsed && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-status-bad"
        />
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onToggleCollapse, onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const unreadAlertsCount = useAppStore((s) => s.unreadAlertsCount);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Head */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-hairline',
          collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-3'
        )}
      >
        <NavLink
          to="/"
          onClick={onNavigate}
          className="flex items-center rounded-md"
          aria-label="Restock home"
        >
          {collapsed ? <LogoMark className="h-7 w-7 text-accent" title="Restock" /> : <Logo size="md" />}
        </NavLink>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-content lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-2 hover:text-content lg:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Destinations */}
      <nav
        aria-label="Main"
        className={cn('min-h-0 flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2.5')}
      >
        {SECTIONS.map((section) => {
          const items = section.items.filter(
            (item) => !item.adminOnly || user?.role === 'admin'
          );
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-4 last:mb-0">
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-hairline" aria-hidden="true" />
              ) : (
                <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    unreadAlertsCount={unreadAlertsCount}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          'shrink-0 border-t border-hairline py-3',
          collapsed ? 'px-2' : 'px-2.5'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2',
            collapsed ? 'flex-col' : 'justify-between'
          )}
        >
          <ThemeToggle compact={collapsed} />
          {collapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-content-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-content"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {user ? (
          <div
            className={cn(
              'mt-3 flex items-center gap-2',
              collapsed && 'flex-col gap-1.5'
            )}
          >
            <div
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold uppercase text-accent"
            >
              {(user.full_name || user.email || '?').trim().charAt(0)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                {/* `user.username` does not exist on the backend's UserRead —
                    reading it rendered a hardcoded "Admin User" for everyone. */}
                <div className="truncate text-sm font-medium text-content">
                  {user.full_name || user.email}
                </div>
                <div className="truncate text-xs capitalize text-content-muted">{user.role}</div>
              </div>
            )}
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
            onClick={onNavigate}
            title={collapsed ? 'Sign in' : undefined}
            className={cn(
              'mt-3 flex h-9 items-center rounded-md border border-hairline bg-surface text-sm font-medium text-content transition-colors duration-150 hover:bg-surface-2',
              collapsed ? 'w-9 justify-center' : 'gap-2 px-2.5'
            )}
          >
            <LogIn className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign in</span>}
          </NavLink>
        )}
      </div>
    </div>
  );
}

/**
 * Persistent rail on `lg` and up; an overlay drawer below it.
 *
 * The drawer is one of the four surfaces allowed to use `.glass` — it floats
 * over page content rather than being part of the document flow.
 */
export function Sidebar({ mobileOpen = false, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Non-fatal: the choice still holds for this session.
      }
      return next;
    });
  }, []);

  // Escape closes the mobile drawer, matching the command palette and modals.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop rail. 240px expanded / 64px collapsed. */}
      <aside
        className={cn(
          'hidden h-full min-h-0 shrink-0 border-r border-hairline bg-surface lg:block',
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Mobile drawer. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onMobileClose}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50"
          />
          <div className="glass absolute inset-y-0 left-0 w-60 rounded-r-xl">
            <SidebarContent collapsed={false} onNavigate={onMobileClose} onClose={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
