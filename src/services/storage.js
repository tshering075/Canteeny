const STORAGE_KEYS = {
  CUSTOMERS: 'canteen_customers',
  MEALS: 'canteen_meals',
  SALES: 'canteen_sales',
  AUTH_PASSWORD: 'canteen_auth_password',
  USERS: 'canteen_users',
  ACTIVITIES: 'canteen_activities',
  AUTH_SESSION: 'canteen_auth_session',
  TENANTS: 'canteen_tenants',
  PAYMENTS: 'canteen_payments',
  PLATFORM_SETTINGS: 'canteen_platform_settings',
};

export function getFromStorage(key, defaultValue = []) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setInStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Failed to save ${key} to localStorage:`, err);
    return false;
  }
}

export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {
    // Ignore storage errors.
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export { STORAGE_KEYS };
