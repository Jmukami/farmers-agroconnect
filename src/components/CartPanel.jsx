import { useState } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useApp } from '../context/useApp';
import Icon from './Icon';
import { EmptyState } from './Feedback';
import { formatKsh } from '../utils/format';

export default function CartPanel({ open, onClose }) {
  const { cart, token, requireAuth, updateCartQuantity, removeFromCart, clearCart, refreshListings, showToast } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!open) return null;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const placeOrder = () => requireAuth(async (currentSession) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('/orders', { method: 'POST', token: currentSession?.token || token, body: { items: cart.map((item) => ({ id: item.id, type: item.type, quantity: item.quantity })) } });
      clearCart();
      await Promise.all([refreshListings('produce'), refreshListings('products')]);
      showToast(`Order #${response.order.id} has been placed.`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) showToast(error.message, 'error');
      else showToast('Unable to place your order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, 'login');

  return (
    <aside className="cart-panel" aria-label="Your order">
      <div className="cart-header"><div><p className="eyebrow">Order draft</p><h2>Your order</h2></div><button className="icon-button" onClick={onClose} aria-label="Close order"><Icon name="close" /></button></div>
      {cart.length === 0 ? <EmptyState title="Your order is empty" detail="Add produce, inputs or services while you browse." /> : <>
        <div className="cart-lines">
          {cart.map((item) => <div className="cart-line" key={`${item.type}-${item.id}`}>
            <div><h3>{item.title}</h3><p>{formatKsh(item.price)} / {item.unit}</p></div>
            <div className="quantity-control"><button onClick={() => updateCartQuantity(item.id, item.type, item.quantity - 1)} aria-label={`Decrease ${item.title} quantity`}>−</button><span>{item.quantity}</span><button onClick={() => updateCartQuantity(item.id, item.type, item.quantity + 1)} disabled={item.quantity >= (item.maxQuantity ?? item.quantity)} aria-label={`Increase ${item.title} quantity`}>+</button></div>
            <button className="remove-line" onClick={() => removeFromCart(item.id, item.type)} aria-label={`Remove ${item.title}`}><Icon name="trash" size={17} /></button>
          </div>)}
        </div>
        <div className="cart-total"><span>Total</span><strong>{formatKsh(total)}</strong></div>
        <p className="cart-note">You can browse freely. Signing in is only required to place this order.</p>
        <button className="button button-primary button-full" onClick={placeOrder} disabled={isSubmitting}>{isSubmitting ? 'Placing order…' : 'Place order'}</button>
      </>}
    </aside>
  );
}
