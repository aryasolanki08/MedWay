import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff, Sparkles, Zap, ShieldCheck, PiggyBank, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";
import { AHMEDABAD_AREAS, DEFAULT_CITY, DEFAULT_STATE } from "../utils/locations.js";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "", email: "", phone: "", password: "",
    city: DEFAULT_CITY, state: DEFAULT_STATE, area: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      const data = err?.response?.data;
      setError(data ? Object.values(data).flat().join(" ") : "Could not create account.");
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
            <Sparkles className="h-3.5 w-3.5" /> Free to join — no card required
          </span>

          <div className="auth-panel-copy">
            <h2>Create your account in seconds.</h2>
            <p>
              Save searches, bookmark medicines, and set your location once so distances and
              prices are always accurate.
            </p>
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
          <div className="brand">Create account</div>
          <p className="muted" style={{ marginTop: 0 }}>Start comparing medicine prices near you</p>

          <div className="input-icon-wrap">
            <User className="h-4 w-4 leading-icon" />
            <input className="input" placeholder="Username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="username" />
          </div>

          <div className="input-icon-wrap">
            <Mail className="h-4 w-4 leading-icon" />
            <input className="input" type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </div>

          <div className="input-icon-wrap">
            <Phone className="h-4 w-4 leading-icon" />
            <input className="input" placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
          </div>

          <div className="input-icon-wrap">
            <MapPin className="h-4 w-4 leading-icon" />
            <select
              className="input"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              required
            >
              <option value="" disabled>Select your area (Ahmedabad)</option>
              {AHMEDABAD_AREAS.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="input-icon-wrap">
            <Lock className="h-4 w-4 leading-icon" />
            <input className="input pr-icon" type={showPassword ? "text" : "password"} placeholder="Password (min 8 characters)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
            <button type="button" className="trailing-icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>

          <div className="auth-divider">or</div>
          <GoogleSignInButton />

          <Link to="/login" className="auth-bottom-link">
            Already have an account? <span className="link-btn" style={{ display: "inline" }}>Log in</span>
          </Link>
        </form>
      </div>
    </div>
  );
}
