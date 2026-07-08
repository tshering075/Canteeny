import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import getTheme from './theme';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import TenantRoute from './components/TenantRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Meals from './pages/Meals';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Activity from './pages/Activity';
import Subscription from './pages/Subscription';
import {
  AdminOverview,
  AdminClients,
  AdminPayments,
  AdminSettings,
} from './pages/AdminDashboard';
import { seedData } from './services/seedService';

seedData();

function AppWithTheme() {
  const { mode } = useThemeMode();
  const theme = React.useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, sessionChecked, login, logout, isPlatformAdmin, hasActiveAccess } =
    useAuth();

  if (!sessionChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  if (isPlatformAdmin) {
    return (
      <Routes>
        <Route element={<AdminLayout onLogout={logout} />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={logout} hasActiveAccess={hasActiveAccess} />}>
        <Route path="/subscription" element={<Subscription />} />
        <Route
          path="/"
          element={
            <TenantRoute>
              <Dashboard />
            </TenantRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <TenantRoute>
              <Sales />
            </TenantRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <TenantRoute>
              <Customers />
            </TenantRoute>
          }
        />
        <Route
          path="/meals"
          element={
            <TenantRoute>
              <Meals />
            </TenantRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <TenantRoute>
              <Reports />
            </TenantRoute>
          }
        />
        <Route
          path="/users"
          element={
            <TenantRoute>
              <Users />
            </TenantRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <TenantRoute>
              <Activity />
            </TenantRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={hasActiveAccess ? '/' : '/subscription'} replace />}
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <AppWithTheme />
    </ThemeModeProvider>
  );
}

export default App;
