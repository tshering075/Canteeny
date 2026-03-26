import React, { createContext, useContext, useEffect, useState } from 'react';
import * as customerService from '../services/customerService';
import * as mealService from '../services/mealService';
import * as salesService from '../services/salesService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, m, s] = await Promise.all([
        customerService.getCustomers(),
        mealService.getMeals(),
        salesService.getSales(),
      ]);
      setCustomers(c || []);
      setMeals(m || []);
      setSales(s || []);
    } catch (err) {
      console.error('loadData error:', err);
      setError(err.message || 'Failed to load data');
      setCustomers([]);
      setMeals([]);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
