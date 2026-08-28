import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingBlock } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';

/**
 * Route guard for the two destinations that genuinely need one.
 *
 * Reads are open to anonymous users everywhere else by design — the backend
 * only gates writes — so this wraps `/audit-log` (any signed-in user) and
 * `/users` (admin only) and nothing else. Guarding a read page here would also
 * break the page tests, which render logged-out and assert on a read-only view.
 *
 * `loading` must be handled explicitly: AuthContext starts with `user === null`
 * while it resolves GET /auth/me from a stored token, so redirecting on a falsy
 * user without checking `loading` bounces an already-signed-in user to /login
 * on every refresh.
 */
export function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingBlock label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this page"
        message={`This area is limited to ${role} accounts. You are signed in as ${user.role}.`}
      />
    );
  }

  return children ?? <Outlet />;
}

export default RequireAuth;
