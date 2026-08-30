import type { UserRead } from '../api/types';

/** Real 1-2 letter initials for the icon rail's avatar chip — "TA" in every mockup was a fixed placeholder. */
export function avatarInitials(user: UserRead | null): string {
  if (!user) return '?';
  const source = user.full_name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
