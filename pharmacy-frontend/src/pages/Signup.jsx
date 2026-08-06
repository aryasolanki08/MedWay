import React, { useCallback, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { Lock, User, Mail, Shield, MapPin, Phone, Building, ShieldCheck } from 'lucide-react';
import { AHMEDABAD_AREAS, DEFAULT_CITY, DEFAULT_STATE } from '../utils/locations';

const Signup = () => {
  const { signup, authenticateWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // If we arrived here because Login's Google button found no account for
  // this Google identity, it hands us the credential + profile info so we
  // can skip straight to the pharmacy-details half of the form.
  const [googleCredential, setGoogleCredential] = useState(location.state?.googleCredential || null);

  const [formData, setFormData] = useState({
    username: '',
    email: location.state?.googleEmail || '',
    password: '',
    pharmacy_name: '',
    license_number: '',
    address: '',
    phone: '',
    pharmacy_email: '',
    city: DEFAULT_CITY,
    state: DEFAULT_STATE,
    area: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential) => {
      const result = await authenticateWithGoogle(credential);
      if (result.success) {
        showToast('Welcome to MedWay!', 'success');
        navigate('/dashboard');
      } else if (result.signupRequired) {
        setGoogleCredential(credential);
        setFormData((prev) => ({ ...prev, email: result.email || prev.email }));
        showToast('Google account verified -- just add your pharmacy details below.', 'success');
      } else {
        showToast(result.error, 'error');
      }
    },
    [authenticateWithGoogle, navigate, showToast]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const result = googleCredential
      ? await authenticateWithGoogle(googleCredential, {
          pharmacy_name: formData.pharmacy_name,
          license_number: formData.license_number,
          address: formData.address,
          phone: formData.phone,
          pharmacy_email: formData.pharmacy_email,
          city: formData.city,
          state: formData.state,
          area: formData.area,
        })
      : await signup(formData);

    if (result.success) {
      showToast('Registration successful! Welcome to MedWay.', 'success');
      navigate('/dashboard');
    } else {
      if (typeof result.error === 'object') {
        setErrors(result.error);
        const firstError = Object.values(result.error)[0];
        showToast(Array.isArray(firstError) ? firstError[0] : 'Please correct the errors.', 'error');
      } else {
        showToast(result.error || 'Signup failed.', 'error');
      }
    }
    setLoading(false);
  };

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
            Register your pharmacy
          </span>
          <h2>Get your store onto MedWay in a few minutes.</h2>
          <p>
            Create an owner account and register your drug license to unlock
            billing, inventory, and purchase tracking for your pharmacy.
          </p>
        </div>

        <div className="auth-panel-foot">MedWay for pharmacies — billing, inventory, and purchases</div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-wrap px-6 py-10">
        <div className="auth-card max-w-2xl">
          <div className="brand">MedWay</div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Register pharmacy</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Create an owner account and register your store license
          </p>

          {!googleCredential && (
            <>
              <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
              <div className="auth-divider">or register with a username and password</div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Owner Account info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Owner account
                </h3>

                {googleCredential ? (
                  <div className="rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50 dark:bg-brand-950/20 px-4 py-3">
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-400 m-0">
                      Signed in with Google
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 m-0 mt-0.5">{formData.email}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 underline"
                      onClick={() => setGoogleCredential(null)}
                    >
                      Use a username and password instead
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Username
                      </label>
                      <div className="input-icon-wrap">
                        <User className="h-4 w-4 leading-icon" />
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          className="input"
                          placeholder="john_doe"
                          required
                        />
                      </div>
                      {errors.username && <p className="mt-1 error-text font-medium">{errors.username[0]}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Email address
                      </label>
                      <div className="input-icon-wrap">
                        <Mail className="h-4 w-4 leading-icon" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="input"
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                      {errors.email && <p className="mt-1 error-text font-medium">{errors.email[0]}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Password
                      </label>
                      <div className="input-icon-wrap">
                        <Lock className="h-4 w-4 leading-icon" />
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="input"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      {errors.password && <p className="mt-1 error-text font-medium">{errors.password[0]}</p>}
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Pharmacy Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Pharmacy details
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Pharmacy name
                  </label>
                  <div className="input-icon-wrap">
                    <Building className="h-4 w-4 leading-icon" />
                    <input
                      type="text"
                      name="pharmacy_name"
                      value={formData.pharmacy_name}
                      onChange={handleChange}
                      className="input"
                      placeholder="Apex Medicos"
                      required
                    />
                  </div>
                  {errors.pharmacy_name && <p className="mt-1 error-text font-medium">{errors.pharmacy_name[0]}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Drug license number
                  </label>
                  <div className="input-icon-wrap">
                    <Shield className="h-4 w-4 leading-icon" />
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleChange}
                      className="input"
                      placeholder="DL-12345/67"
                      required
                    />
                  </div>
                  {errors.license_number && (
                    <p className="mt-1 error-text font-medium">{errors.license_number[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Contact phone
                  </label>
                  <div className="input-icon-wrap">
                    <Phone className="h-4 w-4 leading-icon" />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input"
                      placeholder="+1 (555) 019-2834"
                      required
                    />
                  </div>
                  {errors.phone && <p className="mt-1 error-text font-medium">{errors.phone[0]}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Business email
                  </label>
                  <div className="input-icon-wrap">
                    <Mail className="h-4 w-4 leading-icon" />
                    <input
                      type="email"
                      name="pharmacy_email"
                      value={formData.pharmacy_email}
                      onChange={handleChange}
                      className="input"
                      placeholder="contact@apexmedicos.com"
                      required
                    />
                  </div>
                  {errors.pharmacy_email && (
                    <p className="mt-1 error-text font-medium">{errors.pharmacy_email[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Area
                  </label>
                  <div className="input-icon-wrap">
                    <MapPin className="h-4 w-4 leading-icon" />
                    <select
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="" disabled>Select your area ({formData.city})</option>
                      {AHMEDABAD_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  {errors.area && <p className="mt-1 error-text font-medium">{errors.area[0]}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Store address
              </label>
              <div className="input-icon-wrap">
                <MapPin className="h-4 w-4 leading-icon" style={{ top: 18 }} />
                <textarea
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  className="input"
                  placeholder="123 Health Street, Suite A"
                  required
                ></textarea>
              </div>
              {errors.address && <p className="mt-1 error-text font-medium">{errors.address[0]}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn w-full py-3">
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                'Register & Start Onboarding'
              )}
            </button>
          </form>

          <div className="auth-divider mt-6">or</div>

          <Link to="/login" className="auth-bottom-link">
            Already have an account? <span className="text-brand-600 dark:text-brand-400 font-semibold">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
