import React, { useState } from 'react';
import { Box, Button, IconButton, Paper, TextField, Typography } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from '../context/ThemeContext';

function Login({ onLogin }) {
  const { mode, toggleMode } = useThemeMode();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const ok = await onLogin(userId, password);
    if (ok) return;
    setError('Invalid User ID or password');
  };

  const isDark = mode === 'dark';
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 50%, #1A1A1A 100%)'
          : 'linear-gradient(135deg, #F8F9FA 0%, #E5E7EB 50%, #F8F9FA 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark
            ? 'radial-gradient(circle at 20% 80%, rgba(230,0,18,0.15) 0%, transparent 50%)'
            : 'radial-gradient(circle at 80% 20%, rgba(230,0,18,0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <IconButton
        onClick={toggleMode}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: isDark ? 'rgba(255,255,255,0.8)' : 'text.secondary',
          zIndex: 2,
        }}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          maxWidth: 420,
          width: '100%',
          mx: 2,
          borderRadius: 3,
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            color: 'primary.main',
          }}
        >
          <RestaurantIcon sx={{ fontSize: 48, mr: 1.5 }} />
        </Box>
        <Typography variant="h5" align="center" gutterBottom fontWeight={700}>
          Canteeny
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mb: 3, display: 'block' }}
        >
          Sign in to continue
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            error={!!error}
            autoFocus
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            helperText={error}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{
              mt: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
            disabled={!userId || !password}
          >
            Sign In
          </Button>
        </form>
      </Paper>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          color: isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary',
          zIndex: 2,
        }}
      >
        Developed by Tshering Tamang & Gyen B. Baraily
      </Typography>
    </Box>
  );
}

export default Login;
