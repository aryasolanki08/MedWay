import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Inbox, CheckCircle2, XCircle, Truck, PackageCheck, MapPin, Phone } from 'lucide-react';

const STATUS_STYLE = {
  placed: 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  accepted: 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
  rejected: 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30',
  out_for_delivery: 'bg-sky-100 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/30',
  delivered: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

const STATUS_LABEL = {
  placed: 'New order',
  accepted: 'Accepted',
  rejected: 'Rejected',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

const Orders = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders/');
      setOrders(res.data);
    } catch (err) {
      showToast('Failed to load orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // New orders arrive via webhook whenever a customer pays, so poll
    // rather than requiring a manual refresh to see them show up.
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const act = async (order, action, successMessage) => {
    setActingOn(order.id);
    try {
      await api.post(`/api/orders/${order.id}/${action}/`);
      showToast(successMessage, 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Action failed.', 'error');
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mt-12" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Incoming Orders</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Prepaid home-delivery orders from the customer app -- accept to bill and reserve stock, reject if you can't fulfill it.
        </p>
      </div>

      {orders.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center text-center gap-3">
          <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No orders yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-white">{order.customer_name || 'Customer'}</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[order.status]}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <MapPin className="h-3.5 w-3.5" /> {order.delivery_address}
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-800 dark:text-white">₹{parseFloat(order.total_amount).toFixed(2)}</div>
                <div className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{item.medicine_name} x {item.quantity}</span>
                  <span>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {order.status === 'placed' && (
              <div className="flex gap-2">
                <button
                  onClick={() => act(order, 'accept', 'Order accepted -- bill generated and stock reserved.')}
                  disabled={actingOn === order.id}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" /> Accept
                </button>
                <button
                  onClick={() => act(order, 'reject', 'Order rejected.')}
                  disabled={actingOn === order.id}
                  className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            )}

            {order.status === 'accepted' && (
              <button
                onClick={() => act(order, 'out-for-delivery', 'Marked out for delivery.')}
                disabled={actingOn === order.id}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                <Truck className="h-4 w-4" /> Out for delivery
              </button>
            )}

            {order.status === 'out_for_delivery' && (
              <button
                onClick={() => act(order, 'mark-delivered', 'Marked delivered.')}
                disabled={actingOn === order.id}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                <PackageCheck className="h-4 w-4" /> Mark delivered
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
