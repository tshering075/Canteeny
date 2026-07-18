import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';
import { extendExpiryDate } from './subscriptionService';
import * as userService from './userService';
import { setCurrentTenantId, getCurrentTenantId } from './tenantScope';

const toTenant = (row) =>
  row
    ? {
        id: row.id,
        name: row.name || '',
        contactName: row.contact_name || '',
        contactPhone: row.contact_phone || '',
        contactEmail: row.contact_email || '',
        status: row.status || 'active',
        planType: row.plan_type || null,
        planExpiresAt: row.plan_expires_at || null,
        freeTrialEnabled: row.free_trial_enabled !== false && row.freeTrialEnabled !== false,
        createdAt: row.created_at,
      }
    : null;

const DEFAULT_TENANT = {
  id: 'default-tenant',
  name: 'Default Canteen',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  status: 'active',
  planType: 'annual',
  planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  freeTrialEnabled: true,
  createdAt: new Date().toISOString(),
};

export async function getTenants() {
  if (supabase) {
    const { data, error } = await supabase.from('tenants').select('*').order('name');
    if (!error && data) {
      const list = data.map(toTenant);
      setInStorage(STORAGE_KEYS.TENANTS, list);
      return list;
    }
  }
  let tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
  if (tenants.length === 0) {
    tenants = [DEFAULT_TENANT];
    setInStorage(STORAGE_KEYS.TENANTS, tenants);
  }
  return tenants.map((t) => ({
    ...t,
    freeTrialEnabled: t.freeTrialEnabled !== false,
  }));
}

export async function getTenantById(id) {
  const tenants = await getTenants();
  return tenants.find((t) => t.id === id) || null;
}

export async function createTenant({
  name,
  contactName,
  contactPhone,
  contactEmail,
  planType,
  freeTrialEnabled = true,
  initialUserId,
  initialPassword,
}) {
  const payload = {
    name: name?.trim() || 'New Canteen',
    contact_name: contactName?.trim() || '',
    contact_phone: contactPhone?.trim() || '',
    contact_email: contactEmail?.trim() || '',
    status: 'active',
    plan_type: planType || 'monthly',
    plan_expires_at: extendExpiryDate(null, planType || 'monthly'),
    free_trial_enabled: freeTrialEnabled !== false,
  };

  let tenant = null;

  if (supabase) {
    let { data, error } = await supabase.from('tenants').insert(payload).select().single();
    if (error && /free_trial_enabled/i.test(error.message || '')) {
      const { free_trial_enabled, ...legacyPayload } = payload;
      ({ data, error } = await supabase.from('tenants').insert(legacyPayload).select().single());
      if (!error && data) {
        tenant = { ...toTenant(data), freeTrialEnabled: freeTrialEnabled !== false };
      }
    } else if (!error) {
      tenant = toTenant(data);
    }
    if (error) throw new Error(error.message || 'Failed to create tenant');
    const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
    tenants.push(tenant);
    setInStorage(STORAGE_KEYS.TENANTS, tenants);
  } else {
    tenant = {
      id: generateId(),
      name: payload.name,
      contactName: payload.contact_name,
      contactPhone: payload.contact_phone,
      contactEmail: payload.contact_email,
      status: payload.status,
      planType: payload.plan_type,
      planExpiresAt: payload.plan_expires_at,
      freeTrialEnabled: freeTrialEnabled !== false,
      createdAt: new Date().toISOString(),
    };
    const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
    tenants.push(tenant);
    setInStorage(STORAGE_KEYS.TENANTS, tenants);
  }

  if (initialUserId?.trim() && initialPassword) {
    const prev = getCurrentTenantId();
    setCurrentTenantId(tenant.id);
    try {
      await userService.createUser({
        userId: initialUserId.trim(),
        password: initialPassword,
        canRead: true,
        canWrite: true,
        tenantId: tenant.id,
      });
    } finally {
      setCurrentTenantId(prev);
    }
  }

  return tenant;
}

export async function updateTenant(id, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name?.trim() || '';
  if (updates.contactName !== undefined) payload.contact_name = updates.contactName?.trim() || '';
  if (updates.contactPhone !== undefined) payload.contact_phone = updates.contactPhone?.trim() || '';
  if (updates.contactEmail !== undefined) payload.contact_email = updates.contactEmail?.trim() || '';
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.planType !== undefined) payload.plan_type = updates.planType;
  if (updates.planExpiresAt !== undefined) payload.plan_expires_at = updates.planExpiresAt;
  if (updates.freeTrialEnabled !== undefined) {
    payload.free_trial_enabled = updates.freeTrialEnabled !== false;
  }

  if (supabase && Object.keys(payload).length > 0) {
    let { data, error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && payload.free_trial_enabled !== undefined && /free_trial_enabled/i.test(error.message || '')) {
      const { free_trial_enabled, ...rest } = payload;
      if (Object.keys(rest).length === 0) {
        // Column missing — keep flag in local cache only.
        const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
        const idx = tenants.findIndex((t) => t.id === id);
        if (idx >= 0) {
          tenants[idx] = {
            ...tenants[idx],
            freeTrialEnabled: updates.freeTrialEnabled !== false,
          };
          setInStorage(STORAGE_KEYS.TENANTS, tenants);
          return tenants[idx];
        }
        throw new Error(error.message || 'Failed to update tenant');
      }
      ({ data, error } = await supabase.from('tenants').update(rest).eq('id', id).select().single());
      if (!error && data) {
        const tenant = {
          ...toTenant(data),
          freeTrialEnabled: updates.freeTrialEnabled !== false,
        };
        const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
        const idx = tenants.findIndex((t) => t.id === id);
        if (idx >= 0) tenants[idx] = tenant;
        else tenants.push(tenant);
        setInStorage(STORAGE_KEYS.TENANTS, tenants);
        return tenant;
      }
    }

    if (error) throw new Error(error.message || 'Failed to update tenant');
    const tenant = toTenant(data);
    const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
    const idx = tenants.findIndex((t) => t.id === id);
    if (idx >= 0) tenants[idx] = tenant;
    else tenants.push(tenant);
    setInStorage(STORAGE_KEYS.TENANTS, tenants);
    return tenant;
  }

  const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
  const idx = tenants.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tenants[idx] = { ...tenants[idx], ...updates };
  setInStorage(STORAGE_KEYS.TENANTS, tenants);
  return tenants[idx];
}

export async function pauseTenant(id) {
  return updateTenant(id, { status: 'paused' });
}

export async function resumeTenant(id) {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error('Tenant not found');
  const isExpired = tenant.planExpiresAt && new Date(tenant.planExpiresAt) <= new Date();
  return updateTenant(id, { status: isExpired ? 'expired' : 'active' });
}

export async function extendTenantPlan(id, planType) {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error('Tenant not found');
  const newExpiry = extendExpiryDate(tenant.planExpiresAt, planType);
  return updateTenant(id, {
    planType,
    planExpiresAt: newExpiry,
    status: 'active',
  });
}

export async function deleteTenant(id) {
  if (!id) throw new Error('Tenant id is required');

  if (supabase) {
    // Remove all tenant-scoped data first to avoid orphaned rows.
    const scopedTables = ['payment_submissions', 'sales', 'meals', 'customers', 'app_users'];
    for (const table of scopedTables) {
      const { error } = await supabase.from(table).delete().eq('tenant_id', id);
      // Ignore missing-column/table errors (e.g. pre-migration state).
      if (error && !/column .* does not exist|relation .* does not exist/i.test(error.message || '')) {
        throw new Error(error.message || `Failed to delete ${table} for tenant`);
      }
    }
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Failed to delete tenant');
  }

  // Keep local caches in sync for both Supabase and localStorage modes.
  const filterOut = (key) => {
    const rows = getFromStorage(key, []);
    setInStorage(
      key,
      rows.filter((r) => (r.tenantId ?? r.tenant_id) !== id)
    );
  };
  filterOut(STORAGE_KEYS.CUSTOMERS);
  filterOut(STORAGE_KEYS.MEALS);
  filterOut(STORAGE_KEYS.SALES);
  filterOut(STORAGE_KEYS.USERS);
  filterOut(STORAGE_KEYS.PAYMENTS);

  const tenants = getFromStorage(STORAGE_KEYS.TENANTS, []);
  setInStorage(
    STORAGE_KEYS.TENANTS,
    tenants.filter((t) => t.id !== id)
  );

  return true;
}

export async function checkAndExpireTenants() {
  const tenants = await getTenants();
  const now = new Date();
  const updates = [];

  for (const tenant of tenants) {
    if (
      tenant.planExpiresAt &&
      new Date(tenant.planExpiresAt) <= now &&
      tenant.status !== 'expired'
    ) {
      const updated = await updateTenant(tenant.id, { status: 'expired' });
      updates.push(updated);
    }
  }
  return updates;
}
