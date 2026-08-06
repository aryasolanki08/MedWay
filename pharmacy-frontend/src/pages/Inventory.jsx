import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Plus,
  Upload,
  Edit2,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Download,
  X,
  FileSpreadsheet
} from 'lucide-react';

const Inventory = () => {
  const { showToast } = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    salt_composition: '',
    manufacturer: '',
    category: '',
    mrp: '',
    selling_price: '',
    purchase_price: '',
    stock_quantity: '',
    batch_number: '',
    expiry_date: '',
    reorder_threshold: '10'
  });

  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  // Fetch medicines
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory/medicines/');
      let list = res.data;

      if (search) {
        const query = search.toLowerCase();
        list = list.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.salt_composition.toLowerCase().includes(query) ||
            m.batch_number.toLowerCase().includes(query)
        );
      }

      if (categoryFilter) {
        list = list.filter((m) => m.category === categoryFilter);
      }

      const today = new Date();
      if (stockFilter === 'low') {
        list = list.filter((m) => m.stock_quantity > 0 && m.stock_quantity <= m.reorder_threshold);
      } else if (stockFilter === 'out') {
        list = list.filter((m) => m.stock_quantity <= 0);
      }

      if (expiryFilter === 'expired') {
        list = list.filter((m) => new Date(m.expiry_date) < today);
      } else if (expiryFilter === 'soon') {
        const ninetyDaysLater = new Date();
        ninetyDaysLater.setDate(today.getDate() + 90);
        list = list.filter((m) => {
          const exp = new Date(m.expiry_date);
          return exp >= today && exp <= ninetyDaysLater;
        });
      }

      list.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'expiry_date') {
          valA = new Date(a.expiry_date).getTime();
          valB = new Date(b.expiry_date).getTime();
        } else if (['mrp', 'selling_price', 'purchase_price', 'stock_quantity'].includes(sortBy)) {
          valA = parseFloat(a[sortBy]);
          valB = parseFloat(b[sortBy]);
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setTotalCount(list.length);
      
      const startIdx = (page - 1) * pageSize;
      const paginatedList = list.slice(startIdx, startIdx + pageSize);
      setMedicines(paginatedList);
    } catch (err) {
      showToast('Failed to load inventory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [search, categoryFilter, stockFilter, expiryFilter, sortBy, sortOrder, page]);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory/medicines/', {
        ...form,
        mrp: parseFloat(form.mrp),
        selling_price: parseFloat(form.selling_price),
        purchase_price: parseFloat(form.purchase_price),
        stock_quantity: parseInt(form.stock_quantity),
        reorder_threshold: parseInt(form.reorder_threshold)
      });
      showToast('Medicine added to inventory successfully.', 'success');
      setIsAddModalOpen(false);
      resetForm();
      fetchMedicines();
    } catch (err) {
      showToast('Failed to add medicine. Check fields.', 'error');
    }
  };

  const handleEditClick = (med) => {
    setCurrentMedicine(med);
    setForm({
      name: med.name,
      salt_composition: med.salt_composition,
      manufacturer: med.manufacturer,
      category: med.category,
      mrp: med.mrp,
      selling_price: med.selling_price,
      purchase_price: med.purchase_price,
      stock_quantity: med.stock_quantity,
      batch_number: med.batch_number,
      expiry_date: med.expiry_date,
      reorder_threshold: med.reorder_threshold
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/inventory/medicines/${currentMedicine.id}/`, {
        ...form,
        mrp: parseFloat(form.mrp),
        selling_price: parseFloat(form.selling_price),
        purchase_price: parseFloat(form.purchase_price),
        stock_quantity: parseInt(form.stock_quantity),
        reorder_threshold: parseInt(form.reorder_threshold)
      });
      showToast('Medicine updated successfully.', 'success');
      setIsEditModalOpen(false);
      resetForm();
      fetchMedicines();
    } catch (err) {
      showToast('Failed to update medicine.', 'error');
    }
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await api.delete(`/api/inventory/medicines/${id}/`);
        showToast('Medicine removed from inventory.', 'success');
        fetchMedicines();
      } catch (err) {
        const detail = err.response?.data?.detail || err.response?.data?.[0];
        showToast(detail || 'Failed to delete medicine.', 'error', 6000);
      }
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);
    
    setImporting(true);
    setImportErrors([]);

    try {
      const res = await api.post('/api/inventory/medicines/import-csv/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(res.data.success || 'CSV imported successfully.', 'success');
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchMedicines();
    } catch (err) {
      if (err.response?.data?.errors) {
        setImportErrors(err.response.data.errors);
      }
      showToast(err.response?.data?.error || 'CSV import failed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      salt_composition: '',
      manufacturer: '',
      category: '',
      mrp: '',
      selling_price: '',
      purchase_price: '',
      stock_quantity: '',
      batch_number: '',
      expiry_date: '',
      reorder_threshold: '10'
    });
    setCurrentMedicine(null);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const triggerDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "name,salt_composition,manufacturer,category,mrp,selling_price,purchase_price,stock_quantity,batch_number,expiry_date,reorder_threshold\n"
      + "Paracetamol 500mg,Paracetamol,Apex Labs,Analgesic,20.00,18.00,12.00,100,B10294,2028-12-31,15\n";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medway_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueCategories = ['Analgesic', 'Antibiotic', 'Antihistamine', 'Cardiac', 'Diabetic', 'Vitamins'];

  return (
    <div className="space-y-6">
      {/* Header Summary & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total Inventory Records: <span className="font-bold text-slate-700 dark:text-slate-300">{totalCount}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
          >
            <Upload className="h-4 w-4" />
            <span>CSV Import</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-150"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm glass-panel flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by medicine name, salt composition, or batch number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2.5 pr-8 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Stock Levels</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => {
              setExpiryFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Expiries</option>
            <option value="soon">Expiring Soon (&lt;90 days)</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Medicine Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6">Salt Composition</th>
                <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => toggleSort('category')}>
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white text-right" onClick={() => toggleSort('stock_quantity')}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6 text-right">Selling Price</th>
                <th className="py-4 px-6">Batch No</th>
                <th className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => toggleSort('expiry_date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Expiry</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32"></div></td>
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div></td>
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div></td>
                    <td className="py-5 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto"></div></td>
                    <td className="py-5 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto"></div></td>
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></td>
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                    <td className="py-5 px-6"><div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-20 mx-auto"></div></td>
                  </tr>
                ))
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 px-6 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">No Medicines Found</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Create medicine cards manually or import your supplier Excel lists via CSV format.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                medicines.map((med) => {
                  const today = new Date();
                  const expDate = new Date(med.expiry_date);
                  const isExpired = expDate < today;
                  const ninetyDays = new Date();
                  ninetyDays.setDate(today.getDate() + 90);
                  const isExpiringSoon = expDate >= today && expDate <= ninetyDays;
                  const isLowStock = med.stock_quantity > 0 && med.stock_quantity <= med.reorder_threshold;
                  const isOutOfStock = med.stock_quantity <= 0;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                      <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                        {med.name}
                      </td>
                      <td className="py-4 px-6 truncate max-w-[150px]" title={med.salt_composition}>
                        {med.salt_composition || '—'}
                      </td>
                      <td className="py-4 px-6">
                        {med.category ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {med.category}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold ${
                            isOutOfStock ? 'text-rose-500' : isLowStock ? 'text-amber-500' : 'text-slate-950 dark:text-slate-100'
                          }`}>
                            {med.stock_quantity}
                          </span>
                          {isOutOfStock && (
                            <span className="text-[10px] text-rose-500 font-semibold uppercase">Out of Stock</span>
                          )}
                          {isLowStock && (
                            <span className="text-[10px] text-amber-500 font-semibold uppercase">Low Stock</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold">
                        ₹{parseFloat(med.selling_price).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        {med.batch_number}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className={isExpired ? 'text-rose-500 font-semibold' : isExpiringSoon ? 'text-amber-500 font-semibold' : ''}>
                            {med.expiry_date}
                          </span>
                          {isExpired && (
                            <span className="text-[10px] text-rose-500 font-semibold uppercase">Expired</span>
                          )}
                          {isExpiringSoon && (
                            <span className="text-[10px] text-amber-500 font-semibold uppercase font-mono">Expiring Soon</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(med)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(med.id)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && totalCount > 0 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(totalCount, page * pageSize)}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span> medicines
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => (page * pageSize < totalCount ? p + 1 : p))}
                disabled={page * pageSize >= totalCount}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals: Add & Edit Medicine */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-955/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 glass-panel animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditModalOpen ? 'Edit Medicine details' : 'Add New Medicine'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Salt Composition
                  </label>
                  <input
                    type="text"
                    name="salt_composition"
                    value={form.salt_composition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={form.manufacturer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  >
                    <option value="">Select Category</option>
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Maximum Retail Price (MRP) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="mrp"
                    value={form.mrp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_price"
                    value={form.selling_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    value={form.purchase_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={form.stock_quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    name="batch_number"
                    value={form.batch_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={form.expiry_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Reorder Alert Threshold
                  </label>
                  <input
                    type="number"
                    name="reorder_threshold"
                    value={form.reorder_threshold}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {isEditModalOpen ? 'Save Changes' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 glass-panel animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-500" />
                <span>Bulk Import Medicines</span>
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportErrors([]);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-455">
                Upload your medicine logs in CSV format. You can download our templates to ensure header formatting matches before upload.
              </p>

              {/* Template Download */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-250 dark:border-slate-800/80 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">Sample CSV Template</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Contains standard schema layouts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerDownloadTemplate}
                  className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-600 font-semibold px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all flex flex-col items-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setImportFile(e.target.files[0])}
                  accept=".csv"
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {importFile ? importFile.name : 'Click to select CSV File'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Accepts .csv up to 10MB</p>
                </div>
              </div>

              {/* Errors log */}
              {importErrors.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-455">Parsing errors found:</p>
                  <ul className="list-disc list-inside text-[10px] text-rose-500 space-y-0.5">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setImportErrors([]);
                  }}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      <span>Importing...</span>
                    </>
                  ) : (
                    'Start Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
