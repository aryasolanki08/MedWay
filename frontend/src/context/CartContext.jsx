import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "./ToastContext.jsx";

const CartContext = createContext();
const STORAGE_KEY = "medway_cart";

function loadStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pharmacyId: null, pharmacyName: null, items: [] };
    return JSON.parse(raw);
  } catch {
    return { pharmacyId: null, pharmacyName: null, items: [] };
  }
}

// A cart only ever holds items from one pharmacy at a time -- delivery
// comes from a single store, same constraint real quick-commerce apps
// enforce, and it's what keeps checkout (and the order payload) simple:
// one Order per pharmacy, not a split basket. Persisted to localStorage
// so it survives a page reload/new tab, not just in-memory React state.
export const CartProvider = ({ children }) => {
  const toast = useToast();
  const initial = loadStoredCart();
  const [pharmacyId, setPharmacyId] = useState(initial.pharmacyId);
  const [pharmacyName, setPharmacyName] = useState(initial.pharmacyName);
  const [items, setItems] = useState(initial.items); // [{ stock_id, brand_name, price, quantity, maxQuantity }]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pharmacyId, pharmacyName, items }));
  }, [pharmacyId, pharmacyName, items]);

  const clear = () => {
    setItems([]);
    setPharmacyId(null);
    setPharmacyName(null);
  };

  const addItem = (item) => {
    if (pharmacyId && pharmacyId !== item.pharmacy_id) {
      const ok = window.confirm(
        `Your cart has items from ${pharmacyName}. Start a new cart for ${item.pharmacy_name} instead?`
      );
      if (!ok) return;
      setItems([]);
    }
    setPharmacyId(item.pharmacy_id);
    setPharmacyName(item.pharmacy_name);
    setItems((prev) => {
      const existing = prev.find((i) => i.stock_id === item.stock_id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, item.quantity);
        return prev.map((i) => (i.stock_id === item.stock_id ? { ...i, quantity: nextQty } : i));
      }
      return [
        ...prev,
        {
          stock_id: item.stock_id,
          brand_name: item.brand_name,
          price: item.price,
          quantity: 1,
          maxQuantity: item.quantity,
        },
      ];
    });
    toast.success(`${item.brand_name} added to cart`);
  };

  const updateQuantity = (stockId, quantity) => {
    setItems((prev) =>
      prev
        .map((i) => (i.stock_id === stockId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (stockId) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.stock_id !== stockId);
      if (next.length === 0) {
        setPharmacyId(null);
        setPharmacyName(null);
      }
      return next;
    });
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ pharmacyId, pharmacyName, items, total, count, addItem, updateQuantity, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
