import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as userService from '../services/userService';
import { addActivity } from '../services/activityService';
import { STORAGE_KEYS } from '../services/storage';

const AuthContext = createContext(null);

// Use sessionStorage so session ends when user closes tab/PWA
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
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const stored = getSession();
    if (stored) {
      setCurrentUser(stored);
      setIsAuthenticated(true);
    }
    setSessionChecked(true);
  }, []);

  const login = useCallback(async (userId, password) => {
    const user = await userService.validateUser(userId, password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setSession(user);
      addActivity(user.userId, 'Logged in');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    const who = currentUser?.userId || 'Unknown';
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSession(null);
    addActivity(who, 'Logged out');
  }, [currentUser?.userId]);

  const getUsers = useCallback(() => userService.getUsers(), []);
  const createUser = useCallback((data) => userService.createUser(data), []);
  const deleteUser = useCallback((id) => userService.deleteUser(id), []);
  const updateUserPermissions = useCallback((id, perms) => userService.updateUserPermissions(id, perms), []);
  const updatePassword = useCallback((id, newPassword) => userService.updatePassword(id, newPassword), []);

  // Any user with write permission can manage users (not just admin)
  const canManageUsers = !!currentUser?.canWrite;
  const isAdmin = currentUser?.userId?.toLowerCase() === 'admin';

  const value = {
    isAuthenticated,
    currentUser,
    sessionChecked,
    canManageUsers,
    isAdmin,
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
