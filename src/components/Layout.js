import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SubscriptionBanner from './SubscriptionBanner';
import { formatExpiryDateTime } from '../services/subscriptionService';

const drawerWidth = 260;
const baseNavItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/sales', label: 'Sales', icon: <PointOfSaleIcon /> },
  { path: '/customers', label: 'Customers', icon: <PeopleIcon /> },
  { path: '/meals', label: 'Meals', icon: <RestaurantIcon /> },
  { path: '/reports', label: 'Reports', icon: <AssessmentIcon />},
  { path: '/users', label: 'Users & Permissions', icon: <ManageAccountsIcon /> },
  { path: '/activity', label: 'Activity', icon: <HistoryIcon /> },
  { path: '/subscription', label: 'Subscription', icon: <PaymentIcon /> },
];

function Layout({ onLogout, hasActiveAccess = true }) {
  const { loading, error } = useAppState();
  const { currentUser, tenant } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = hasActiveAccess
    ? baseNavItems
    : baseNavItems.filter((item) => item.path === '/subscription');

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const currentSection = navItems.find((item) => location.pathname === item.path);
  const appBarTitle = currentSection ? currentSection.label : 'Canteeny';

  const drawer = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        pt: 2,
        pb: 2,
      }}
    >
      <List sx={{ flex: 1, px: 1, pt: 2 }}>
        {navItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isSelected ? 'white' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isSelected ? 600 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ mx: 2, my: 1 }} />
      <List sx={{ px: 1 }}>
        {currentUser && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 2, py: 0.5, display: 'block' }}
          >
            Signed in as {currentUser.userId}
            {tenant?.planExpiresAt && (
              <>
                <br />
                Plan expires: {formatExpiryDateTime(tenant.planExpiresAt)}
              </>
            )}
          </Typography>
        )}
        {onLogout && (
          <ListItem disablePadding>
            <ListItemButton
              onClick={onLogout}
              sx={{
                borderRadius: 2,
                py: 1.25,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight={600} sx={{ flex: 1 }}>
            {appBarTitle}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<PointOfSaleIcon />}
            onClick={() => navigate(hasActiveAccess ? '/sales' : '/subscription')}
            sx={{ mr: 1 }}
            disabled={!hasActiveAccess}
          >
            New Sale
          </Button>
          <IconButton color="inherit" onClick={toggleMode} aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          position: 'fixed',
          top: 0,
          left: 0,
          width: drawerWidth,
          height: 64,
          alignItems: 'center',
          px: 2.5,
          borderRight: '1px solid',
          borderColor: 'divider',
          borderBottom: '1px solid',
          bgcolor: 'background.paper',
          zIndex: (theme) => theme.zIndex.drawer + 2,
        }}
      >
        <RestaurantIcon color="primary" sx={{ mr: 1.25 }} />
        <Typography variant="subtitle1" fontWeight={700} noWrap title={tenant?.name || 'Canteeny'}>
          {tenant?.name || 'Canteeny'}
        </Typography>
      </Box>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: 64,
              height: 'calc(100% - 64px)',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: 64,
              height: 'calc(100% - 64px)',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #F8F5F1 0%, #EDE8E2 50%, #F2EDE8 100%)'
              : undefined,
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: 'error.main',
              color: 'white',
            }}
          >
            {error}
          </Box>
        )}
        {!loading && (
          <>
            <SubscriptionBanner />
            <Outlet />
          </>
        )}
        <Typography
          variant="caption"
          sx={{
            position: 'fixed',
            bottom: 8,
            right: 16,
            color: 'text.secondary',
            zIndex: 1,
          }}
        >
          Developed by Tshering Tamang & Gyen B. Baraily
        </Typography>
      </Box>
    </Box>
  );
}

export default Layout;
