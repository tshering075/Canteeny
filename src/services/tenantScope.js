let currentTenantId = null;

export function setCurrentTenantId(tenantId) {
  currentTenantId = tenantId || null;
}

export function getCurrentTenantId() {
  return currentTenantId;
}
