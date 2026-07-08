import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as userService from '../services/userService';
import * as tenantService from '../services/tenantService';
import { addActivity } from '../services/activityService';
import { STORAGE_KEYS } from '../services/storage';
import { setCurrentTenantId } from '../services/tenantScope';
import { isSubscriptionActive } from '../services/subscriptionService';

const AuthContext = createContext(null);

function getSession() {
  try {
    const s = sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    const parsed = s ? JSON.parse(s) : null;
    return parsed && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function setSession(user) {
  try {
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  } catch {}
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const loadTenant = useCallback(async (tenantId) => {
    if (!tenantId) {
      setTenant(null);
      return null;
    }
    await tenantService.checkAndExpireTenants();
    const t = await tenantService.getTenantById(tenantId);
    setTenant(t);
    return t;
  }, []);

  const refreshTenant = useCallback(async () => {
    if (!currentUser?.tenantId) return null;
    return loadTenant(currentUser.tenantId);
  }, [currentUser?.tenantId, loadTenant]);

  useEffect(() => {
    const init = async () => {
      const stored = getSession();
      if (stored?.userId) {
        const fresh = await userService.getUserByUserId(stored.userId);
        const user = fresh || stored;
        setCurrentUser(user);
        setIsAuthenticated(true);
        setSession(user);
        if (user.isPlatformAdmin) {
          setCurrentTenantId(null);
        } else {
          setCurrentTenantId(user.tenantId);
          await loadTenant(user.tenantId);
        }
      }
      setSessionChecked(true);
    };
    init();
  }, [loadTenant]);

  const login = useCallback(
    async (userId, password) => {
      const user = await userService.validateUser(userId, password);
      if (!user) return false;

      setCurrentUser(user);
      setIsAuthenticated(true);
      setSession(user);

      if (user.isPlatformAdmin) {
        setCurrentTenantId(null);
        setTenant(null);
      } else {
        setCurrentTenantId(user.tenantId);
        await loadTenant(user.tenantId);
      }

      addActivity(user.userId, 'Logged in');
      return true;
    },
    [loadTenant]
  );

  const logout = useCallback(() => {
    const who = currentUser?.userId || 'Unknown';
    setCurrentUser(null);
    setTenant(null);
    setIsAuthenticated(false);
    setCurrentTenantId(null);
    setSession(null);
    addActivity(who, 'Logged out');
  }, [currentUser?.userId]);

  const getUsers = useCallback(() => userService.getUsers(currentUser?.tenantId), [currentUser?.tenantId]);
  const createUser = useCallback((data) => userService.createUser({ ...data, tenantId: currentUser?.tenantId }), [currentUser?.tenantId]);
  const deleteUser = useCallback((id) => userService.deleteUser(id), []);
  const updateUserPermissions = useCallback((id, perms) => userService.updateUserPermissions(id, perms), []);
  const updatePassword = useCallback((id, newPassword) => userService.updatePassword(id, newPassword), []);

  const canManageUsers = !!currentUser?.canWrite;
  const isAdmin = currentUser?.userId?.toLowerCase() === 'admin';
  const isPlatformAdmin = !!currentUser?.isPlatformAdmin;
  // Legacy users (pre-migration, no tenant) keep full access until migration runs
  const isLegacyUser = !!currentUser && !isPlatformAdmin && !currentUser.tenantId;
  const hasActiveAccess = isPlatformAdmin || isLegacyUser || isSubscriptionActive(tenant);

  const value = {
    isAuthenticated,
    currentUser,
    tenant,
    sessionChecked,
    canManageUsers,
    isAdmin,
    isPlatformAdmin,
    hasActiveAccess,
    refreshTenant,
    updatePassword,
    login,
    logout,
    getUsers,
    createUser,
    deleteUser,
    updateUserPermissions,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
