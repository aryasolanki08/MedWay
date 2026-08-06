import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  History as HistoryIcon,
  Receipt,
  Download,
  Calendar,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  Printer
} from 'lucide-react';

const History = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'purchases'
  const [bills, setBills] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);

  const triggerPrintReceipt = (invoice) => {
    setInvoiceToPrint(invoice);
    setTimeout(() => {
      window.print();
    }, 150);
  };

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
      const priceStr = `₹${parseFloat(item.unit_price).toFixed(2)}`;
      const subtotalStr = `₹${parseFloat(item.subtotal).toFixed(2)}`;

      const firstCol = medName.substring(0, 24).padEnd(25);
      const qtyCol = qtyStr.padEnd(7);
      const priceCol = priceStr.padEnd(10);
      output += `${firstCol}${qtyCol}${priceCol}${subtotalStr}\n`;
      output += ` (Batch: ${batch} • Exp: ${exp})\n`;
    });

    output += `${thinDivider}\n`;
    output += `TOTAL ITEMS : ${invoice.items?.length || 0}\n`;
    if (parseFloat(invoice.discount) > 0) {
      output += `DISCOUNT    : -₹${parseFloat(invoice.discount).toFixed(2)}\n`;
    }
    output += `GRAND TOTAL : ₹${parseFloat(invoice.total_amount).toFixed(2)}\n`;
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

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expandable row details
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await api.get('/api/billing/bills/');
        setBills(res.data);
      } else {
        const res = await api.get('/api/purchases/purchases/');
        setPurchases(res.data);
      }
    } catch (err) {
      showToast('Failed to load transaction history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setExpandedRow(null);
  }, [activeTab]);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Filter items
  const getFilteredItems = () => {
    const list = activeTab === 'sales' ? bills : purchases;
    return list.filter((item) => {
      // 1. Search Query
      const query = search.toLowerCase();
      let matchSearch = true;
      if (search) {
        if (activeTab === 'sales') {
          matchSearch =
            (item.customer_name || 'Walk-in Customer').toLowerCase().includes(query) ||
            String(item.id).includes(query);
        } else {
          matchSearch =
            item.distributor_name.toLowerCase().includes(query) ||
            String(item.id).includes(query);
        }
      }

      // 2. Date filters
      let matchDate = true;
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      if (startDate && itemDate < startDate) matchDate = false;
      if (endDate && itemDate > endDate) matchDate = false;

      return matchSearch && matchDate;
    });
  };

  const filteredItems = getFilteredItems();

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      showToast('No records to export.', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeTab === 'sales') {
      csvContent += 'Invoice ID,Customer Name,Phone,Discount,Total Amount,Date\n';
      filteredItems.forEach((bill) => {
        csvContent += `"${bill.id}","${bill.customer_name || 'Walk-in'}","${bill.customer_phone || ''}",${bill.discount},${bill.total_amount},"${bill.created_at}"\n`;
      });
    } else {
      csvContent += 'Purchase ID,Distributor Name,Total Amount,Date\n';
      filteredItems.forEach((p) => {
        csvContent += `"${p.id}","${p.distributor_name}",${p.total_amount},"${p.created_at}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medway_${activeTab}_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export file downloaded successfully.', 'success');
  };

  const handleExportExcel = async () => {
    try {
      const endpoint = activeTab === 'sales' ? '/api/billing/bills/export-excel/' : '/api/purchases/purchases/export-excel/';
      
      const params = {};
      if (search) params.search = search;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      showToast('Generating Excel report...', 'info');
      
      const res = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medway_${activeTab}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Excel report downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to download Excel report.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Download Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit and inspect previous billing activities and distributor logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'sales'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Sales Ledger
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'purchases'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Purchases (Stock-In)
        </button>
      </div>

      {/* Search and Date Filter controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm glass-panel flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'sales'
                ? 'Search by Invoice ID or Customer Name...'
                : 'Search by Purchase ID or Distributor Name...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto text-xs font-semibold">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800 dark:text-white"
            />
          </div>
          <span className="text-slate-400">to</span>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">
                  {activeTab === 'sales' ? 'Customer Details' : 'Distributor'}
                </th>
                <th className="py-4 px-6 text-right">Total Amount</th>
                {activeTab === 'sales' && <th className="py-4 px-6 text-right">Discount</th>}
                <th className="py-4 px-6">Date / Time</th>
                <th className="py-4 px-6 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-8"></div></td>
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32"></div></td>
                    <td className="py-5 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto"></div></td>
                    {activeTab === 'sales' && (
                      <td className="py-5 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto"></div></td>
                    )}
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                    <td className="py-5 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'sales' ? 6 : 5} className="py-12 px-6 text-center text-slate-455 text-xs">
                    No transactions match the selected filters or date ranges.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-300">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        #{item.id}
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        {activeTab === 'sales' ? (
                          <div>
                            <p className="text-slate-900 dark:text-white">
                              {item.customer_name || 'Walk-in Customer'}
                            </p>
                            {item.customer_phone && (
                              <p className="text-[10px] text-slate-455">{item.customer_phone}</p>
                            )}
                          </div>
                        ) : (
                          item.distributor_name
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-950 dark:text-white">
                        ₹{parseFloat(item.total_amount).toFixed(2)}
                      </td>
                      {activeTab === 'sales' && (
                        <td className="py-4 px-6 text-right text-rose-500 font-semibold">
                          {parseFloat(item.discount) > 0 ? `-₹${parseFloat(item.discount).toFixed(2)}` : '—'}
                        </td>
                      )}
                      <td className="py-4 px-6 text-slate-555">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toggleRow(item.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {expandedRow === item.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Invoice Details */}
                    {expandedRow === item.id && (
                      <tr>
                        <td colSpan={activeTab === 'sales' ? 6 : 5} className="bg-slate-50/50 dark:bg-slate-950/20 p-6 border-b border-slate-250 dark:border-slate-800/80">
                          <div className="max-w-xl space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Transaction Line Items
                            </h4>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                                    <th className="p-3">Medicine Name</th>
                                    <th className="p-3 text-center">Quantity</th>
                                    <th className="p-3 text-right">
                                      {activeTab === 'sales' ? 'Unit Price' : 'Unit Cost'}
                                    </th>
                                    <th className="p-3 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {item.items?.map((line) => (
                                    <tr key={line.id}>
                                      <td className="p-3">
                                        <p className="font-semibold text-slate-800 dark:text-white">
                                          {line.medicine?.name || 'Unknown'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          Batch: {line.medicine?.batch_number}
                                        </p>
                                      </td>
                                      <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-300">
                                        {line.quantity}
                                      </td>
                                      <td className="p-3 text-right font-medium">
                                        ₹
                                        {parseFloat(
                                          activeTab === 'sales' ? line.unit_price : line.unit_cost
                                        ).toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right font-bold text-slate-950 dark:text-white">
                                        ₹
                                        {parseFloat(
                                          activeTab === 'sales'
                                            ? line.subtotal
                                            : line.quantity * line.unit_cost
                                        ).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {activeTab === 'sales' && (
                              <div className="flex gap-3 pt-4 justify-end">
                                <button
                                  onClick={() => triggerPrintReceipt(item)}
                                  className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span>Print / Save PDF</span>
                                </button>
                                <button
                                  onClick={() => downloadInvoiceText(item)}
                                  className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                  <span>Download Bill</span>
                                </button>
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
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

          {/* Totals */}
          <div className="text-right space-y-1 mt-4">
            {parseFloat(invoiceToPrint.discount) > 0 && (
              <div>Discount: -₹{parseFloat(invoiceToPrint.discount).toFixed(2)}</div>
            )}
            <div className="text-sm font-extrabold">Grand Total: ₹{parseFloat(invoiceToPrint.total_amount).toFixed(2)}</div>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-dashed border-black pt-4 mt-6">
            <p className="font-bold">Thank you for your visit!</p>
            <p className="text-[8px] text-slate-500 mt-1">MedWay Medicals POS</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
