import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
// Dev-only convenience account. Login has no server-side seeding, so the
// demo button registers this account on first use (if it doesn't exist yet)
// and simply logs in on every use after that.
const DEMO_EMAIL = 'admin@restock.io';
const DEMO_PASSWORD = 'Password123!';

export const ModernLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submitLogin = async (creds) => {
    await login(creds);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await submitLogin({ email, password });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);

    try {
      await submitLogin({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    } catch (err) {
      // First run: the demo account doesn't exist yet — create it, then log in.
      if (err.response?.status === 401 || err.response?.status === 400) {
        try {
          await authApi.register({ email: DEMO_EMAIL, password: DEMO_PASSWORD, fullName: 'Demo Admin' });
          await submitLogin({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
          return;
        } catch (registerErr) {
          setError(registerErr.response?.data?.detail || 'Could not set up the demo account.');
          setLoading(false);
          return;
        }
      }
      setError(err.response?.data?.detail || 'Could not sign in with demo credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm glass-panel p-8 rounded-2xl shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <LogoMark className="mx-auto h-10 w-10 text-accent" title="Restock" />
          <h1 className="text-xl font-semibold tracking-tight text-content">Restock</h1>
          <p className="text-xs text-content-muted">Sign in to manage your inventory</p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-status-bad/10 border border-status-bad/20 text-status-bad text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label htmlFor="login-email" className="text-content-secondary font-medium mb-1 block">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg glass-input text-content text-xs placeholder:text-content-muted focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="text-content-secondary font-medium mb-1 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg glass-input text-content text-xs placeholder:text-content-muted focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-fg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99] disabled:opacity-50"
          >
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Login & Registration */}
        <div className="space-y-3 pt-4 border-t border-hairline text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-surface hover:bg-surface-2 text-content-secondary text-xs font-medium border border-hairline flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-content-muted" />
            <span>Continue with demo account</span>
          </button>

          <p className="text-[11px] text-content-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-content-secondary hover:text-content font-medium">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
