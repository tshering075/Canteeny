import React, { useState } from 'react';
import { Box, IconButton, Paper, Snackbar, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function PaymentDetailsCard({ settings }) {
  const [copied, setCopied] = useState(false);

  if (!settings) return null;

  const hasDetails =
    settings.paymentDisplayName ||
    settings.accountHolderName ||
    settings.accountNumber ||
    settings.qrImageData;

  if (!hasDetails) {
    return null;
  }

  const handleCopy = async () => {
    if (!settings.accountNumber) return;
    try {
      await navigator.clipboard.writeText(settings.accountNumber);
      setCopied(true);
    } catch {
      const input = document.createElement('textarea');
      input.value = settings.accountNumber;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.default' }}
    >
      {settings.paymentDisplayName && (
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {settings.paymentDisplayName}
        </Typography>
      )}
      {settings.accountHolderName && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <Typography component="span" color="text.secondary">
            Account Holder:{' '}
          </Typography>
          {settings.accountHolderName}
        </Typography>
      )}
      {settings.accountNumber && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ flex: 1 }}>
            <Typography component="span" color="text.secondary">
              Account No:{' '}
            </Typography>
            <Typography component="span" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
              {settings.accountNumber}
            </Typography>
          </Typography>
          <IconButton size="small" onClick={handleCopy} title="Copy account number" color="primary">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {settings.qrImageData && (
        <Box
          component="img"
          src={settings.qrImageData}
          alt="Payment QR Code"
          sx={{ maxWidth: 220, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'block' }}
        />
      )}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Account number copied!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}

export default PaymentDetailsCard;
