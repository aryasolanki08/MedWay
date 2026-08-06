import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, Sparkles, Zap, ShieldCheck, PiggyBank, PillBottle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ username: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form.username, form.password, remember);
      navigate("/");
    } catch {
      setError("Incorrect username or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-panel">
        <div className="auth-panel-brand">
          <span className="auth-panel-mark">M</span>
          MedWay
        </div>

        <div className="stack" style={{ gap: 28 }}>
          <span className="auth-pill-badge">
            <Sparkles className="h-3.5 w-3.5" /> Real-time medicine prices across Ahmedabad &amp; Surat
          </span>

          <div className="auth-panel-copy">
            <h2>Find the right medicine, at the right price, nearby.</h2>
            <p>
              Compare branded and generic prices across pharmacies near you, and get general
              OTC information before you shop — backed by real stock, not guesswork.
            </p>
          </div>

          <div className="auth-mockup-card">
            <div className="auth-mockup-row">
              <div className="auth-mockup-icon"><PillBottle className="h-5 w-5" /></div>
              <div>
                <div style={{ fontSize: 13, color: "rgb(255 255 255 / 0.65)" }}>Dolo 650mg</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>₹29.44 → Generic Paracetamol</div>
              </div>
            </div>
            <div className="row spread" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>₹11.04</span>
              <span className="savings-tag">💚 Save ~62%</span>
            </div>
          </div>
        </div>

        <div className="auth-trust-stats">
          <div className="auth-trust-stat">
            <span className="value row" style={{ gap: 4 }}><Zap className="h-4 w-4" /> 32+</span>
            <span className="label">Local Pharmacies</span>
          </div>
          <div className="auth-trust-stat">
            <span className="value row" style={{ gap: 4 }}><ShieldCheck className="h-4 w-4" /> 100%</span>
            <span className="label">Verified Live Stock</span>
          </div>
          <div className="auth-trust-stat">
            <span className="value row" style={{ gap: 4 }}><PiggyBank className="h-4 w-4" /> 75%</span>
            <span className="label">Max Generic Savings</span>
          </div>
        </div>

        <div className="auth-panel-foot">MedWay &mdash; customer portal</div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-card stack" onSubmit={submit}>
          <div className="brand">MedWay</div>
          <p className="muted" style={{ marginTop: 0 }}>Compare medicine prices near you</p>

          <div className="input-icon-wrap">
            <User className="h-4 w-4 leading-icon" />
            <input
              className="input" placeholder="Username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="username"
            />
          </div>

          <div className="input-icon-wrap">
            <Lock className="h-4 w-4 leading-icon" />
            <input
              className="input pr-icon" type={showPassword ? "text" : "password"} placeholder="Password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password"
            />
            <button type="button" className="trailing-icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="auth-row-between">
            <label className="auth-checkbox-label">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <button
              type="button"
              className="link-btn"
              onClick={() => toast.info("Password reset isn't set up yet — contact support for now.")}
            >
              Forgot password?
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>

          <div className="auth-divider">or</div>
          <GoogleSignInButton remember={remember} />

          <Link to="/register" className="auth-bottom-link">
            No account? <span className="link-btn" style={{ display: "inline" }}>Create one</span>
          </Link>
        </form>
      </div>
    </div>
  );
}
