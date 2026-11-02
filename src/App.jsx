import { useEffect, useState } from 'react';
import './Index.css';
import AuthDialog from './components/AuthDialog';
import AppShell from './components/AppShell';
import CartPanel from './components/CartPanel';
import { FullScreenLoader, Toast } from './components/Feedback';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import ActivityPage from './views/ActivityPage';
import MarketplacePage from './views/MarketplacePage';
import SuppliesPage from './views/SuppliesPage';
import ExpertsPage from './views/ExpertsPage';

const SKILLBRIDGE_HEALTH_PING_INTERVAL_MS = 10 * 60 * 1000;
const SKILLBRIDGE_HEALTH_PING_SESSION_KEY = 'agroconnect.skillBridgeHealthPingAt';
const SKILLBRIDGE_HEALTH_URL = import.meta.env.VITE_SKILLBRIDGE_HEALTH_URL || 'https://skillbridge-api-p6s9.onrender.com/health';
let lastSkillBridgeHealthPingAt = 0;

function pingSkillBridgeHealthIfDue() {
  const now = Date.now();
  let previousPing = lastSkillBridgeHealthPingAt;
  try { previousPing = Math.max(previousPing, Number(sessionStorage.getItem(SKILLBRIDGE_HEALTH_PING_SESSION_KEY)) || 0); } catch { /* Storage may be disabled. */ }
  if (now - previousPing < SKILLBRIDGE_HEALTH_PING_INTERVAL_MS) return;
  lastSkillBridgeHealthPingAt = now;
  try { sessionStorage.setItem(SKILLBRIDGE_HEALTH_PING_SESSION_KEY, String(now)); } catch { /* Storage may be disabled. */ }
  try {
    void fetch(SKILLBRIDGE_HEALTH_URL, { method: 'GET', mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(3500) }).catch(() => {});
  } catch { /* Health checks are intentionally silent and non-blocking. */ }
}

function Application() {
  const { loading, toast } = useApp();
  const [activePage, setActivePage] = useState('marketplace');
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => {
    const pingWhenVisible = () => { if (document.visibilityState === 'visible') pingSkillBridgeHealthIfDue(); };
    pingSkillBridgeHealthIfDue();
    document.addEventListener('visibilitychange', pingWhenVisible);
    return () => document.removeEventListener('visibilitychange', pingWhenVisible);
  }, []);
  if (loading.app) return <FullScreenLoader />;

  const page = activePage === 'experts' ? <ExpertsPage /> : activePage === 'supplies' ? <SuppliesPage /> : activePage === 'activity' ? <ActivityPage /> : <MarketplacePage />;
  return <><AppShell activePage={activePage} onNavigate={setActivePage} onCart={() => setCartOpen(true)}>{page}</AppShell><CartPanel open={cartOpen} onClose={() => setCartOpen(false)} /><AuthDialog /><Toast toast={toast} /></>;
}

export default function App() {
  return <AppProvider><Application /></AppProvider>;
}
