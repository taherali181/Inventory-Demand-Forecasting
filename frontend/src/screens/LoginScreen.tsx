import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, LogoMark } from '../components/ui';
import { useShellDispatch } from '../components/shell';
import { login } from '../api/auth';

/**
 * LoginScreen — Layer 4. Login.dc.html, composed from Layer 0 primitives. Wired to the real backend
 * (`POST /auth/login` + `GET /auth/me`, via `api/auth.ts`) — a previous version of this screen (when no
 * backend existed yet) had both buttons just `dispatch({ type: 'LOGIN' })` unconditionally; that's gone.
 *
 * "Continue with demo account" attempts a real login with a fixed demo credential pair rather than
 * pretending to work — on a fresh database with no such user registered, it fails and shows the same real
 * error a wrong password would, which is the honest outcome (register that user via `POST /auth/register`
 * to make the demo button actually work, see root CLAUDE.md's Commands section).
 *
 * "Create one" (register) stays the unwired `<a href="#">` the mockup shows — there is no built register
 * screen to send it to.
 *
 * Layout verbatim from the source: 600px brand panel (`bg-surface`, no `.hud-bg`) + flex-1 form panel
 * (`.hud-bg`).
 */
const DEMO_EMAIL = 'demo@restock.dev';
const DEMO_PASSWORD = 'DemoAccount123!';

export function LoginScreen() {
  const dispatch = useShellDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function attemptLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(loginEmail, loginPassword);
      dispatch({ type: 'LOGIN', user });
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not sign in — check your credentials and that the backend is reachable.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSignIn(event: FormEvent) {
    event.preventDefault();
    void attemptLogin(email, password);
  }

  return (
    <div className="flex" style={{ width: '100%', height: '100%', minHeight: '100vh', color: 'rgb(var(--text))' }}>
      {/* brand panel */}
      <div
        className="hidden shrink-0 flex-col justify-between bg-surface border-r border-hairline md:flex"
        style={{ width: 600, padding: 48 }}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark size="sm" />
          <span className="label" style={{ color: 'rgb(var(--text))' }}>
            Restock
          </span>
        </div>

        <div className="flex flex-col" style={{ gap: 22, maxWidth: 420 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="35" stroke="rgb(var(--accent))" strokeWidth="1" opacity=".45" />
            <path
              d="M22 44l14-16 14 16"
              stroke="rgb(var(--accent))"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="36" cy="28" r="2.5" fill="rgb(var(--accent))" />
          </svg>

          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.25, fontWeight: 600 }}>
            Ask your inventory anything.
          </h1>

          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgb(var(--text-2))' }}>
            Stock levels, forecasts, reorder points, and purchase orders — one conversation, not six
            screens.
          </p>
        </div>

        <p className="font-mono" style={{ margin: 0, fontSize: 11, color: 'rgb(var(--text-3))' }}>
          © 2026 RESTOCK
        </p>
      </div>

      {/* form panel */}
      <div className="hud-bg flex flex-1 items-center justify-center" style={{ padding: 24 }}>
        <form
          onSubmit={handleSignIn}
          style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600 }}>Sign in</h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'rgb(var(--text-3))' }}>
              Welcome back — pick up where you left off.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={LABEL_STYLE}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="placeholder:text-content-muted"
                style={FIELD_STYLE}
                required
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={LABEL_STYLE}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••"
                className="placeholder:text-content-muted"
                style={FIELD_STYLE}
                required
              />
            </label>
          </div>

          {error ? (
            <p role="alert" style={{ margin: 0, fontSize: '12.5px', color: 'rgb(var(--bad))' }}>
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" padding="12px" fontSize={14} notch={10} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgb(var(--border))' }} />
            <span className="font-mono" style={{ fontSize: 11, color: 'rgb(var(--text-3))' }}>
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgb(var(--border))' }} />
          </div>

          <Button
            type="button"
            variant="secondary"
            padding="11px"
            fontSize="13.5px"
            className="text-content"
            disabled={submitting}
            onClick={() => void attemptLogin(DEMO_EMAIL, DEMO_PASSWORD)}
          >
            Continue with demo account
          </Button>

          <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'rgb(var(--text-3))' }}>
            Don't have an account?{' '}
            <a href="#" style={{ color: 'rgb(var(--accent))' }}>
              Create one
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

const LABEL_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.05em',
  textTransform: 'uppercase' as const,
  color: 'rgb(var(--text-3))',
};

const FIELD_STYLE = {
  width: '100%',
  background: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 'var(--r-md)',
  padding: '11px 13px',
  fontSize: 14,
  fontFamily: 'var(--font-mono)',
  color: 'rgb(var(--text))',
  outline: 'none',
};
