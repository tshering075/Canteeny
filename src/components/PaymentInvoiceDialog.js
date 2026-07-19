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
  if (status === 'rejected') return 'default';
  return 'warning';
}

function formatMoney(n) {
  return `Nu. ${Number(n || 0).toFixed(2)}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PaymentInvoiceDialog({ open, onClose, payment, tenant, settings }) {
  if (!payment) return null;

  const invoice = buildInvoiceData({ payment, tenant, settings });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Invoice
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {invoice.invoiceNumber}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          {/* Top accent like Supabase invoices */}
          <Box sx={{ height: 4, bgcolor: '#3ECF8E' }} />

          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  Canteeny
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {invoice.issuerName}
                </Typography>
                {invoice.accountHolder && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {invoice.accountHolder}
                  </Typography>
                )}
                {invoice.accountNumber && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Account {invoice.accountNumber}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.03em' }}>
                  Invoice
                </Typography>
                <Chip
                  size="small"
                  label={invoice.statusLabel}
                  color={statusColor(invoice.status)}
                  sx={{ mt: 1, fontWeight: 700 }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  letterSpacing={0.6}
                  display="block"
                >
                  INVOICE DATE
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                  {formatDate(invoice.submittedAt)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  letterSpacing={0.6}
                  display="block"
                >
                  DUE DATE
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                  {formatDate(invoice.dueDate)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  letterSpacing={0.6}
                  display="block"
                >
                  AMOUNT DUE
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {invoice.status === 'approved' ? formatMoney(0) : formatMoney(invoice.amountDue)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  letterSpacing={0.6}
                  display="block"
                >
                  BILL TO
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {invoice.tenantName}
                </Typography>
                {invoice.tenantContactName && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.tenantContactName}
                  </Typography>
                )}
                {invoice.tenantEmail && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.tenantEmail}
                  </Typography>
                )}
                {invoice.tenantPhone && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.tenantPhone}
                  </Typography>
                )}
              </Grid>
            </Grid>

            <TableContainer
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem' }}>
                      DESCRIPTION
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem' }}
                    >
                      QTY
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem' }}
                    >
                      UNIT PRICE
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem' }}
                    >
                      AMOUNT
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {invoice.description}
                      </Typography>
                      {invoice.planDateRange && (
                        <Typography variant="body2" color="text.secondary" display="block">
                          {invoice.planDateRange}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {invoice.paymentMethodLabel}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{invoice.quantity}</TableCell>
                    <TableCell align="right">{formatMoney(invoice.unitPrice)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatMoney(invoice.amount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2.5, maxWidth: 260, ml: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">{formatMoney(invoice.subtotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Total
                </Typography>
                <Typography variant="subtitle1" fontWeight={800}>
                  {formatMoney(invoice.total)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  bgcolor: '#f8fafc',
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {invoice.status === 'approved' ? 'Amount paid' : 'Amount due'}
                </Typography>
                <Typography variant="body2" fontWeight={800}>
                  {invoice.status === 'approved'
                    ? formatMoney(invoice.total)
                    : formatMoney(invoice.amountDue)}
                </Typography>
              </Box>
            </Box>

            {invoice.notes && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  letterSpacing={0.6}
                >
                  NOTES
                </Typography>
                <Typography variant="body2">{invoice.notes}</Typography>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
              {invoice.status === 'approved'
                ? 'Thank you for your business. This invoice was paid in full.'
                : invoice.status === 'rejected'
                  ? 'This invoice was voided and is not payable.'
                  : 'Payment received — your plan activates after administrator approval.'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button startIcon={<OpenInNewIcon />} onClick={() => openInvoicePdf(invoice)}>
          Open PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => downloadInvoicePdf(invoice)}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentInvoiceDialog;
