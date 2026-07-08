import React, { createContext, useContext, useEffect, useState } from 'react';
import * as customerService from '../services/customerService';
import * as mealService from '../services/mealService';
import * as salesService from '../services/salesService';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { isAuthenticated, isPlatformAdmin, currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    if (!isAuthenticated || isPlatformAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [cResult, mResult, sResult] = await Promise.allSettled([
        customerService.getCustomers(),
        mealService.getMeals(),
        salesService.getSales(),
      ]);

      setCustomers(cResult.status === 'fulfilled' ? cResult.value || [] : []);
      setMeals(mResult.status === 'fulfilled' ? mResult.value || [] : []);
      setSales(sResult.status === 'fulfilled' ? sResult.value || [] : []);

      const failed = [cResult, mResult, sResult].filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        const messages = failed.map((r) => r.reason?.message || 'Failed to load data');
        const isNetwork = messages.some((m) =>
          /failed to fetch|network|load failed/i.test(m)
        );
        setError(
          isNetwork
            ? 'Could not connect to the server. Check your internet connection and Supabase settings.'
            : messages.join('; ')
        );
      }
    } catch (err) {
      console.error('loadData error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isPlatformAdmin && currentUser?.tenantId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isPlatformAdmin, currentUser?.tenantId]);

  const refreshData = () => loadData();

  const value = {
    customers,
    setCustomers,
    meals,
    setMeals,
    sales,
    setSales,
    loading,
    error,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}
