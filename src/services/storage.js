const STORAGE_KEYS = {
  CUSTOMERS: 'canteen_customers',
  MEALS: 'canteen_meals',
  SALES: 'canteen_sales',
  AUTH_PASSWORD: 'canteen_auth_password',
  USERS: 'canteen_users',
  ACTIVITIES: 'canteen_activities',
  AUTH_SESSION: 'canteen_auth_session',
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
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export { STORAGE_KEYS };
