import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';

const toSale = (row) =>
  row
    ? {
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name || 'Walk-in',
        items: row.items || [],
        totalAmount: Number(row.total_amount) || 0,
        date: row.date,
        createdAt: row.created_at,
      }
    : null;

function buildSalePayload(data) {
  const items = (data.items || []).map((i) => ({
    mealId: i.mealId,
    mealName: i.mealName,
    quantity: Number(i.quantity) || 1,
    unitPrice: Number(i.unitPrice) || 0,
    subtotal: i.subtotal ?? Number(i.quantity || 1) * Number(i.unitPrice || 0),
  }));
  const totalAmount = items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
  return {
    customer_id: data.customerId || null,
    customer_name: data.customerName || 'Walk-in',
    items,
    total_amount: totalAmount,
    date: data.date || new Date().toISOString().split('T')[0],
  };
}

export async function getSales() {
  if (supabase) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const list = data.map(toSale);
      setInStorage(STORAGE_KEYS.SALES, list);
      return list;
    }
  }
  return getFromStorage(STORAGE_KEYS.SALES, []);
}

export async function addSale(data) {
  const payload = buildSalePayload(data);
  let result = null;

  if (supabase) {
    const { data: row, error } = await supabase
      .from('sales')
      .insert(payload)
      .select()
      .single();
    if (!error) result = toSale(row);
  }

  const sales = getFromStorage(STORAGE_KEYS.SALES, []);
  const sale = {
    id: result?.id || generateId(),
    customerId: payload.customer_id,
    customerName: payload.customer_name,
    items: payload.items,
    totalAmount: payload.total_amount,
    date: payload.date,
    createdAt: result?.createdAt || new Date().toISOString(),
  };
  sales.push(sale);
  setInStorage(STORAGE_KEYS.SALES, sales);
  return result || sale;
}

export async function updateSale(id, data) {
  const payload = {};
  if (data.customerId !== undefined) payload.customer_id = data.customerId;
  if (data.customerName !== undefined) payload.customer_name = data.customerName;
  if (data.items !== undefined) {
    payload.items = data.items;
    payload.total_amount = data.items.reduce(
      (sum, i) => sum + (i.subtotal || i.quantity * i.unitPrice || 0),
      0
    );
  }
  if (data.date !== undefined) payload.date = data.date;

  if (supabase && Object.keys(payload).length > 0) {
    const { data: row, error } = await supabase
      .from('sales')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (!error) {
      const sales = getFromStorage(STORAGE_KEYS.SALES, []);
      const idx = sales.findIndex((s) => s.id === id);
      if (idx >= 0) {
        sales[idx] = toSale(row);
        setInStorage(STORAGE_KEYS.SALES, sales);
      }
      return toSale(row);
    }
  }

  const sales = getFromStorage(STORAGE_KEYS.SALES, []);
  const index = sales.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const items = data.items ?? sales[index].items;
  const totalAmount =
    data.totalAmount !== undefined
      ? data.totalAmount
      : items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
  sales[index] = {
    ...sales[index],
    customerId: data.customerId ?? sales[index].customerId,
    customerName: data.customerName ?? sales[index].customerName,
    items,
    totalAmount,
    date: data.date ?? sales[index].date,
  };
  setInStorage(STORAGE_KEYS.SALES, sales);
  return sales[index];
}

export async function deleteSale(id) {
  if (supabase) {
    try {
      await supabase.from('sales').delete().eq('id', id);
    } catch {
      // Network error - still remove from localStorage
    }
  }
  const sales = getFromStorage(STORAGE_KEYS.SALES, []).filter((s) => s.id !== id);
  setInStorage(STORAGE_KEYS.SALES, sales);
  return true;
}
