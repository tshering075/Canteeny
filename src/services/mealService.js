import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';

const toMeal = (row) =>
  row
    ? {
        id: row.id,
        name: row.name || '',
        category: row.category || 'General',
        price: Number(row.price) || 0,
        isActive: row.is_active !== false,
        createdAt: row.created_at,
      }
    : null;


export async function getMeals() {
  if (supabase) {
    const { data, error } = await supabase.from('meals').select('*').order('name');
    if (!error && data) {
      const list = data.map(toMeal);
      setInStorage(STORAGE_KEYS.MEALS, list);
      return list;
    }
  }
  return getFromStorage(STORAGE_KEYS.MEALS, []);
}

export async function addMeal(data) {
  const payload = {
    name: data.name?.trim() || '',
    category: data.category?.trim() || 'General',
    price: Number(data.price) || 0,
    is_active: data.isActive !== false,
  };
  let result = null;

  if (supabase) {
    const { data: row, error } = await supabase
      .from('meals')
      .insert(payload)
      .select()
      .single();
    if (!error) result = toMeal(row);
  }

  const meals = getFromStorage(STORAGE_KEYS.MEALS, []);
  const meal = {
    id: result?.id || generateId(),
    name: payload.name,
    category: payload.category,
    price: payload.price,
    isActive: payload.is_active,
    createdAt: result?.createdAt || new Date().toISOString(),
  };
  meals.push(meal);
  setInStorage(STORAGE_KEYS.MEALS, meals);
  return result || meal;
}

export async function updateMeal(id, data) {
  const updates = {
    name: data.name?.trim() ?? '',
    category: data.category?.trim() ?? 'General',
    price: Number(data.price) ?? 0,
    is_active: data.isActive !== false,
  };

  if (supabase) {
    const { data: row, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error) {
      const meals = getFromStorage(STORAGE_KEYS.MEALS, []);
      const idx = meals.findIndex((m) => m.id === id);
      if (idx >= 0) {
        meals[idx] = toMeal(row);
        setInStorage(STORAGE_KEYS.MEALS, meals);
      }
      return toMeal(row);
    }
  }

  const meals = getFromStorage(STORAGE_KEYS.MEALS, []);
  const index = meals.findIndex((m) => m.id === id);
  if (index === -1) return null;
  meals[index] = { ...meals[index], ...updates, isActive: updates.is_active };
  setInStorage(STORAGE_KEYS.MEALS, meals);
  return meals[index];
}

export async function deleteMeal(id) {
  if (supabase) {
    try {
      await supabase.from('meals').delete().eq('id', id);
    } catch {
      // Network error - still remove from localStorage
    }
  }
  const meals = getFromStorage(STORAGE_KEYS.MEALS, []).filter((m) => m.id !== id);
  setInStorage(STORAGE_KEYS.MEALS, meals);
  return true;
}

export async function getMealById(id) {
  const meals = await getMeals();
  return meals.find((m) => m.id === id) || null;
}
