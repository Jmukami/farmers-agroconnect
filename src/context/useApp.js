import { useContext } from 'react';
import StoreContext from './StoreContext';

export function useApp() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useApp must be used inside AppProvider.');
  return context;
}
