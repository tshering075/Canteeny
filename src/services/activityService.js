import { getFromStorage, setInStorage, STORAGE_KEYS, generateId } from './storage';

const MAX_ACTIVITIES = 500;

export function addActivity(userId, action) {
  const activities = getFromStorage(STORAGE_KEYS.ACTIVITIES, []);
  activities.unshift({
    id: generateId(),
    userId,
    action,
    timestamp: new Date().toISOString(),
  });
  if (activities.length > MAX_ACTIVITIES) {
    activities.length = MAX_ACTIVITIES;
  }
  setInStorage(STORAGE_KEYS.ACTIVITIES, activities);
}

export function getActivities() {
  return getFromStorage(STORAGE_KEYS.ACTIVITIES, []);
}

export function deleteActivity(id) {
  const activities = getFromStorage(STORAGE_KEYS.ACTIVITIES, []).filter((a) => a.id !== id);
  setInStorage(STORAGE_KEYS.ACTIVITIES, activities);
}

export function deleteActivitiesByUser(userId) {
  const activities = getFromStorage(STORAGE_KEYS.ACTIVITIES, []).filter(
    (a) => (a.userId || '').toLowerCase() !== (userId || '').toLowerCase()
  );
  setInStorage(STORAGE_KEYS.ACTIVITIES, activities);
}
