import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PaymentIcon from '@mui/icons-material/Payment';
import { useAuth } from '../context/AuthContext';
import { formatExpiryDateTime } from '../services/subscriptionService';

function AccessBlocked() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const statusMessage =
    tenant?.status === 'paused'
      ? 'Your account has been paused by the administrator.'
      : 'Your subscription has expired.';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 520, textAlign: 'center', borderRadius: 3 }}>
        <LockIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Service Paused
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {statusMessage} Please renew your subscription or contact support.
        </Typography>
        {tenant?.planExpiresAt && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Plan expired on: {formatExpiryDateTime(tenant.planExpiresAt)}
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          startIcon={<PaymentIcon />}
          onClick={() => navigate('/subscription')}
        >
          Go to Subscription
        </Button>
      </Paper>
    </Box>
  );
}

export default AccessBlocked;
