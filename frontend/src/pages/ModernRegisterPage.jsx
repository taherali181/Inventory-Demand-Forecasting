import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
export const ModernRegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ email, password, fullName: fullName || undefined });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
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
        <div className="text-center space-y-2">
          <LogoMark className="mx-auto h-10 w-10 text-accent" title="Restock" />
          <h1 className="text-xl font-semibold tracking-tight text-content">Create account</h1>
          <p className="text-xs text-content-muted">Get started with Restock</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-status-bad/10 border border-status-bad/20 text-status-bad text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label htmlFor="register-name" className="text-content-secondary font-medium mb-1 block">
              Full name <span className="text-content-muted">(optional)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg glass-input text-content text-xs placeholder:text-content-muted focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="text-content-secondary font-medium mb-1 block">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                id="register-email"
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
            <label htmlFor="register-password" className="text-content-secondary font-medium mb-1 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg glass-input text-content text-xs placeholder:text-content-muted focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-fg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99] disabled:opacity-50"
          >
            <span>{loading ? 'Creating…' : 'Create account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-hairline text-center text-[11px] text-content-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-content-secondary hover:text-content font-medium">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
