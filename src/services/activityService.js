import { getFromStorage, setInStorage, STORAGE_KEYS, generateId } from './storage';
import { getCurrentTenantId } from './tenantScope';

const MAX_ACTIVITIES = 500;

function readAllActivities() {
  return getFromStorage(STORAGE_KEYS.ACTIVITIES, []);
}

function scopeActivities(all, tenantId = getCurrentTenantId()) {
  if (!tenantId) return [];
  return all.filter((a) => a.tenantId === tenantId);
}

export function addActivity(userId, action, tenantId = getCurrentTenantId()) {
  const activities = readAllActivities();
  activities.unshift({
    id: generateId(),
    tenantId: tenantId || null,
    userId,
    action,
    timestamp: new Date().toISOString(),
  });

  // Cap history per tenant so one client cannot wipe another's log.
  if (tenantId) {
    let count = 0;
    const kept = [];
    for (const a of activities) {
      if (a.tenantId === tenantId) {
        count += 1;
        if (count > MAX_ACTIVITIES) continue;
      }
      kept.push(a);
    }
    setInStorage(STORAGE_KEYS.ACTIVITIES, kept);
    return;
  }

  if (activities.length > MAX_ACTIVITIES) {
    activities.length = MAX_ACTIVITIES;
  }
  setInStorage(STORAGE_KEYS.ACTIVITIES, activities);
}

export function getActivities(tenantId = getCurrentTenantId()) {
  return scopeActivities(readAllActivities(), tenantId);
}

export function deleteActivity(id) {
  const tenantId = getCurrentTenantId();
  const activities = readAllActivities().filter((a) => {
    if (a.id !== id) return true;
    // Keep if it belongs to a different tenant.
    if (!tenantId) return a.tenantId != null;
    return a.tenantId !== tenantId;
  });
  setInStorage(STORAGE_KEYS.ACTIVITIES, activities);
}

export function deleteActivitiesByUser(userId) {
  const tenantId = getCurrentTenantId();
  const target = (userId || '').toLowerCase();
  const activities = readAllActivities().filter((a) => {
    if ((a.userId || '').toLowerCase() !== target) return true;
    if (!tenantId) return a.tenantId != null;
    return a.tenantId !== tenantId;
  });
  setInStorage(STORAGE_KEYS.ACTIVITIES, activities);
}
