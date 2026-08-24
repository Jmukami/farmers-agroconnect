import { useState } from 'react';
import './index.css';
import AuthDialog from './components/AuthDialog';
import AppShell from './components/AppShell';
import CartPanel from './components/CartPanel';
import { FullScreenLoader, Toast } from './components/Feedback';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import ActivityPage from './views/ActivityPage';
import MarketplacePage from './views/MarketplacePage';
import SuppliesPage from './views/SuppliesPage';

function Application() {
  const { loading, toast } = useApp();
  const [activePage, setActivePage] = useState('marketplace');
  const [cartOpen, setCartOpen] = useState(false);
  if (loading.app) return <FullScreenLoader />;

  const page = activePage === 'supplies' ? <SuppliesPage /> : activePage === 'activity' ? <ActivityPage /> : <MarketplacePage />;
  return <><AppShell activePage={activePage} onNavigate={setActivePage} onCart={() => setCartOpen(true)}>{page}</AppShell><CartPanel open={cartOpen} onClose={() => setCartOpen(false)} /><AuthDialog /><Toast toast={toast} /></>;
}

export default function App() {
  return <AppProvider><Application /></AppProvider>;
}
