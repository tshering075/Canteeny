import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert, AlertTitle, Box } from '@mui/material';
import { getDaysRemaining, isExpiringSoon } from '../services/subscriptionService';

function SubscriptionBanner() {
  const { tenant, isPlatformAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!tenant?.planExpiresAt) return;
    const key = `reminder_dismissed_${tenant.id}_${tenant.planExpiresAt}`;
    setDismissed(sessionStorage.getItem(key) === '1');
  }, [tenant]);

  if (isPlatformAdmin || !tenant || dismissed) return null;

  const daysLeft = getDaysRemaining(tenant.planExpiresAt);
  if (!isExpiringSoon(tenant)) return null;

  const handleDismiss = () => {
    const key = `reminder_dismissed_${tenant.id}_${tenant.planExpiresAt}`;
    sessionStorage.setItem(key, '1');
    setDismissed(true);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="warning" onClose={handleDismiss}>
        <AlertTitle>Subscription expiring soon</AlertTitle>
        Only {daysLeft} day{daysLeft !== 1 ? 's' : ''} left on your plan. Renew from the
        Subscription page to avoid service interruption.
      </Alert>
    </Box>
  );
}

export default SubscriptionBanner;
