import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import * as tenantService from '../services/tenantService';
import * as paymentService from '../services/paymentService';
import { getPlatformSettings, updatePlatformSettings } from '../services/platformService';
import {
  PLAN_TYPES,
  formatExpiryDateTime,
  getDaysRemaining,
} from '../services/subscriptionService';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StatusChip({ status }) {
  const color =
    status === 'active' ? 'success' : status === 'paused' ? 'warning' : 'error';
  return <Chip size="small" label={status} color={color} />;
}

function toDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function AdminOverview() {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const load = async () => {
      await tenantService.checkAndExpireTenants();
      const [t, p] = await Promise.all([
        tenantService.getTenants(),
        paymentService.getPendingPayments(),
      ]);
      setTenants(t);
      setPayments(p);
    };
    load();
  }, []);

  const active = tenants.filter((t) => t.status === 'active').length;
  const expired = tenants.filter((t) => t.status === 'expired').length;
  const paused = tenants.filter((t) => t.status === 'paused').length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Platform Overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Total Clients</Typography><Typography variant="h4">{tenants.length}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Active</Typography><Typography variant="h4" color="success.main">{active}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Expired</Typography><Typography variant="h4" color="error.main">{expired}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography color="text.secondary">Pending Payments</Typography><Typography variant="h4" color="warning.main">{payments.length}</Typography></CardContent></Card>
        </Grid>
      </Grid>
      {paused > 0 && (
        <Alert severity="info">{paused} client(s) are manually paused.</Alert>
      )}
    </Box>
  );
}

export function AdminClients() {
  const [tenants, setTenants] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    planType: 'monthly',
    initialUserId: '',
    initialPassword: '',
  });
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    planType: 'monthly',
    planExpiresAt: '',
  });
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const copyTenantId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      const el = document.createElement('textarea');
      el.value = id;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  const load = async () => {
    await tenantService.checkAndExpireTenants();
    setTenants(await tenantService.getTenants());
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setError('');
    try {
      await tenantService.createTenant(form);
      setDialogOpen(false);
      setForm({
        name: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        planType: 'monthly',
        initialUserId: '',
        initialPassword: '',
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePause = async (id) => {
    await tenantService.pauseTenant(id);
    await load();
  };

  const handleResume = async (id) => {
    await tenantService.resumeTenant(id);
    await load();
  };

  const openEdit = (tenant) => {
    setEditError('');
    setEditForm({
      id: tenant.id,
      name: tenant.name || '',
      contactName: tenant.contactName || '',
      contactPhone: tenant.contactPhone || '',
      contactEmail: tenant.contactEmail || '',
      planType: tenant.planType || 'monthly',
      planExpiresAt: toDateTimeLocal(tenant.planExpiresAt),
    });
    setEditDialogOpen(true);
  };

  const openDelete = (tenant) => {
    setDeleteError('');
    setDeleteConfirmText('');
    setDeleteTarget(tenant);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await tenantService.deleteTenant(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmText('');
      await load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdate = async () => {
    setEditError('');
    try {
      const planExpiresAt = fromDateTimeLocal(editForm.planExpiresAt);
      const updates = {
        name: editForm.name,
        contactName: editForm.contactName,
        contactPhone: editForm.contactPhone,
        contactEmail: editForm.contactEmail,
        planType: editForm.planType,
        planExpiresAt,
      };
      if (planExpiresAt && new Date(planExpiresAt) > new Date()) {
        updates.status = 'active';
      }
      await tenantService.updateTenant(editForm.id, updates);
      setEditDialogOpen(false);
      await load();
    } catch (err) {
      setEditError(err.message);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Manage Clients
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Client
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Tenant ID</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Days Left</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: 220 }}>
                    <Typography
                      variant="caption"
                      component="span"
                      title={t.id}
                      sx={{ fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4 }}
                    >
                      {t.id}
                    </Typography>
                    <IconButton
                      size="small"
                      title="Copy tenant ID"
                      onClick={() => copyTenantId(t.id)}
                    >
                      <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  {t.contactName}
                  {t.contactPhone && <><br />{t.contactPhone}</>}
                </TableCell>
                <TableCell>{t.planType ? PLAN_TYPES[t.planType]?.label : '—'}</TableCell>
                <TableCell>{formatExpiryDateTime(t.planExpiresAt)}</TableCell>
                <TableCell>{getDaysRemaining(t.planExpiresAt)}</TableCell>
                <TableCell><StatusChip status={t.status} /></TableCell>
                <TableCell align="right">
                  <IconButton color="primary" title="Edit client" onClick={() => openEdit(t)}>
                    <EditIcon />
                  </IconButton>
                  {t.status === 'paused' ? (
                    <IconButton color="success" title="Resume access" onClick={() => handleResume(t.id)}>
                      <PlayArrowIcon />
                    </IconButton>
                  ) : (
                    <IconButton color="warning" title="Pause access" onClick={() => handlePause(t.id)}>
                      <PauseIcon />
                    </IconButton>
                  )}
                  <IconButton color="error" title="Delete client" onClick={() => openDelete(t)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Canteen Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} sx={{ mb: 2 }} />
          <TextField
            fullWidth
            select
            label="Initial Plan"
            value={form.planType}
            onChange={(e) => setForm({ ...form, planType: e.target.value })}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            {Object.entries(PLAN_TYPES).map(([key, plan]) => (
              <option key={key} value={key}>{plan.label}</option>
            ))}
          </TextField>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Initial Login (optional)</Typography>
          <TextField fullWidth label="User ID" value={form.initialUserId} onChange={(e) => setForm({ ...form, initialUserId: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Password" type="password" value={form.initialPassword} onChange={(e) => setForm({ ...form, initialPassword: e.target.value })} sx={{ mb: 2 }} />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name.trim()}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tenant ID"
            value={editForm.id}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1, mb: 2, '& input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            helperText="Unique identifier for this client in the database"
          />
          <TextField
            fullWidth
            label="Canteen Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Contact Name"
            value={editForm.contactName}
            onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone"
            value={editForm.contactPhone}
            onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            value={editForm.contactEmail}
            onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            select
            label="Plan"
            value={editForm.planType}
            onChange={(e) => setEditForm({ ...editForm, planType: e.target.value })}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            {Object.entries(PLAN_TYPES).map(([key, plan]) => (
              <option key={key} value={key}>{plan.label}</option>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Plan Expiry Date & Time"
            type="datetime-local"
            value={editForm.planExpiresAt}
            onChange={(e) => setEditForm({ ...editForm, planExpiresAt: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          {editError && <Alert severity="error">{editError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={!editForm.name.trim()}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => (deleting ? null : setDeleteTarget(null))} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            This will permanently delete <strong>{deleteTarget?.name}</strong> along with all of its
            customers, meals, sales, staff logins, and payment records. This action cannot be undone.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            To confirm, type the client name <strong>{deleteTarget?.name}</strong> below:
          </Typography>
          <TextField
            fullWidth
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={deleteTarget?.name}
            autoFocus
          />
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting || deleteConfirmText.trim() !== (deleteTarget?.name || '').trim()}
          >
            {deleting ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [preview, setPreview] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [p, t] = await Promise.all([
      paymentService.getAllPayments(),
      tenantService.getTenants(),
    ]);
    setPayments(p);
    setTenants(t);
  };

  useEffect(() => {
    load();
  }, []);

  const tenantName = (id) => tenants.find((t) => t.id === id)?.name || 'Unknown';

  const handleApprove = async (id) => {
    try {
      await paymentService.approvePayment(id, adminNotes);
      setMessage('Payment approved and client access restored.');
      setPreview(null);
      setAdminNotes('');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await paymentService.rejectPayment(id, adminNotes);
      setMessage('Payment rejected.');
      setPreview(null);
      setAdminNotes('');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Payment Submissions
      </Typography>
      {message && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.submittedAt).toLocaleString()}</TableCell>
                <TableCell>{tenantName(p.tenantId)}</TableCell>
                <TableCell>{PLAN_TYPES[p.planType]?.label}</TableCell>
                <TableCell>
                  {p.planType === 'trial'
                    ? 'Free Trial'
                    : p.paymentMethod === 'cash'
                      ? 'Cash'
                      : 'Mobile Pay'}
                </TableCell>
                <TableCell>Nu. {p.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={p.status}
                    color={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'error' : 'warning'}
                  />
                </TableCell>
                <TableCell align="right">
                  {p.screenshotData && (
                    <IconButton onClick={() => setPreview(p)} title="View screenshot">
                      <VisibilityIcon />
                    </IconButton>
                  )}
                  {p.status === 'pending' && (
                    <>
                      <IconButton color="success" onClick={() => handleApprove(p.id)} title="Approve">
                        <CheckIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleReject(p.id)} title="Reject">
                        <CloseIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {preview && (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Client: {tenantName(preview.tenantId)} | Plan: {PLAN_TYPES[preview.planType]?.label}
              </Typography>
              {preview.screenshotData && (
                <Box component="img" src={preview.screenshotData} alt="Payment proof" sx={{ width: '100%', borderRadius: 2, mb: 2 }} />
              )}
              {preview.notes && <Typography variant="body2" sx={{ mb: 2 }}>Client notes: {preview.notes}</Typography>}
              <TextField
                fullWidth
                label="Admin notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                multiline
                rows={2}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
          {preview?.status === 'pending' && (
            <>
              <Button color="error" onClick={() => handleReject(preview.id)}>Reject</Button>
              <Button variant="contained" color="success" onClick={() => handleApprove(preview.id)}>
                Approve & Resume Access
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getPlatformSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    try {
      const updated = await updatePlatformSettings(settings);
      setSettings(updated);
      setMessage('Settings saved.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await fileToBase64(file);
    setSettings((s) => ({ ...s, qrImageData: data }));
  };

  if (!settings) return null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Platform Settings
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

      <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>Plan Prices (Nu.)</Typography>
        <TextField
          fullWidth
          label="Monthly Price"
          type="number"
          value={settings.monthlyPrice}
          onChange={(e) => setSettings({ ...settings, monthlyPrice: Number(e.target.value) })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="6-Month Price"
          type="number"
          value={settings.sixMonthPrice}
          onChange={(e) => setSettings({ ...settings, sixMonthPrice: Number(e.target.value) })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Annual Price"
          type="number"
          value={settings.annualPrice}
          onChange={(e) => setSettings({ ...settings, annualPrice: Number(e.target.value) })}
          sx={{ mb: 3 }}
        />

        <Typography variant="h6" gutterBottom>Mobile Pay Details</Typography>
        <TextField
          fullWidth
          label="Your Name (shown to clients)"
          value={settings.paymentDisplayName || ''}
          onChange={(e) => setSettings({ ...settings, paymentDisplayName: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Account Holder Name"
          value={settings.accountHolderName || ''}
          onChange={(e) => setSettings({ ...settings, accountHolderName: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Account Number"
          value={settings.accountNumber || ''}
          onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
          placeholder="e.g. 17123456"
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Instructions"
          value={settings.mobilePayInstructions}
          onChange={(e) => setSettings({ ...settings, mobilePayInstructions: e.target.value })}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        <Button variant="outlined" component="label" sx={{ mb: 2, display: 'block' }}>
          Upload QR Code Image
          <input type="file" accept="image/*" hidden onChange={handleQrUpload} />
        </Button>
        {settings.qrImageData && (
          <Box component="img" src={settings.qrImageData} alt="QR" sx={{ display: 'block', maxWidth: 200, borderRadius: 2, mb: 2 }} />
        )}

        <Button variant="contained" onClick={handleSave}>Save Settings</Button>
      </Paper>
    </Box>
  );
}
