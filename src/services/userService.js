import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, STORAGE_KEYS, generateId } from './storage';
import { getCurrentTenantId } from './tenantScope';

const toUser = (row) =>
  row
    ? {
        id: row.id,
        userId: row.user_id,
        password: row.password,
        canRead: row.can_read !== false,
        canWrite: row.can_write === true,
        tenantId: row.tenant_id || null,
        isPlatformAdmin: row.is_platform_admin === true,
      }
    : null;

const DEFAULT_USERS = [
  {
    id: 'admin-default',
    userId: 'admin',
    password: '1234',
    canRead: true,
    canWrite: true,
    tenantId: 'default-tenant',
    isPlatformAdmin: false,
  },
  {
    id: 'owner-default',
    userId: 'owner',
    password: 'owner123',
    canRead: true,
    canWrite: true,
    tenantId: null,
    isPlatformAdmin: true,
  },
];

export async function getUsers(tenantId) {
  const scopeId = tenantId ?? getCurrentTenantId();

  if (supabase) {
    let query = supabase.from('app_users').select('*').order('user_id');
    if (scopeId) {
      query = query.eq('tenant_id', scopeId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const list = data.map(toUser);
      if (list.length > 0) setInStorage(STORAGE_KEYS.USERS, list);
      return scopeId ? list.filter((u) => !u.isPlatformAdmin) : list.filter((u) => !u.isPlatformAdmin);
    }
    // Fallback if tenant_id column missing (pre-migration)
    if (scopeId) {
      const { data: allData, error: allError } = await supabase
        .from('app_users')
        .select('*')
        .order('user_id');
      if (!allError && allData) {
        const list = allData.map(toUser).filter((u) => !u.isPlatformAdmin);
        setInStorage(STORAGE_KEYS.USERS, list);
        return list;
      }
    }
  }

  let users = getFromStorage(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    setInStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    users = DEFAULT_USERS;
  }
  if (scopeId) {
    const scoped = users.filter((u) => u.tenantId === scopeId && !u.isPlatformAdmin);
    return scoped.length > 0 ? scoped : users.filter((u) => !u.isPlatformAdmin);
  }
  return users.filter((u) => !u.isPlatformAdmin);
}

export async function createUser({ userId, password, canRead = true, canWrite = false, tenantId }) {
  const uid = userId.trim();
  const pwd = String(password);
  const scopeId = tenantId ?? getCurrentTenantId();

  if (supabase) {
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .ilike('user_id', uid)
      .maybeSingle();
    if (existing) throw new Error('User ID already exists');

    const { data: row, error } = await supabase
      .from('app_users')
      .insert({
        user_id: uid,
        password: pwd,
        can_read: !!canRead,
        can_write: !!canWrite,
        tenant_id: scopeId || null,
        is_platform_admin: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message || 'Failed to create user');
    const newUser = toUser(row);
    const users = getFromStorage(STORAGE_KEYS.USERS, []);
    users.push(newUser);
    setInStorage(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  const users = getFromStorage(STORAGE_KEYS.USERS, []);
  if (users.some((u) => (u.userId || '').toLowerCase() === uid.toLowerCase())) {
    throw new Error('User ID already exists');
  }
  const newUser = {
    id: generateId(),
    userId: uid,
    password: pwd,
    canRead: !!canRead,
    canWrite: !!canWrite,
    tenantId: scopeId || null,
    isPlatformAdmin: false,
  };
  users.push(newUser);
  setInStorage(STORAGE_KEYS.USERS, users);
  return newUser;
}

export async function deleteUser(id) {
  if (supabase) {
    try {
      await supabase.from('app_users').delete().eq('id', id);
    } catch {
      // Network error - still remove from localStorage
    }
  }
  const users = getFromStorage(STORAGE_KEYS.USERS, []).filter((u) => u.id !== id);
  setInStorage(STORAGE_KEYS.USERS, users);
}

export async function updatePassword(id, newPassword) {
  const pwd = String(newPassword || '').trim();
  if (!pwd) throw new Error('Password is required');

  if (supabase) {
    const { data: row, error } = await supabase
      .from('app_users')
      .update({ password: pwd })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message || 'Failed to update password');
    const updated = toUser(row);
    const users = getFromStorage(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      users[idx] = updated;
      setInStorage(STORAGE_KEYS.USERS, users);
    }
    return updated;
  }

  const users = getFromStorage(STORAGE_KEYS.USERS, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('User not found');
  users[idx] = { ...users[idx], password: pwd };
  setInStorage(STORAGE_KEYS.USERS, users);
  return users[idx];
}

export async function updateUserPermissions(id, { canRead, canWrite }) {
  if (supabase) {
    const { data: row, error } = await supabase
      .from('app_users')
      .update({ can_read: !!canRead, can_write: !!canWrite })
      .eq('id', id)
      .select()
      .single();
    if (!error) {
      const users = getFromStorage(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex((u) => u.id === id);
      if (idx >= 0) {
        users[idx] = toUser(row);
        setInStorage(STORAGE_KEYS.USERS, users);
      }
      return toUser(row);
    }
  }
  const users = getFromStorage(STORAGE_KEYS.USERS, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], canRead: !!canRead, canWrite: !!canWrite };
  setInStorage(STORAGE_KEYS.USERS, users);
  return users[idx];
}

export async function getUserByUserId(userId) {
  const uid = (userId || '').trim();
  if (supabase) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .ilike('user_id', uid)
      .maybeSingle();
    if (!error && data) {
      const user = toUser(data);
      return {
        id: user.id,
        userId: user.userId,
        canRead: user.canRead,
        canWrite: user.canWrite,
        tenantId: user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin,
      };
    }
  }
  const users = getFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
  const user = users.find((u) => (u.userId || '').toLowerCase() === uid.toLowerCase());
  if (!user) return null;
  return {
    id: user.id,
    userId: user.userId,
    canRead: user.canRead,
    canWrite: user.canWrite,
    tenantId: user.tenantId || null,
    isPlatformAdmin: user.isPlatformAdmin === true,
  };
}

export async function validateUser(userId, password) {
  const uid = (userId || '').trim();
  const pwd = String(password);

  if (supabase) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .ilike('user_id', uid)
      .maybeSingle();
    if (!error && data) {
      if (data.password !== pwd) return null;
      const user = toUser(data);
      return {
        id: user.id,
        userId: user.userId,
        canRead: user.canRead,
        canWrite: user.canWrite,
        tenantId: user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin,
      };
    }
  }

  const stored = getFromStorage(STORAGE_KEYS.USERS, []);
  const users = stored.length > 0 ? stored : DEFAULT_USERS;
  const user = users.find(
    (u) =>
      (u.userId || '').toLowerCase() === uid.toLowerCase() &&
      u.password === pwd
  );
  if (!user) return null;
  return {
    id: user.id,
    userId: user.userId,
    canRead: user.canRead,
    canWrite: user.canWrite,
    tenantId: user.tenantId || null,
    isPlatformAdmin: user.isPlatformAdmin === true,
  };
}
