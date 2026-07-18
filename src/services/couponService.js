import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';
import { getCurrentTenantId } from './tenantScope';

const toCoupon = (row) =>
  row
    ? {
        id: row.id,
        name: row.name || '',
        quantity: Number(row.quantity) || 1,
        rate: Number(row.rate) || 0,
        isActive: row.is_active !== false,
        tenantId: row.tenant_id || null,
        createdAt: row.created_at,
      }
    : null;

export async function getCoupons() {
  const tenantId = getCurrentTenantId();
  if (supabase) {
    let query = supabase.from('coupons').select('*').order('name');
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query;
    if (!error && data) {
      const list = data.map(toCoupon);
      setInStorage(STORAGE_KEYS.COUPONS, list);
      return list;
    }
    if (tenantId && error) {
      const { data: allData, error: allError } = await supabase
        .from('coupons')
        .select('*')
        .order('name');
      if (!allError && allData) {
        const list = allData.map(toCoupon);
        setInStorage(STORAGE_KEYS.COUPONS, list);
        return list;
      }
    }
  }
  const all = getFromStorage(STORAGE_KEYS.COUPONS, []);
  return tenantId ? all.filter((c) => !c.tenantId || c.tenantId === tenantId) : all;
}

export async function addCoupon(data) {
  const tenantId = getCurrentTenantId();
  const payload = {
    name: data.name?.trim() || '',
    quantity: Number(data.quantity) || 1,
    rate: Number(data.rate) || 0,
    is_active: data.isActive !== false,
    tenant_id: tenantId || null,
  };
  let result = null;

  if (supabase) {
    let { data: row, error } = await supabase
      .from('coupons')
      .insert(payload)
      .select()
      .single();
    if (error && payload.tenant_id) {
      const { tenant_id, ...legacyPayload } = payload;
      ({ data: row, error } = await supabase
        .from('coupons')
        .insert(legacyPayload)
        .select()
        .single());
    }
    if (!error && row) {
      result = toCoupon(row);
    } else if (error && !isMissingCouponsTableError(error)) {
      throw new Error(error.message);
    }
  }

  const coupons = getFromStorage(STORAGE_KEYS.COUPONS, []);
  const coupon = {
    id: result?.id || generateId(),
    name: payload.name,
    quantity: payload.quantity,
    rate: payload.rate,
    isActive: payload.is_active,
    tenantId: tenantId || null,
    createdAt: result?.createdAt || new Date().toISOString(),
  };
  if (result) {
    const idx = coupons.findIndex((c) => c.id === result.id);
    if (idx >= 0) coupons[idx] = coupon;
    else coupons.push(coupon);
  } else {
    coupons.push(coupon);
  }
  setInStorage(STORAGE_KEYS.COUPONS, coupons);
  return result || coupon;
}

function isMissingCouponsTableError(error) {
  const msg = error?.message || '';
  return /coupons.*(does not exist|schema cache)|relation.*coupons|could not find.*coupons/i.test(
    msg
  );
}

export async function updateCoupon(id, data) {
  const updates = {};
  if (data.name !== undefined) updates.name = data.name?.trim() ?? '';
  if (data.quantity !== undefined) updates.quantity = Number(data.quantity) || 1;
  if (data.rate !== undefined) updates.rate = Number(data.rate) || 0;
  if (data.isActive !== undefined) updates.is_active = data.isActive !== false;

  if (Object.keys(updates).length === 0) return null;

  if (supabase) {
    const { data: row, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && row) {
      const coupons = getFromStorage(STORAGE_KEYS.COUPONS, []);
      const idx = coupons.findIndex((c) => c.id === id);
      if (idx >= 0) {
        coupons[idx] = toCoupon(row);
        setInStorage(STORAGE_KEYS.COUPONS, coupons);
      }
      return toCoupon(row);
    }
    if (error && !isMissingCouponsTableError(error)) {
      throw new Error(error.message);
    }
  }

  const coupons = getFromStorage(STORAGE_KEYS.COUPONS, []);
  const index = coupons.findIndex((c) => c.id === id);
  if (index === -1) return null;
  coupons[index] = {
    ...coupons[index],
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
    ...(updates.rate !== undefined ? { rate: updates.rate } : {}),
    ...(updates.is_active !== undefined ? { isActive: updates.is_active } : {}),
  };
  setInStorage(STORAGE_KEYS.COUPONS, coupons);
  return coupons[index];
}

export async function deleteCoupon(id) {
  if (supabase) {
    try {
      await supabase.from('coupons').delete().eq('id', id);
    } catch {
      // Network error - still remove from localStorage
    }
  }
  const coupons = getFromStorage(STORAGE_KEYS.COUPONS, []).filter((c) => c.id !== id);
  setInStorage(STORAGE_KEYS.COUPONS, coupons);
  return true;
}
