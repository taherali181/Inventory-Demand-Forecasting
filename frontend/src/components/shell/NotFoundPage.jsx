import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

/**
 * Catch-all for an unmatched path. Renders inside AppShell, so the sidebar is
 * still there — a wrong URL should never strand someone on a chrome-less page
 * with no way back, which is exactly what the unrouted pages used to do.
 *
 * useNavigate rather than a <Link> wrapped around <Button>: an <a> containing a
 * <button> is invalid HTML and gives the row two nested interactive elements.
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message="That URL does not match anything in the workspace. Use the sidebar, or head back to the copilot."
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/')}>
            Back to copilot
          </Button>
        }
      />
    </div>
  );
}

export default NotFoundPage;
