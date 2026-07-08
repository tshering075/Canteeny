import { supabase } from '../lib/supabase';
import {
  getFromStorage,
  setInStorage,
  generateId,
  STORAGE_KEYS,
} from './storage';
import { getCurrentTenantId } from './tenantScope';

const toSale = (row) =>
  row
    ? {
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name || 'Walk-in',
        items: row.items || [],
        totalAmount: Number(row.total_amount) || 0,
        date: row.date,
        tenantId: row.tenant_id || null,
        createdAt: row.created_at,
      }
    : null;

function isMissingTenantColumnError(error) {
  const msg = error?.message || '';
  return /tenant_id|column.*does not exist/i.test(msg);
}

function buildSalePayload(data) {
  const tenantId = getCurrentTenantId();
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
    tenant_id: tenantId || null,
  };
}

// Keep a full offline copy when possible (localStorage ~5MB).
const SALES_CACHE_LIMIT = 5000;

function cacheRecentSales(list) {
  setInStorage(STORAGE_KEYS.SALES, list.slice(0, SALES_CACHE_LIMIT));
}

async function fetchSalesFromSupabase() {
  const tenantId = getCurrentTenantId();
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  let hasMore = true;
  let useTenantFilter = !!tenantId;

  while (hasMore) {
    let query = supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (useTenantFilter) {
      // Include orphan rows (tenant_id IS NULL) saved before tenant was set or
      // via the legacy insert fallback — otherwise they disappear from reports.
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;

    if (error && useTenantFilter) {
      useTenantFilter = false;
      from = 0;
      rows.length = 0;
      hasMore = true;
      continue;
    }
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      rows.push(...data);
      hasMore = data.length === pageSize;
      from += pageSize;
    }
  }

  return rows.map(toSale);
}

export async function getSales() {
  const tenantId = getCurrentTenantId();
  if (supabase) {
    try {
      const list = await fetchSalesFromSupabase();
      cacheRecentSales(list);
      return list;
    } catch (err) {
      console.warn('Failed to load sales from Supabase:', err);
      const all = getFromStorage(STORAGE_KEYS.SALES, []);
      return tenantId ? all.filter((s) => !s.tenantId || s.tenantId === tenantId) : all;
    }
  }
  const all = getFromStorage(STORAGE_KEYS.SALES, []);
  return tenantId ? all.filter((s) => !s.tenantId || s.tenantId === tenantId) : all;
}

export async function addSale(data) {
  const payload = buildSalePayload(data);

  if (supabase) {
    let { data: row, error } = await supabase
      .from('sales')
      .insert(payload)
      .select()
      .single();
    if (error && payload.tenant_id && isMissingTenantColumnError(error)) {
      const { tenant_id, ...legacyPayload } = payload;
      ({ data: row, error } = await supabase
        .from('sales')
        .insert(legacyPayload)
        .select()
        .single());
    }
    if (error) throw new Error(error.message);
    return toSale(row);
  }

  const sales = getFromStorage(STORAGE_KEYS.SALES, []);
  const sale = {
    id: generateId(),
    customerId: payload.customer_id,
    customerName: payload.customer_name,
    items: payload.items,
    totalAmount: payload.total_amount,
    date: payload.date,
    tenantId: payload.tenant_id,
    createdAt: new Date().toISOString(),
  };
  sales.push(sale);
  setInStorage(STORAGE_KEYS.SALES, sales);
  return sale;
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
    if (error) throw new Error(error.message);
    return toSale(row);
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
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw new Error(error.message);
    removeSalesFromCache([id]);
    return true;
  }

  removeSalesFromCache([id]);
  return true;
}

function removeSalesFromCache(ids) {
  const idSet = new Set(ids);
  const sales = getFromStorage(STORAGE_KEYS.SALES, []).filter((s) => !idSet.has(s.id));
  setInStorage(STORAGE_KEYS.SALES, sales);
}

export async function deleteSales(ids) {
  if (!ids?.length) return 0;

  const uniqueIds = [...new Set(ids)];

  if (supabase) {
    const { error } = await supabase.from('sales').delete().in('id', uniqueIds);
    if (error) throw new Error(error.message);
  }

  removeSalesFromCache(uniqueIds);
  return uniqueIds.length;
}
