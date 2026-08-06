import React, { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { Lock, User, Eye, EyeOff, ShieldCheck, Receipt, Package } from 'lucide-react';

const Login = () => {
  const { login, authenticateWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (result.success) {
      showToast('Welcome back to MedWay!', 'success');
      navigate('/dashboard');
    } else {
      setError(result.error);
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      const result = await authenticateWithGoogle(credential);
      if (result.success) {
        showToast('Welcome back to MedWay!', 'success');
        navigate('/dashboard');
      } else if (result.signupRequired) {
        showToast("No pharmacy account found for that Google account -- let's register one.", 'info');
        navigate('/signup', { state: { googleCredential: credential, googleEmail: result.email, googleName: result.name } });
      } else {
        showToast(result.error, 'error');
      }
    },
    [authenticateWithGoogle, navigate, showToast]
  );

  return (
    <div className="auth-wrap">
      {/* Left hero panel */}
      <div className="auth-panel">
        <div className="auth-panel-brand">
          <span className="auth-panel-mark">M</span>
          MedWay <span className="text-brand-300">Medicals</span>
        </div>

        <div className="auth-panel-copy">
          <span className="auth-pill-badge">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pharmacy operator panel
          </span>
          <h2>Run your pharmacy's billing, stock, and purchases in one place.</h2>
          <p>
            Sign in to reach point-of-sale billing, live inventory, purchase
            intake, and sales history for your store.
          </p>

          <div className="auth-mockup-card mt-8">
            <div className="auth-mockup-row">
              <span className="auth-mockup-icon">
                <Receipt className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-white text-sm font-semibold m-0">Quick Bill</p>
                <p className="text-brand-100/70 text-xs m-0">Press F2 from anywhere</p>
              </div>
            </div>
          </div>

          <div className="auth-trust-stats">
            <div className="auth-trust-stat">
              <span className="value">POS</span>
              <span className="label">Billing built-in</span>
            </div>
            <div className="auth-trust-stat">
              <span className="value"><Package className="h-4 w-4 inline" /></span>
              <span className="label">Live stock tracking</span>
            </div>
            <div className="auth-trust-stat">
              <span className="value">24/7</span>
              <span className="label">Store access</span>
            </div>
          </div>
        </div>

        <div className="auth-panel-foot">MedWay for pharmacies — billing, inventory, and purchases</div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-wrap">
        <div className="auth-card">
          <div className="brand">MedWay</div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Access your pharmacy panel and point of sale
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Username
              </label>
              <div className="input-icon-wrap">
                <User className="h-4 w-4 leading-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="input-icon-wrap">
                <Lock className="h-4 w-4 leading-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-icon"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="trailing-icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn w-full py-3">
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <GoogleSignInButton onCredential={handleGoogleCredential} />

          <Link to="/signup" className="auth-bottom-link" style={{ marginTop: '1rem' }}>
            New to MedWay? <span className="text-brand-600 dark:text-brand-400 font-semibold">Register your pharmacy</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
