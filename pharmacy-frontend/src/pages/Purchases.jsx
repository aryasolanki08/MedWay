import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, ShoppingBag, Truck, Calendar, Save, ArrowLeft } from 'lucide-react';

const Purchases = () => {
  const { showToast } = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [distributorName, setDistributorName] = useState('');
  const [items, setItems] = useState([
    { medicine_id: '', quantity: '', unit_cost: '' }
  ]);

  // Fetch medicines for dropdown selection
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await api.get('/api/inventory/medicines/');
        setMedicines(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMedicines();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { medicine_id: '', quantity: '', unit_cost: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      showToast('At least one item row must be provided.', 'warning');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const calculatedTotal = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const cost = parseFloat(item.unit_cost) || 0;
    return sum + (qty * cost);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!distributorName.trim()) {
      showToast('Please enter distributor name.', 'warning');
      return;
    }

    const invalidItem = items.some(item => !item.medicine_id || !item.quantity || !item.unit_cost);
    if (invalidItem) {
      showToast('Please fill all item rows completely.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const itemsPayload = items.map(item => ({
        medicine_id: parseInt(item.medicine_id),
        quantity: parseInt(item.quantity),
        unit_cost: parseFloat(item.unit_cost)
      }));

      const payload = {
        distributor_name: distributorName.trim(),
        total_amount: calculatedTotal,
        items: itemsPayload
      };

      await api.post('/api/purchases/purchases/', payload);
      showToast('Purchase Bill recorded. Stock updated successfully.', 'success');
      
      // Reset Form
      setDistributorName('');
      setItems([{ medicine_id: '', quantity: '', unit_cost: '' }]);
    } catch (err) {
      showToast('Failed to save purchase bill. Check fields.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log supplier purchases to automatically update inventory levels.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm glass-panel max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Distributor Header details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Distributor / Wholesaler Name *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Truck className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  value={distributorName}
                  onChange={(e) => setDistributorName(e.target.value)}
                  placeholder="E.g. McKesson Pharmacy Supplies"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Entry Date
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Calendar className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-500" />
                <span>Purchased items</span>
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-600 font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row items-center gap-3 bg-slate-50/55 dark:bg-slate-800/15 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                  {/* Select Medicine */}
                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 mb-1">
                      Medicine
                    </label>
                    <select
                      value={item.medicine_id}
                      onChange={(e) => handleItemChange(index, 'medicine_id', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                      required
                    >
                      <option value="">Select Medicine</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Batch: {m.batch_number} • Current stock: {m.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 mb-1">
                      Quantity (Stock-In)
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                      required
                    />
                  </div>

                  {/* Cost Price */}
                  <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-455 mb-1">
                      Unit Cost (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                      required
                    />
                  </div>

                  {/* Action */}
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    className="mt-5 p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Aggregate sum and Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-6 gap-4">
            <div className="text-left">
              <span className="text-xs text-slate-500 dark:text-slate-455">Total Purchase cost:</span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">₹{calculatedTotal.toFixed(2)}</h3>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 font-bold px-6 py-3 rounded-xl shadow-sm transition-all text-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Purchase Receipt</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Purchases;
