import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, STORAGE_KEYS, generateId } from './storage';

const toUser = (row) =>
  row
    ? {
        id: row.id,
        userId: row.user_id,
        password: row.password,
        canRead: row.can_read !== false,
        canWrite: row.can_write === true,
      }
    : null;

const DEFAULT_USERS = [
  { id: 'admin-default', userId: 'admin', password: '1234', canRead: true, canWrite: true },
];

export async function getUsers() {
  if (supabase) {
    const { data, error } = await supabase.from('app_users').select('*').order('user_id');
    if (!error && data) {
      const list = data.map(toUser);
      if (list.length > 0) setInStorage(STORAGE_KEYS.USERS, list);
      return list;
    }
  }
  let users = getFromStorage(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    setInStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
    users = DEFAULT_USERS;
  }
  return users;
}

export async function createUser({ userId, password, canRead = true, canWrite = false }) {
  const uid = userId.trim();
  const pwd = String(password);

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

export async function validateUser(userId, password) {
  const users = await getUsers();
  const user = users.find(
    (u) =>
      (u.userId || '').toLowerCase() === (userId || '').trim().toLowerCase() &&
      u.password === String(password)
  );
  if (!user) return null;
  return { userId: user.userId, canRead: user.canRead, canWrite: user.canWrite };
}
