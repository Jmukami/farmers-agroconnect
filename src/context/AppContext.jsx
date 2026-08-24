import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import StoreContext from './StoreContext';

const SESSION_KEY = 'agroconnect-session';
const CART_KEY = 'agroconnect-cart';

function restore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => restore(SESSION_KEY, null));
  const [catalogs, setCatalogs] = useState({ produce: [], products: [] });
  const [loading, setLoading] = useState({ app: true, produce: true, products: true });
  const [cart, setCart] = useState(() => restore(CART_KEY, []));
  const [authDialog, setAuthDialog] = useState(null);
  const [afterAuthAction, setAfterAuthAction] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const refreshListings = useCallback(async (type) => {
    const key = type === 'produce' ? 'produce' : 'products';
    setLoading((current) => ({ ...current, [key]: true }));
    try {
      const response = await apiRequest(key === 'produce' ? '/produce' : '/products');
      setCatalogs((current) => ({ ...current, [key]: response.listings }));
      return response.listings;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  }, [showToast]);

  useEffect(() => {
    let isCurrent = true;
    async function initialise() {
      try {
        const [produce, products] = await Promise.all([
          apiRequest('/produce'),
          apiRequest('/products'),
        ]);
        if (isCurrent) setCatalogs({ produce: produce.listings, products: products.listings });
        if (session?.token) {
          try {
            const response = await apiRequest('/auth/me', { token: session.token });
            if (isCurrent) setSession((current) => ({ ...current, user: response.user }));
          } catch {
            if (isCurrent) {
              setSession(null);
              localStorage.removeItem(SESSION_KEY);
            }
          }
        }
      } catch (error) {
        if (isCurrent) showToast(error.message, 'error');
      } finally {
        if (isCurrent) setLoading({ app: false, produce: false, products: false });
      }
    }
    initialise();
    return () => { isCurrent = false; };
  }, [session?.token, showToast]);

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const completeAuth = useCallback((nextSession) => {
    setSession(nextSession);
    setAuthDialog(null);
    const nextAction = afterAuthAction;
    setAfterAuthAction(null);
    if (nextAction) window.setTimeout(() => nextAction(nextSession), 0);
  }, [afterAuthAction]);

  const requireAuth = useCallback((action, mode = 'login') => {
    if (session?.token) return action(session);
    setAfterAuthAction(() => action);
    setAuthDialog(mode);
    return undefined;
  }, [session]);

  const addToCart = useCallback((listing, type) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === listing.id && item.type === type);
      if (existing) return current.map((item) => item === existing ? { ...item, maxQuantity: listing.quantity, quantity: Math.min(item.quantity + 1, listing.quantity) } : item);
      return [...current, { ...listing, type, maxQuantity: listing.quantity, quantity: 1 }];
    });
    showToast(`${listing.title} added to your order.`);
  }, [showToast]);

  const updateCartQuantity = useCallback((id, type, quantity) => {
    setCart((current) => current
      .map((item) => item.id === id && item.type === type ? { ...item, quantity: Math.max(0, Math.min(quantity, item.maxQuantity ?? item.quantity)) } : item)
      .filter((item) => item.quantity > 0));
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    token: session?.token || null,
    catalogs,
    loading,
    cart,
    authDialog,
    toast,
    setAuthDialog,
    showToast,
    completeAuth,
    requireAuth,
    refreshListings,
    addToCart,
    updateCartQuantity,
    removeFromCart: (id, type) => setCart((current) => current.filter((item) => item.id !== id || item.type !== type)),
    clearCart: () => setCart([]),
    signOut: () => {
      setSession(null);
      showToast('You have been signed out.');
    },
  }), [session, catalogs, loading, cart, authDialog, toast, showToast, completeAuth, requireAuth, refreshListings, addToCart, updateCartQuantity]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
