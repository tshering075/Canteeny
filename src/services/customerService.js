import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';
import { getCurrentTenantId } from './tenantScope';

const toCustomer = (row) =>
  row
    ? {
        id: row.id,
        name: row.name || '',
        department: row.department || '',
        phone: row.phone || '',
        employeeType: row.employee_type || 'regular',
        createdAt: row.created_at,
      }
    : null;

export async function getCustomers() {
  const tenantId = getCurrentTenantId();
  if (supabase) {
    let query = supabase.from('customers').select('*').order('name');
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query;
    if (!error && data) {
      const list = data.map(toCustomer);
      setInStorage(STORAGE_KEYS.CUSTOMERS, list);
      return list;
    }
    if (tenantId && error) {
      const { data: allData, error: allError } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (!allError && allData) {
        const list = allData.map(toCustomer);
        setInStorage(STORAGE_KEYS.CUSTOMERS, list);
        return list;
      }
    }
  }
  const all = getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  return tenantId ? all.filter((c) => !c.tenantId || c.tenantId === tenantId) : all;
}

export async function addCustomer(data) {
  const tenantId = getCurrentTenantId();
  const payload = {
    name: data.name?.trim() || '',
    department: data.department?.trim() || '',
    phone: data.phone?.trim() || '',
    employee_type: data.employeeType || 'regular',
    tenant_id: tenantId || null,
  };
  let result = null;

  if (supabase) {
    let { data: row, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();
    if (error && payload.tenant_id) {
      const { tenant_id, ...legacyPayload } = payload;
      ({ data: row, error } = await supabase
        .from('customers')
        .insert(legacyPayload)
        .select()
        .single());
    }
    if (!error) result = toCustomer(row);
  }

  const customers = getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  const customer = {
    id: result?.id || generateId(),
    name: payload.name,
    department: payload.department,
    phone: payload.phone,
    employeeType: payload.employee_type,
    tenantId: tenantId || null,
    createdAt: result?.createdAt || new Date().toISOString(),
  };
  customers.push(customer);
  setInStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return result || customer;
}

export async function updateCustomer(id, data) {
  const updates = {
    name: data.name?.trim() ?? '',
    department: data.department?.trim() ?? '',
    phone: data.phone?.trim() ?? '',
    employee_type: data.employeeType ?? 'regular',
  };

  if (supabase) {
    const { data: row, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error) {
      const customers = getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
      const idx = customers.findIndex((c) => c.id === id);
      if (idx >= 0) {
        customers[idx] = toCustomer(row);
        setInStorage(STORAGE_KEYS.CUSTOMERS, customers);
      }
      return toCustomer(row);
    }
  }

  const customers = getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) return null;
  customers[index] = { ...customers[index], ...updates, employeeType: updates.employee_type };
  setInStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return customers[index];
}

export async function deleteCustomer(id) {
  if (supabase) {
    try {
      await supabase.from('customers').delete().eq('id', id);
    } catch {
      // Network error - still remove from localStorage
    }
  }
  const customers = getFromStorage(STORAGE_KEYS.CUSTOMERS, []).filter((c) => c.id !== id);
  setInStorage(STORAGE_KEYS.CUSTOMERS, customers);
  return true;
}

export async function getCustomerById(id) {
  const customers = await getCustomers();
  return customers.find((c) => c.id === id) || null;
}
