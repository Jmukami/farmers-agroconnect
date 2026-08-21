import './Inputs.css';
import React, { useState } from 'react';

const INITIAL_INPUTS = [
  { id: 1, name: 'Hybrid Maize Seed', price: 450, unit: 'kg', icon: '🌽' },
  { id: 2, name: 'Organic Fertilizer', price: 1200, unit: 'bag', icon: '🧪' },
  { id: 3, name: 'Pesticide Shield', price: 850, unit: 'litre', icon: '🔫' },
  { id: 4, name: 'Tomato Seedlings', price: 15, unit: 'piece', icon: '🍅' },
  { id: 5, name: 'Animal Feed Supplements', price: 2300, unit: 'sack', icon: '🐄' },
  { id: 6, name: 'Drip Irrigation Kit', price: 4500, unit: 'set', icon: '💧' },
  { id: 7, name: 'Fungicide Powder', price: 650, unit: 'packet', icon: '🍄' },
  { id: 8, name: 'Poultry Feed Crumbles', price: 1850, unit: 'bag', icon: '🐓' }
];

export default function Inputs({ user, onVerificationSuccess }) {
  const [cart, setCart] = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const addToCart = (id) => {
    const item = INITIAL_INPUTS.find((i) => i.id === id);
    setCart((prevCart) => [...prevCart, { ...item }]);
  };

  const handleCheckout = () => {
    if (!user) {
      alert('Please register first!');
      return;
    }

    setOrderSuccess(true);
    
    if (onVerificationSuccess) {
      onVerificationSuccess('✅ Order placed! You are now verified.');
    }

    setCart([]);
    setTimeout(() => {
      setOrderSuccess(false);
    }, 3000);
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="page inputs-page">
      <div className="page-header">
        <h1>Farm Inputs</h1>
        <p>Quality inputs for maximum productivity</p>
      </div>

      {orderSuccess && (
        <div className="alert-success">
          ✅ Order placed! You are now verified.
        </div>
      )}

      <div className="grid">
        {INITIAL_INPUTS.map((item) => (
          <div className="card" key={item.id}>
            <div className="icon">{item.icon}</div>
            <h3>{item.name}</h3>
            <div className="price">KSh {item.price} / {item.unit}</div>
            <button className="btn btn-primary" onClick={() => addToCart(item.id)}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="cart-summary">
          <div>
            <strong>Cart:</strong> {cart.length} items
          </div>
          <div>
            <strong>Total:</strong> KSh {totalCartPrice}
          </div>
          <button className="btn btn-success" onClick={handleCheckout}>
            Checkout & Verify
          </button>
        </div>
      )}
    </div>
  );
}