import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building,
  UserPlus,
  Users,
  ShieldAlert,
  Save,
  Trash2,
  Lock,
  Mail,
  User,
  Shield,
  Phone,
  MapPin,
  CreditCard,
  Check,
  Sparkles
} from 'lucide-react';

const Settings = () => {
  const { user, fetchProfile } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.role === 'owner';

  // Pharmacy state
  const [pharmacy, setPharmacy] = useState({
    name: '',
    license_number: '',
    email: '',
    phone: '',
    address: ''
  });
  const [pharmacyLoading, setPharmacyLoading] = useState(true);

  // Staff state
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  
  // Add Staff Form
  const [newStaff, setNewStaff] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [addLoading, setAddLoading] = useState(false);

  const fetchPharmacy = async () => {
    setPharmacyLoading(true);
    try {
      const res = await api.get('/api/auth/pharmacy/');
      // ViewSets list action maps to GET /api/auth/pharmacy/
      setPharmacy(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setPharmacyLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!isOwner) {
      setStaffLoading(false);
      return;
    }
    setStaffLoading(true);
    try {
      const res = await api.get('/api/auth/staff/');
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacy();
    fetchStaff();
  }, [user]);

  const handlePharmacyChange = (e) => {
    setPharmacy({ ...pharmacy, [e.target.name]: e.target.value });
  };

  const handlePharmacySubmit = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    try {
      const res = await api.post('/api/auth/pharmacy/', pharmacy);
      showToast('Pharmacy profile updated successfully.', 'success');
      setPharmacy(res.data);
      fetchProfile(); // reload context details
    } catch (err) {
      showToast('Failed to update store settings.', 'error');
    }
  };

  const handleStaffChange = (e) => {
    setNewStaff({ ...newStaff, [e.target.name]: e.target.value });
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.email || !newStaff.password) {
      showToast('Please fill all staff registration fields.', 'warning');
      return;
    }

    setAddLoading(true);
    try {
      await api.post('/api/auth/staff/', newStaff);
      showToast(`Billing account for "${newStaff.username}" created.`, 'success');
      setNewStaff({ username: '', email: '', password: '' });
      fetchStaff();
    } catch (err) {
      const errMsg = err.response?.data?.username?.[0] || 'Failed to create staff account.';
      showToast(errMsg, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the login profile for ${name}?`)) {
      try {
        await api.delete(`/api/auth/staff/${id}/`);
        showToast(`Staff member ${name} deleted.`, 'success');
        fetchStaff();
      } catch (err) {
        showToast('Failed to delete staff member.', 'error');
      }
    }
  };

  const [upgradingPlan, setUpgradingPlan] = useState(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planKey, planName) => {
    if (!isOwner) {
      showToast("Only the pharmacy owner can upgrade plans.", "warning");
      return;
    }
    
    setUpgradingPlan(planKey);
    try {
      const res = await api.post('/api/auth/payments/create-order/', { plan: planKey });
      const { order_id, amount, currency, key_id, is_mock } = res.data;

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast("Failed to load Razorpay SDK. Check connection.", "error");
        setUpgradingPlan(null);
        return;
      }

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "MedWay Medicals",
        description: `Upgrade to ${planName}`,
        order_id: is_mock ? undefined : order_id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/api/auth/payments/verify-payment/', {
              razorpay_order_id: response.razorpay_order_id || order_id,
              razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
              razorpay_signature: response.razorpay_signature || 'mock_signature',
              plan: planKey
            });
            if (verifyRes.data.success) {
              showToast(`Plan successfully upgraded to ${planName}!`, 'success');
              fetchProfile();
              fetchPharmacy();
            }
          } catch (err) {
            showToast("Payment verification failed.", "error");
          }
        },
        prefill: {
          name: pharmacy.name || "My Pharmacy",
          email: pharmacy.email || "billing@pharmacy.com",
          contact: pharmacy.phone || "9999999999"
        },
        theme: {
          color: "#10b981"
        }
      };

      if (is_mock) {
        if (window.confirm(`[SANDBOX MODE] Proceed with mock payment of ₹${amount / 100} for ${planName}?`)) {
          options.handler({
            razorpay_order_id: order_id,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
            razorpay_signature: 'mock_signature'
          });
        }
      } else {
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      showToast("Failed to initialize payment.", "error");
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Role Alert for restricted staff users */}
      {!isOwner && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-400 font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm mb-1">Restricted Account Access</p>
            <p>You are logged in with the <b>Staff</b> role. Configuration panels and staff user registries are in view-only mode. Contact your pharmacy owner to make adjustments.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pharmacy Details Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building className="h-4.5 w-4.5 text-emerald-500" />
            <span>Store Configuration</span>
          </h3>

          {pharmacyLoading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <form onSubmit={handlePharmacySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pharmacy Store Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Building className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={pharmacy.name}
                    onChange={handlePharmacyChange}
                    disabled={!isOwner}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Drug License Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Shield className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="license_number"
                    value={pharmacy.license_number}
                    onChange={handlePharmacyChange}
                    disabled={!isOwner}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contact Phone
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="phone"
                    value={pharmacy.phone}
                    onChange={handlePharmacyChange}
                    disabled={!isOwner}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Business Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={pharmacy.email}
                    onChange={handlePharmacyChange}
                    disabled={!isOwner}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Store Address
                </label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <textarea
                    name="address"
                    rows="2"
                    value={pharmacy.address}
                    onChange={handlePharmacyChange}
                    disabled={!isOwner}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    required
                  ></textarea>
                </div>
              </div>

              {isOwner && (
                <button
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 font-bold py-2.5 rounded-xl shadow text-xs flex items-center justify-center gap-1.5 mt-4"
                >
                  <Save className="h-4 w-4" />
                  <span>Update Store Details</span>
                </button>
              )}
            </form>
          )}
        </div>

        {/* Staff Management Panel */}
        <div className="space-y-6">
          
          {/* List of current staff */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Users className="h-4.5 w-4.5 text-emerald-500" />
              <span>Staff Accounts</span>
            </h3>

            {staffLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              </div>
            ) : !isOwner ? (
              <p className="text-xs text-slate-500">Only the store owner can access the staff user directory.</p>
            ) : staffList.length === 0 ? (
              <p className="text-xs text-slate-500">No active billing staff users registered. Create logins below.</p>
            ) : (
              <div className="space-y-2">
                {staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {staff.user.username}
                      </p>
                      <p className="text-[10px] text-slate-550">{staff.user.email}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteStaff(staff.id, staff.user.username)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                      title="Delete Login Profile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Staff form */}
          {isOwner && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <UserPlus className="h-4.5 w-4.5 text-emerald-500" />
                <span>Add Billing Staff</span>
              </h3>

              <form onSubmit={handleStaffSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Staff Username
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      name="username"
                      value={newStaff.username}
                      onChange={handleStaffChange}
                      placeholder="E.g. staff_amy"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Staff Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={newStaff.email}
                      onChange={handleStaffChange}
                      placeholder="staff_amy@apex.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Access Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      name="password"
                      value={newStaff.password}
                      onChange={handleStaffChange}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 font-bold py-2.5 rounded-xl shadow text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {addLoading ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Create Staff Login</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* Subscription & Billing Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="h-4.5 w-4.5 text-emerald-500" />
            <span>Store Plan & Subscriptions</span>
          </h3>
          <p className="text-xs text-slate-500 mt-2">Manage your features catalog and staff limits by upgrading your plan. Billing is secured by Razorpay.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Plan 1 - Solo */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
            pharmacy.subscription_tier === 'solo' 
              ? 'border-emerald-500/50 bg-emerald-500/[0.02] dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Solo Starter</h4>
                {pharmacy.subscription_tier === 'solo' && (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-455 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded">Active Plan</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Perfect for single chemists</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">₹0 <span className="text-xs font-normal text-slate-500">/ forever</span></p>
              <ul className="mt-4 space-y-2 text-[11px] text-slate-500">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Up to 150 items catalog</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>F2 Standard POS billing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Basic inventory tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Owner user login only</span>
                </li>
              </ul>
            </div>
            <button
              disabled={pharmacy.subscription_tier === 'solo' || upgradingPlan}
              className="w-full bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              Solo Plan Default
            </button>
          </div>

          {/* Plan 2 - Smart */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 relative ${
            pharmacy.subscription_tier === 'smart' 
              ? 'border-emerald-500/50 bg-emerald-500/[0.02] dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Smart Pharmacy</span>
                </h4>
                {pharmacy.subscription_tier === 'smart' && (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-455 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded">Active Plan</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">For growing drug stores</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">₹3,200 <span className="text-xs font-normal text-slate-500">/ month</span></p>
              <ul className="mt-4 space-y-2 text-[11px] text-slate-500">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-300">Unlimited items catalog</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>F2 POS with barcode</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Expiry & stock auto alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-300">Up to 5 staff accounts</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('smart', 'Smart Pharmacy')}
              disabled={pharmacy.subscription_tier === 'smart' || upgradingPlan}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              {upgradingPlan === 'smart' ? 'Initializing...' : pharmacy.subscription_tier === 'solo' ? 'Upgrade to Smart' : 'Active Plan'}
            </button>
          </div>

          {/* Plan 3 - Clinic */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
            pharmacy.subscription_tier === 'clinic' 
              ? 'border-emerald-500/50 bg-emerald-500/[0.02] dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Clinic Network</h4>
                {pharmacy.subscription_tier === 'clinic' && (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-455 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded">Active Plan</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">For multi-branch networks</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">₹7,300 <span className="text-xs font-normal text-slate-500">/ month</span></p>
              <ul className="mt-4 space-y-2 text-[11px] text-slate-500">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-300">Multi-branch sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Internal stock transfers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-300">Advanced margins & analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited staff logins</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('clinic', 'Clinic Network')}
              disabled={pharmacy.subscription_tier === 'clinic' || upgradingPlan}
              className="w-full bg-slate-900 dark:bg-slate-950 text-white hover:bg-slate-850 dark:hover:bg-slate-900 border border-transparent dark:border-slate-800 font-bold py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              {upgradingPlan === 'clinic' ? 'Initializing...' : pharmacy.subscription_tier === 'clinic' ? 'Active Plan' : 'Upgrade to Clinic'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Settings;
