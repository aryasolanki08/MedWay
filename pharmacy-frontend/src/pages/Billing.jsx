import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Printer,
  ChevronDown,
  Percent,
  X,
  CreditCard,
  Keyboard,
  Download
} from 'lucide-react';

const Billing = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allMedicines, setAllMedicines] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0); // overall discount in dollars/rupees
  const [loading, setLoading] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

  // Print state
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);

  const downloadInvoiceText = (invoice) => {
    const storeName = (user?.pharmacy?.name || 'MedWay Medicals').toUpperCase();
    const address = user?.pharmacy?.address || 'Store Address';
    const phone = user?.pharmacy?.phone || 'N/A';
    const license = user?.pharmacy?.license_number || 'N/A';
    const divider = '='.repeat(50);
    const thinDivider = '-'.repeat(50);

    let output = `${divider}\n`;
    output += storeName.padStart(Math.floor((50 + storeName.length) / 2)).padEnd(50) + '\n';
    output += address.padStart(Math.floor((50 + address.length) / 2)).padEnd(50) + '\n';
    output += `Ph: ${phone} • DL: ${license}`.padStart(Math.floor((50 + `Ph: ${phone} • DL: ${license}`.length) / 2)).padEnd(50) + '\n';
    output += `${divider}\n\n`;

    output += `INVOICE NO : #${invoice.id}\n`;
    output += `DATE       : ${new Date(invoice.created_at).toLocaleString()}\n`;
    output += `CUSTOMER   : ${invoice.customer_name || 'Walk-in'}\n`;
    if (invoice.customer_phone) {
      output += `PHONE      : ${invoice.customer_phone}\n`;
    }
    output += `STAFF      : ${invoice.created_by_username || 'Staff'}\n`;
    output += `${thinDivider}\n`;
    output += `ITEM DETAILS             QTY    PRICE      TOTAL\n`;
    output += `${thinDivider}\n`;

    invoice.items?.forEach((item) => {
      const medName = item.medicine?.name || 'Unknown Medicine';
      const batch = item.medicine?.batch_number || 'N/A';
      const exp = item.medicine?.expiry_date || 'N/A';
      
      const qtyStr = String(item.quantity);
      const priceStr = `$${parseFloat(item.unit_price).toFixed(2)}`;
      const subtotalStr = `$${parseFloat(item.subtotal).toFixed(2)}`;

      const firstCol = medName.substring(0, 24).padEnd(25);
      const qtyCol = qtyStr.padEnd(7);
      const priceCol = priceStr.padEnd(10);
      output += `${firstCol}${qtyCol}${priceCol}${subtotalStr}\n`;
      output += ` (Batch: ${batch} • Exp: ${exp})\n`;
    });

    output += `${thinDivider}\n`;
    output += `TOTAL ITEMS : ${invoice.items?.length || 0}\n`;
    if (parseFloat(invoice.discount) > 0) {
      output += `DISCOUNT    : -$${parseFloat(invoice.discount).toFixed(2)}\n`;
    }
    output += `GRAND TOTAL : $${parseFloat(invoice.total_amount).toFixed(2)}\n`;
    output += `${divider}\n`;
    output += `            THANK YOU FOR YOUR VISIT              \n`;
    output += `${divider}\n`;

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${invoice.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Refs
  const searchInputRef = useRef(null);

  // Focus search input on F2 or '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        showToast('POS search focused.', 'info');
      }
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);

  // Fetch all medicines on mount for instant barcode scan resolution
  const fetchAllMedicines = async () => {
    try {
      const res = await api.get('/api/inventory/medicines/');
      setAllMedicines(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllMedicines();
  }, []);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter medicines locally in real-time
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const filtered = allMedicines.filter(
      (m) =>
        m.stock_quantity > 0 &&
        (m.name.toLowerCase().includes(query) ||
          m.salt_composition.toLowerCase().includes(query) ||
          m.batch_number.toLowerCase().includes(query))
    );
    setSearchResults(filtered);
    setActiveSearchIndex(0);
  }, [searchQuery, allMedicines]);

  // Handle keyboard navigation in search results
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (searchResults.length === 0) return;
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      if (searchResults.length === 0) return;
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim().toLowerCase();
      if (!query) return;

      // Detect exact batch match (barcode scan)
      const exactMatch = allMedicines.find(
        (m) => m.stock_quantity > 0 && m.batch_number.toLowerCase() === query
      );

      if (exactMatch) {
        const tier = user?.pharmacy?.subscription_tier;
        if (tier === 'solo') {
          showToast("Barcode/batch scanning is a premium feature. Please upgrade to Smart Pharmacy plan.", "warning");
          return;
        }
        addToCart(exactMatch);
        return;
      }

      // Fallback: Add active suggestion
      if (searchResults.length > 0 && activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
        addToCart(searchResults[activeSearchIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const addToCart = (med) => {
    // Check if already in cart
    const existing = cart.find((item) => item.medicine.id === med.id);
    if (existing) {
      if (existing.quantity >= med.stock_quantity) {
        showToast(`Stock limit reached! Only ${med.stock_quantity} units available.`, 'warning');
        return;
      }
      setCart(
        cart.map((item) =>
          item.medicine.id === med.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * parseFloat(item.unit_price) }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          medicine: med,
          quantity: 1,
          unit_price: med.selling_price,
          subtotal: parseFloat(med.selling_price)
        }
      ]);
    }
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const updateQuantity = (id, newQty) => {
    const item = cart.find((i) => i.medicine.id === id);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }

    if (newQty > item.medicine.stock_quantity) {
      showToast(`Only ${item.medicine.stock_quantity} units of ${item.medicine.name} in stock.`, 'warning');
      return;
    }

    setCart(
      cart.map((i) =>
        i.medicine.id === id
          ? { ...i, quantity: newQty, subtotal: newQty * parseFloat(i.unit_price) }
          : i
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.medicine.id !== id));
  };

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = Math.max(0, subtotal - parseFloat(discount || 0));

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add medicines first.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const itemsPayload = cart.map((item) => ({
        medicine_id: item.medicine.id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        subtotal: item.subtotal
      }));

      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || null,
        discount: parseFloat(discount || 0),
        total_amount: total,
        items: itemsPayload
      };

      const res = await api.post('/api/billing/bills/', payload);
      showToast(`Bill saved successfully! Invoice #${res.data.id} created.`, 'success');
      
      // Save for print preview
      setInvoiceToPrint(res.data);
      
      // Clear POS
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      fetchAllMedicines();
    } catch (err) {
      const errMsg = err.response?.data?.items || 'Checkout failed. Verify inventory levels.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const triggerPrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Checkout Area Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: POS Cart and Search */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Keyboard Helper Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 font-medium">
            <span className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              <span>
                Use keyboard shortcuts for fast billing
                {user?.pharmacy?.subscription_tier === 'solo' && " (Barcode scanner disabled - Upgrade to Smart)"}
              </span>
            </span>
            <span>
              Press <kbd className="bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded font-bold">F2</kbd> or <kbd className="bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded font-bold">/</kbd> to Search
            </span>
          </div>

          {/* Medicine Search Area */}
          <div className="relative z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Search Medicines
            </h3>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name, salt, or batch code..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
              />

              {/* Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((med, idx) => (
                    <div
                      key={med.id}
                      onClick={() => addToCart(med)}
                      className={`flex items-center justify-between p-3.5 cursor-pointer text-xs transition-colors border-b border-slate-100 dark:border-slate-800/80 ${
                        idx === activeSearchIndex
                          ? 'bg-emerald-500 text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355'
                      }`}
                    >
                      <div>
                        <p className={`font-bold ${idx === activeSearchIndex ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {med.name}
                        </p>
                        <p className={`mt-0.5 ${idx === activeSearchIndex ? 'text-emerald-100' : 'text-slate-550'}`}>
                          Batch: {med.batch_number} • Salt: {med.salt_composition || 'N/A'} • Exp: {med.expiry_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${idx === activeSearchIndex ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                          ${parseFloat(med.selling_price).toFixed(2)}
                        </span>
                        <p className={`mt-0.5 font-bold ${
                          idx === activeSearchIndex
                            ? 'text-white'
                            : med.stock_quantity <= med.reorder_threshold ? 'text-amber-500' : 'text-slate-455'
                        }`}>
                          Stock: {med.stock_quantity} Left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* POS Cart List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden glass-panel">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                <span>Cart Overview</span>
              </h3>
              <span className="text-xs text-slate-555 font-bold">{cart.length} unique medicines</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-455 text-sm">
                  Cart is empty. Search medicines above to prepare customer invoice.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.medicine.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {item.medicine.name}
                      </p>
                      <p className="text-[10px] text-slate-455 mt-0.5">
                        Batch: {item.medicine.batch_number} • Salt: {item.medicine.salt_composition || 'N/A'} • Exp: {item.medicine.expiry_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-9 bg-slate-50/55 dark:bg-slate-800/20">
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                          className="px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 border-r border-slate-200 dark:border-slate-800"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.medicine.id, parseInt(e.target.value) || 0)}
                          className="w-10 text-center bg-transparent focus:outline-none font-bold text-slate-900 dark:text-white text-xs"
                        />
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                          className="px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 border-l border-slate-200 dark:border-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="text-right w-24">
                        <span className="font-bold text-slate-950 dark:text-white">
                          ₹{item.subtotal.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-455 mt-0.5">₹{parseFloat(item.unit_price).toFixed(2)} / unit</p>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.medicine.id)}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Customer Details & Checkout summary */}
        <div className="space-y-6">
          {/* Customer Profile Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-500" />
              <span>Customer Registry</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 mb-1">
                  Customer Phone (Optional)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary & Save */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm glass-panel space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Order Subtotal
            </h3>

            <div className="space-y-3 border-b border-slate-150 dark:border-slate-800 pb-4 text-xs font-semibold">
              <div className="flex justify-between text-slate-555">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="flex items-center justify-between text-slate-555 mb-1">
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                    placeholder="0.00"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-800 dark:text-white">Grand Total</span>
              <span className="text-2xl font-black text-emerald-500">
                ₹{total.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
              className="w-full bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 font-bold py-3.5 rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                <>
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>Issue Invoice & Checkout</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Print Drawer */}
          {invoiceToPrint && (
            <div className="bg-slate-100 dark:bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl flex flex-col gap-4 text-center">
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wide">Invoice successfully issued!</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Invoice #{invoiceToPrint.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={triggerPrintReceipt}
                  className="flex-1 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 py-2.5 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => downloadInvoiceText(invoiceToPrint)}
                  className="flex-1 border border-slate-205 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Bill</span>
                </button>
                <button
                  onClick={() => setInvoiceToPrint(null)}
                  className="px-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-205/50 dark:hover:bg-slate-800 text-slate-550"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Hidden Print Container (Fills page only on print) */}
      {invoiceToPrint && (
        <div id="print-area" className="hidden p-8 bg-white text-black font-sans text-xs max-w-sm">
          {/* Header */}
          <div className="text-center border-b border-dashed border-black pb-4 mb-4">
            <h2 className="text-base font-extrabold">{user?.pharmacy?.name}</h2>
            <p className="text-[10px] mt-0.5">{user?.pharmacy?.address}</p>
            <p className="text-[10px] mt-0.5">Ph: {user?.pharmacy?.phone} • DL: {user?.pharmacy?.license_number}</p>
          </div>

          {/* Metadata */}
          <div className="space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Invoice No: <b>#{invoiceToPrint.id}</b></span>
              <span>Date: {new Date(invoiceToPrint.created_at).toLocaleDateString()}</span>
            </div>
            <div>Staff: {invoiceToPrint.created_by_username || 'Admin'}</div>
            <div className="border-t border-dashed border-black pt-1 mt-1">
              Customer: <b>{invoiceToPrint.customer_name}</b>
              {invoiceToPrint.customer_phone && <p>Phone: {invoiceToPrint.customer_phone}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-t border-b border-black py-2 my-2 text-[10px]">
            <thead>
              <tr className="border-b border-black font-bold">
                <th className="py-1">Item Details</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceToPrint.items?.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-1">
                    {item.medicine?.name}
                    <p className="text-[8px] text-slate-500 font-mono">B: {item.medicine?.batch_number}</p>
                  </td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                  <td className="py-1 text-right">₹{parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Aggregate Totals */}
          <div className="space-y-1 text-right text-[10px] border-b border-dashed border-black pb-4 mb-4">
            <div>Subtotal: ₹{parseFloat(invoiceToPrint.total_amount) + parseFloat(invoiceToPrint.discount)}.00</div>
            {parseFloat(invoiceToPrint.discount) > 0 && (
              <div>Discount: -₹{parseFloat(invoiceToPrint.discount).toFixed(2)}</div>
            )}
            <div className="text-xs font-black">Grand Total: ₹{parseFloat(invoiceToPrint.total_amount).toFixed(2)}</div>
          </div>

          <div className="text-center font-bold text-[10px]">
            Thank you for shopping with MedWay Medicals!
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
