import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { buildInvoiceData, downloadInvoicePdf, openInvoicePdf } from '../utils/invoicePdf';

function statusColor(status) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

function PaymentInvoiceDialog({ open, onClose, payment, tenant, settings }) {
  if (!payment) return null;

  const invoice = buildInvoiceData({ payment, tenant, settings });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Canteeny Invoice
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {invoice.invoiceNumber}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="primary" fontWeight={700}>
                Canteeny
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subscription Invoice
              </Typography>
            </Box>
            <Chip size="small" label={invoice.status} color={statusColor(invoice.status)} />
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Bill From
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {invoice.issuerName}
              </Typography>
              {invoice.accountHolder && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {invoice.accountHolder}
                </Typography>
              )}
              {invoice.accountNumber && (
                <Typography variant="caption" color="text.secondary" display="block">
                  A/C: {invoice.accountNumber}
                </Typography>
              )}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Bill To
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {invoice.tenantName}
              </Typography>
              {invoice.tenantContact && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {invoice.tenantContact}
                </Typography>
              )}
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Issued: {invoice.submittedAt.toLocaleString()}
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{invoice.planLabel} Plan</TableCell>
                  <TableCell>{invoice.paymentMethodLabel}</TableCell>
                  <TableCell align="right">Nu. {invoice.amount.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Total
            </Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">
              Nu. {invoice.amount.toFixed(2)}
            </Typography>
          </Box>

          {invoice.notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Client notes
              </Typography>
              <Typography variant="body2">{invoice.notes}</Typography>
            </Box>
          )}

          {invoice.status === 'pending' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Your plan will be activated after the administrator approves this payment.
            </Typography>
          )}
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button startIcon={<OpenInNewIcon />} onClick={() => openInvoicePdf(invoice)}>
          Open PDF
        </Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadInvoicePdf(invoice)}>
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentInvoiceDialog;
