import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useAuth } from '../context/AuthContext';
import PaymentDetailsCard from '../components/PaymentDetailsCard';
import PaymentInvoiceDialog from '../components/PaymentInvoiceDialog';
import { resolveInvoiceNumber } from '../utils/invoicePdf';
import { getPlatformSettings } from '../services/platformService';
import { submitPayment, getPaymentsForTenant } from '../services/paymentService';
import {
  PLAN_TYPES,
  formatExpiryDateTime,
  getDaysRemaining,
  getPlanPrice,
  isSubscriptionActive,
} from '../services/subscriptionService';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Subscription() {
  const { tenant, refreshTenant } = useAuth();
  const [settings, setSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [planType, setPlanType] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [screenshot, setScreenshot] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [invoicePayment, setInvoicePayment] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    const [s, p] = await Promise.all([
      getPlatformSettings(),
      tenant ? getPaymentsForTenant(tenant.id) : Promise.resolve([]),
    ]);
    setSettings(s);
    setPayments(p);
  };

  useEffect(() => {
    load();
  }, [tenant?.id]);

  const handleSubmit = async () => {
    if (!tenant) return;
    setError('');
    setMessage('');

    if (paymentMethod === 'mobile_pay' && !screenshot) {
      setError('Please upload a payment screenshot for mobile pay.');
      return;
    }

    setLoading(true);
    try {
      await submitPayment({
        tenantId: tenant.id,
        planType,
        paymentMethod,
        screenshotData: screenshot,
        notes,
      });
      setMessage('Payment submitted successfully. Your invoice will be available in Payment History once the admin approves it.');
      setScreenshot('');
      setScreenshotName('');
      setNotes('');
      await load();
      await refreshTenant();
    } catch (err) {
      setError(err.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    const data = await fileToBase64(file);
    setScreenshot(data);
    setScreenshotName(file.name);
    setError('');
    e.target.value = '';
  };

  const handleRemoveScreenshot = () => {
    setScreenshot('');
    setScreenshotName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReplaceScreenshot = () => {
    fileInputRef.current?.click();
  };

  if (!tenant) {
    return (
      <Typography color="text.secondary">No tenant information available.</Typography>
    );
  }

  const daysLeft = getDaysRemaining(tenant.planExpiresAt);
  const active = isSubscriptionActive(tenant);

  return (
    <Box>
      <Grid
        container
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Grid item xs={12} md={6}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Subscription & Payment
          </Typography>
          <Typography color="text.secondary">
            Manage your plan and submit payments to continue using Canteeny.
          </Typography>
        </Grid>
        <Grid item xs={12} md={5} lg={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                CURRENT PLAN
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={tenant.planType ? PLAN_TYPES[tenant.planType]?.label : 'No plan'}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={active ? 'Active' : tenant.status}
                  color={active ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Expires: {formatExpiryDateTime(tenant.planExpiresAt)}
              </Typography>
              {active && daysLeft <= 7 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Only {daysLeft} day{daysLeft !== 1 ? 's' : ''} left on your plan.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Subscribe or Renew
            </Typography>

            <FormLabel sx={{ mb: 1.5, display: 'block' }}>Select Plan</FormLabel>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {Object.entries(PLAN_TYPES).map(([key, plan]) => {
                const price = getPlanPrice(settings, key);
                const monthlyPrice = getPlanPrice(settings, 'monthly');
                const months = plan.months || 1;
                const perMonth = months > 0 ? price / months : price;
                const fullPrice = monthlyPrice * months;
                const savings = fullPrice > price ? fullPrice - price : 0;
                const selected = planType === key;
                const isBestValue = key === 'annual';
                return (
                  <Grid item xs={12} sm={4} key={key}>
                    <Card
                      variant="outlined"
                      sx={{
                        position: 'relative',
                        height: '100%',
                        borderRadius: 3,
                        borderWidth: 2,
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? 'action.selected' : 'background.paper',
                        transition: 'all 0.15s ease',
                        boxShadow: selected ? 4 : 0,
                        '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                      }}
                    >
                      {isBestValue && (
                        <Chip
                          label="Best value"
                          color="primary"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        />
                      )}
                      <CardActionArea
                        onClick={() => setPlanType(key)}
                        sx={{ height: '100%', p: 2 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          {selected ? (
                            <CheckCircleIcon color="primary" fontSize="small" />
                          ) : (
                            <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                          )}
                          <Typography variant="subtitle1" fontWeight={700}>
                            {plan.label}
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight={800} color="primary.main">
                          Nu. {price.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {months > 1 ? `≈ Nu. ${Math.round(perMonth).toLocaleString()}/month` : 'Billed monthly'}
                        </Typography>
                        {savings > 0 && (
                          <Chip
                            label={`Save Nu. ${savings.toLocaleString()}`}
                            color="success"
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1.5, height: 22, fontSize: '0.7rem' }}
                          />
                        )}
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
              <FormLabel>Payment Method</FormLabel>
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <FormControlLabel value="cash" control={<Radio />} label="Cash" />
                <FormControlLabel value="mobile_pay" control={<Radio />} label="Mobile Pay" />
              </RadioGroup>
            </FormControl>

            {paymentMethod === 'mobile_pay' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {settings?.mobilePayInstructions}
                </Typography>
                <PaymentDetailsCard settings={settings} />
                {!settings?.qrImageData &&
                  !settings?.accountNumber &&
                  !settings?.paymentDisplayName &&
                  !settings?.accountHolderName && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Payment details not configured yet. Contact the administrator.
                  </Alert>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileChange}
                />
                {!screenshot ? (
                  <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                    Upload Payment Screenshot
                    <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                  </Button>
                ) : (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Payment screenshot
                      {screenshotName ? ` · ${screenshotName}` : ''}
                    </Typography>
                    <Box
                      component="img"
                      src={screenshot}
                      alt="Payment proof"
                      sx={{
                        display: 'block',
                        width: '100%',
                        maxWidth: 220,
                        maxHeight: 180,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 1,
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleReplaceScreenshot}
                      >
                        Replace
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={handleRemoveScreenshot}
                      >
                        Remove
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </Box>
            )}

            <TextField
              fullWidth
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {message && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={<PaymentIcon />}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Payment History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {payments.length === 0 ? (
              <Typography color="text.secondary">No payments submitted yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.submittedAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {p.status === 'approved' ? resolveInvoiceNumber(p) : '—'}
                      </TableCell>
                      <TableCell>{PLAN_TYPES[p.planType]?.label}</TableCell>
                      <TableCell>{p.paymentMethod === 'cash' ? 'Cash' : 'Mobile Pay'}</TableCell>
                      <TableCell>Nu. {p.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.status}
                          color={
                            p.status === 'approved'
                              ? 'success'
                              : p.status === 'rejected'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        {p.status === 'approved' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ReceiptLongIcon />}
                            onClick={() => setInvoicePayment(p)}
                          >
                            Invoice
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {p.status === 'rejected' ? '—' : 'After approval'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>

      <PaymentInvoiceDialog
        open={!!invoicePayment}
        onClose={() => setInvoicePayment(null)}
        payment={invoicePayment}
        tenant={tenant}
        settings={settings}
      />
    </Box>
  );
}

export default Subscription;
