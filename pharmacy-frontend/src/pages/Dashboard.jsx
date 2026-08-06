import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  Sparkles,
  Upload,
  Plus,
  ArrowRight,
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  Receipt,
  Download,
  CheckCircle,
  Clock,
  ChevronRight,
  Sparkle
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isClinicTier = user?.pharmacy?.subscription_tier === 'clinic';

  const [loading, setLoading] = useState(true);
  const [hasMedicines, setHasMedicines] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Dashboard stats
  const [data, setData] = useState({
    sales_today: 0,
    sales_week: 0,
    sales_month: 0,
    purchases_today: 0,
    purchases_week: 0,
    purchases_month: 0,
    sales_trend: [],
    best_sellers: [],
    low_stock_count: 0,
    out_of_stock_count: 0
  });

  const [lowStockList, setLowStockList] = useState([]);
  const [expiringList, setExpiringList] = useState([]);

  // Manual Form State for onboarding first medicine
  const [form, setForm] = useState({
    name: '',
    mrp: '',
    selling_price: '',
    purchase_price: '',
    stock_quantity: '',
    batch_number: '',
    expiry_date: '',
  });

  // Import State
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Verify inventory exists
      const medRes = await api.get('/api/inventory/medicines/');
      if (medRes.data.length > 0) {
        setHasMedicines(true);
        
        // 2. Fetch Aggregated Analytics
        const analyticsRes = await api.get('/api/analytics/overview/');
        setData(analyticsRes.data.data);

        // Fetch details for tables
        const today = new Date();
        const lowStock = medRes.data.filter(m => m.stock_quantity <= m.reorder_threshold);
        const ninetyDays = new Date();
        ninetyDays.setDate(today.getDate() + 90);
        const expSoon = medRes.data.filter(m => {
          const exp = new Date(m.expiry_date);
          return exp >= today && exp <= ninetyDays;
        });

        setLowStockList(lowStock.slice(0, 4));
        setExpiringList(expSoon.slice(0, 4));
      } else {
        setHasMedicines(false);
      }
    } catch (err) {
      showToast('Failed to sync dashboard updates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory/medicines/', {
        ...form,
        mrp: parseFloat(form.mrp),
        selling_price: parseFloat(form.selling_price),
        purchase_price: parseFloat(form.purchase_price),
        stock_quantity: parseInt(form.stock_quantity),
        reorder_threshold: 10
      });
      showToast('Success! Your first medicine has been added.', 'success');
      setHasMedicines(true);
      fetchDashboardData();
    } catch (err) {
      showToast('Failed to add medicine. Verify values.', 'error');
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await api.post('/api/inventory/medicines/import-csv/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(res.data.success || 'CSV imported successfully!', 'success');
      setHasMedicines(true);
      fetchDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'CSV validation failed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const triggerDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "name,salt_composition,manufacturer,category,mrp,selling_price,purchase_price,stock_quantity,batch_number,expiry_date,reorder_threshold\n"
      + "Paracetamol 500mg,Paracetamol,Apex Labs,Analgesic,20.00,18.00,12.00,100,B10294,2028-12-31,15\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medway_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-80 bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // ONBOARDING WIZARD VIEW
  if (!hasMedicines) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 glass-panel text-center space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
            <Sparkles className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white m-0">
              Welcome to {user?.pharmacy?.name || 'MedWay Medicals'}!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your register and license details have been successfully configured. Let's load your stock records to begin billing.
            </p>
          </div>

          {/* STEP 1: CHOOSE PATH */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
              <button
                onClick={() => setWizardStep(2)}
                className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-left transition-all duration-200 flex flex-col justify-between h-44 group"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 group-hover:text-emerald-500 transition-colors">
                    Bulk Import CSV
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Upload your existing inventory sheet (XLS / CSV) in seconds.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setWizardStep(3)}
                className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-left transition-all duration-200 flex flex-col justify-between h-44 group"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 group-hover:text-emerald-500 transition-colors">
                    Add Medicine Manually
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Type details of your first product batch to view the dashboard interface.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: CSV IMPORT */}
          {wizardStep === 2 && (
            <div className="space-y-4 pt-2 text-left">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Excel/CSV Template File</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Ready to populate standard headers</p>
                </div>
                <button
                  onClick={triggerDownloadTemplate}
                  className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-600 font-bold"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>

              <form onSubmit={handleCsvImport} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-emerald-500/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="hidden"
                    id="onboarding-csv"
                  />
                  <label htmlFor="onboarding-csv" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {importFile ? importFile.name : 'Select inventory CSV file'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 font-bold"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || importing}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Upload & Proceed'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: MANUAL ENTRY */}
          {wizardStep === 3 && (
            <form onSubmit={handleManualSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="E.g. Lipitor 10mg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    name="batch_number"
                    value={form.batch_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="B12345"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    MRP Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="mrp"
                    value={form.mrp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_price"
                    value={form.selling_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    Purchase Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    value={form.purchase_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={form.stock_quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-455 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={form.expiry_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 font-bold"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  Save & Complete
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // STANDARD DASHBOARD VIEW
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white m-0">
            Welcome back, {user?.user?.username}!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Overview statistics for <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.pharmacy?.name}</span> today.
          </p>
        </div>
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-150"
        >
          <Receipt className="h-4 w-4" />
          <span>New Sales Bill</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              ₹{data.sales_today.toFixed(2)}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              ₹{data.sales_week.toFixed(2)}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock items</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {data.low_stock_count}
            </h3>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
            data.low_stock_count > 0 
              ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {data.out_of_stock_count}
            </h3>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
            data.out_of_stock_count > 0 
              ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border-rose-200 dark:border-rose-900/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <Package className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (Recharts) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4 relative">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Sales vs Purchases Trend
            </h3>
            <p className="text-xs text-slate-500">30-day billing overview</p>
          </div>

          <div className={`h-72 w-full text-xs transition-all ${!isClinicTier ? 'blur-xs select-none pointer-events-none opacity-50' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sales_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {!isClinicTier && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/20 dark:bg-slate-900/20 backdrop-blur-xs rounded-2xl">
              <div className="max-w-xs space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xl glass-panel">
                <Sparkles className="h-6 w-6 text-emerald-500 mx-auto animate-pulse" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Unlock Analytics Trends</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  30-day sales and purchase billing metrics comparisons are unlocked on the <b>Clinic Network</b> plan.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-[10px] transition-colors"
                >
                  Upgrade to Clinic Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Best Selling medicines */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4 relative">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Top Selling Products
            </h3>
            <p className="text-xs text-slate-500">By quantity sold (Last 30 days)</p>
          </div>

          <div className={`space-y-4 pt-2 transition-all ${!isClinicTier ? 'blur-xs select-none pointer-events-none opacity-50' : ''}`}>
            {data.best_sellers.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                No selling history found. Sell items to trigger best seller lists.
              </div>
            ) : (
              data.best_sellers.map((bs, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {bs.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-extrabold text-slate-900 dark:text-white">{bs.quantity_sold} units</span>
                    <p className="text-[10px] text-slate-500 font-medium">₹{bs.total_revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {!isClinicTier && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/20 dark:bg-slate-900/20 backdrop-blur-xs rounded-2xl">
              <div className="max-w-xs space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xl glass-panel">
                <Sparkles className="h-6 w-6 text-emerald-500 mx-auto animate-pulse" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Unlock Best Sellers</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Best selling analytics reports are unlocked on the <b>Clinic Network</b> plan.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-[10px] transition-colors"
                >
                  Upgrade to Clinic Plan
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Grid: Alerts Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 glass-panel space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>Low stock alerts</span>
              </h3>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-emerald-500 hover:text-emerald-600 font-bold"
            >
              Reorder stock
            </button>
          </div>

          <div className="space-y-2">
            {lowStockList.length === 0 ? (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl text-emerald-650 text-xs">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                <span>All medicine stock quantities are fully loaded.</span>
              </div>
            ) : (
              lowStockList.map(med => (
                <div key={med.id} className="flex justify-between items-center p-3 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{med.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Batch: {med.batch_number} • Salt: {med.salt_composition || 'N/A'}</p>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{med.stock_quantity} left</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiry Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 glass-panel space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rose-500" />
                <span>Expiring Soon</span>
              </h3>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-emerald-500 hover:text-emerald-600 font-bold"
            >
              Verify dates
            </button>
          </div>

          <div className="space-y-2">
            {expiringList.length === 0 ? (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl text-emerald-650 text-xs">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                <span>No medicines expiring within the next 90 days.</span>
              </div>
            ) : (
              expiringList.map(med => (
                <div key={med.id} className="flex justify-between items-center p-3 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-xl text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{med.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Batch: {med.batch_number} • Stock: {med.stock_quantity} left</p>
                  </div>
                  <span className="font-bold text-rose-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {med.expiry_date}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
