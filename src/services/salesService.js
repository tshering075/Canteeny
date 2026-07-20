import { supabase } from '../lib/supabase';
import {
  getFromStorage,
  setInStorage,
  generateId,
  STORAGE_KEYS,
} from './storage';
import { getCurrentTenantId } from './tenantScope';

const normalizePaymentType = (value) => {
  if (value === 'cash') return 'cash';
  if (value === 'coupon') return 'coupon';
  return 'credit';
};

/** Resolve display/filter type — coupon fields mark coupon sales even if DB stored credit. */
export function resolveSaleType(saleOrRow) {
  if (!saleOrRow) return 'credit';
  const paymentType = normalizePaymentType(
    saleOrRow.paymentType ?? saleOrRow.payment_type
  );
  if (paymentType === 'cash') return 'cash';
  if (paymentType === 'coupon') return 'coupon';
  const couponId = saleOrRow.couponId ?? saleOrRow.coupon_id;
  const couponName = saleOrRow.couponName ?? saleOrRow.coupon_name;
  if (couponId || couponName) return 'coupon';
  return 'credit';
}

const toSale = (row) =>
  row
    ? {
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name || 'Walk-in',
        items: row.items || [],
        totalAmount: Number(row.total_amount) || 0,
        date: row.date,
        paymentType: resolveSaleType(row),
        couponId: row.coupon_id ?? row.couponId ?? null,
        couponName: row.coupon_name ?? row.couponName ?? null,
        saleNote: row.sale_note ?? row.saleNote ?? '',
        tenantId: row.tenant_id || null,
        createdAt: row.created_at,
      }
    : null;

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return (
    new RegExp(`\\b${column}\\b`, 'i').test(msg) &&
    /does not exist|schema cache|could not find/i.test(msg)
  );
}

function isCouponIdError(error) {
  const msg = error?.message || '';
  return (
    isMissingColumnError(error, 'coupon_id') ||
    isMissingColumnError(error, 'coupon_name') ||
    (/coupon_id/i.test(msg) &&
      /foreign key|violates|invalid input syntax|uuid/i.test(msg))
  );
}

function isPaymentTypeCheckError(error) {
  const msg = error?.message || '';
  return (
    /payment_type/i.test(msg) &&
    /check constraint|violates|not currently supported|invalid/i.test(msg)
  );
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
    payment_type: normalizePaymentType(data.paymentType),
    coupon_id: data.couponId || null,
    coupon_name: data.couponName || null,
    sale_note: data.saleNote || null,
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
      const scoped = tenantId ? all.filter((s) => !s.tenantId || s.tenantId === tenantId) : all;
      return scoped.map((s) => ({
        ...s,
        paymentType: resolveSaleType(s),
        couponId: s.couponId ?? null,
        couponName: s.couponName ?? null,
        saleNote: s.saleNote ?? '',
      }));
    }
  }
  const all = getFromStorage(STORAGE_KEYS.SALES, []);
  const scoped = tenantId ? all.filter((s) => !s.tenantId || s.tenantId === tenantId) : all;
  return scoped.map((s) => ({
    ...s,
    paymentType: resolveSaleType(s),
    couponId: s.couponId ?? null,
    couponName: s.couponName ?? null,
    saleNote: s.saleNote ?? '',
  }));
}

export async function addSale(data) {
  const payload = buildSalePayload(data);
  const intendedType = normalizePaymentType(data.paymentType);

  if (supabase) {
    let insertPayload = { ...payload };
    let { data: row, error } = await supabase
      .from('sales')
      .insert(insertPayload)
      .select()
      .single();

    const stripMissing = (col) => {
      if (!(col in insertPayload)) return false;
      const { [col]: _removed, ...rest } = insertPayload;
      insertPayload = rest;
      return true;
    };

    const retryInsert = async () => {
      ({ data: row, error } = await supabase
        .from('sales')
        .insert(insertPayload)
        .select()
        .single());
    };

    // Invalid/missing coupon FK — keep coupon_name so UI can still classify as coupon.
    if (error && isCouponIdError(error)) {
      stripMissing('coupon_id');
      if (isMissingColumnError(error, 'coupon_name')) stripMissing('coupon_name');
      await retryInsert();
    }

    // DB check may still only allow credit|cash until migration 012 is applied.
    // Save as credit + coupon_name; resolveSaleType will treat it as coupon.
    if (
      error &&
      insertPayload.payment_type === 'coupon' &&
      (isPaymentTypeCheckError(error) || isMissingColumnError(error, 'payment_type'))
    ) {
      if (isMissingColumnError(error, 'payment_type')) {
        stripMissing('payment_type');
      } else {
        insertPayload = { ...insertPayload, payment_type: 'credit' };
      }
      await retryInsert();
    }

    if (error && insertPayload.payment_type && isMissingColumnError(error, 'payment_type')) {
      stripMissing('payment_type');
      await retryInsert();
    }
    if (error && insertPayload.tenant_id && isMissingColumnError(error, 'tenant_id')) {
      stripMissing('tenant_id');
      await retryInsert();
    }
    if (error && insertPayload.sale_note && isMissingColumnError(error, 'sale_note')) {
      stripMissing('sale_note');
      await retryInsert();
    }
    if (error) throw new Error(error.message);

    const sale = toSale(row);
    return {
      ...sale,
      // Prefer intended coupon type for immediate UI; refresh will use resolveSaleType.
      paymentType:
        intendedType === 'coupon' || sale.paymentType === 'coupon'
          ? 'coupon'
          : normalizePaymentType(data.paymentType ?? sale.paymentType),
      couponId: data.couponId ?? sale.couponId,
      couponName: data.couponName ?? sale.couponName,
      saleNote: data.saleNote ?? sale.saleNote ?? '',
    };
  }

  const sales = getFromStorage(STORAGE_KEYS.SALES, []);
  const sale = {
    id: generateId(),
    customerId: payload.customer_id,
    customerName: payload.customer_name,
    items: payload.items,
    totalAmount: payload.total_amount,
    date: payload.date,
    paymentType: payload.payment_type,
    couponId: payload.coupon_id,
    couponName: payload.coupon_name,
    saleNote: data.saleNote || '',
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
  if (data.paymentType !== undefined) {
    payload.payment_type = normalizePaymentType(data.paymentType);
  }

  if (supabase && Object.keys(payload).length > 0) {
    let updatePayload = { ...payload };
    let { data: row, error } = await supabase
      .from('sales')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error && updatePayload.payment_type && isMissingColumnError(error, 'payment_type')) {
      const { payment_type, ...rest } = updatePayload;
      updatePayload = rest;
      if (Object.keys(updatePayload).length === 0) {
        // Column missing; keep local semantics via remapped row below.
        const sales = getFromStorage(STORAGE_KEYS.SALES, []);
        const cached = sales.find((s) => s.id === id);
        if (cached) {
          return {
            ...cached,
            paymentType: normalizePaymentType(data.paymentType ?? cached.paymentType),
          };
        }
        throw new Error(error.message);
      }
      ({ data: row, error } = await supabase
        .from('sales')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single());
    }
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
    paymentType: normalizePaymentType(
      data.paymentType ?? sales[index].paymentType
    ),
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
