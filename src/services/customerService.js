import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';

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
  if (supabase) {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (!error && data) {
      const list = data.map(toCustomer);
      setInStorage(STORAGE_KEYS.CUSTOMERS, list);
      return list;
    }
  }
  return getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
}

export async function addCustomer(data) {
  const payload = {
    name: data.name?.trim() || '',
    department: data.department?.trim() || '',
    phone: data.phone?.trim() || '',
    employee_type: data.employeeType || 'regular',
  };
  let result = null;

  if (supabase) {
    const { data: row, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();
    if (!error) result = toCustomer(row);
  }

  const customers = getFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  const customer = {
    id: result?.id || generateId(),
    name: payload.name,
    department: payload.department,
    phone: payload.phone,
    employeeType: payload.employee_type,
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
