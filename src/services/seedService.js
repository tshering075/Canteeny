import { getFromStorage, setInStorage, STORAGE_KEYS } from './storage';
import { supabase } from '../lib/supabase';

export function seedData() {
  // No sample data - users add their own customers and meals
  if (supabase) return;
  // Ensure storage keys exist (empty arrays)
  const meals = getFromStorage(STORAGE_KEYS.MEALS, []);
  const customers = getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  const sales = getFromStorage(STORAGE_KEYS.SALES, []);
  if (meals.length === 0) setInStorage(STORAGE_KEYS.MEALS, []);
  if (customers.length === 0) setInStorage(STORAGE_KEYS.CUSTOMERS, []);
  if (sales.length === 0) setInStorage(STORAGE_KEYS.SALES, []);
}

export async function seedSupabaseIfEmpty() {
  // No sample data - users add their own
  return false;
}
