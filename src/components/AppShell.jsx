import { useState } from 'react';
import { useApp } from '../context/useApp';
import Icon from './Icon';

const links = [
  { id: 'marketplace', label: 'Produce market' },
  { id: 'supplies', label: 'Inputs & services' },
  { id: 'activity', label: 'My activity' },
];

export default function AppShell({ activePage, onNavigate, onCart, children }) {
  const { user, cart, setAuthDialog, signOut } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const navigate = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="wordmark" onClick={() => navigate('marketplace')} aria-label="AgroConnect home">AgroConnect</button>
          <button className="menu-toggle icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={menuOpen}><Icon name="menu" /></button>
          <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
            {links.map((link) => <button key={link.id} className={activePage === link.id ? 'nav-link is-active' : 'nav-link'} onClick={() => navigate(link.id)}>{link.label}</button>)}
          </nav>
          <div className="header-actions">
            <button className="cart-button" onClick={onCart} aria-label={`Open order, ${cartCount} items`}>
              <Icon name="basket" size={19} /> <span>Order</span>{cartCount > 0 && <b>{cartCount}</b>}
            </button>
            {user ? (
              <div className="account-actions">
                <button className="account-name" onClick={() => navigate('activity')}><Icon name="user" size={18} />{user.fullName}</button>
                <button className="icon-button desktop-only" onClick={signOut} aria-label="Sign out"><Icon name="logout" size={18} /></button>
              </div>
            ) : <button className="button button-secondary" onClick={() => setAuthDialog('login')}>Sign in</button>}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer"><span>AgroConnect</span><span>Local produce, farm inputs and practical services.</span></footer>
    </div>
  );
}
