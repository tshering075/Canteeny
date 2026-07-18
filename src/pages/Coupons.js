import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as couponService from '../services/couponService';
import { addActivity } from '../services/activityService';

function Coupons() {
  const { coupons, refreshData } = useAppState();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    quantity: '1',
    rate: '',
    isActive: true,
  });

  const handleOpen = (coupon = null) => {
    if (coupon) {
      setEditing(coupon);
      setForm({
        name: coupon.name,
        quantity: String(coupon.quantity ?? 1),
        rate: String(coupon.rate ?? ''),
        isActive: coupon.isActive !== false,
      });
    } else {
      setEditing(null);
      setForm({ name: '', quantity: '1', rate: '', isActive: true });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm({ name: '', quantity: '1', rate: '', isActive: true });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) return;

    const userId = currentUser?.userId || 'Unknown';
    const payload = {
      name: form.name.trim(),
      quantity: qty,
      rate: Number(form.rate) || 0,
      isActive: form.isActive !== false,
    };

    if (editing) {
      await couponService.updateCoupon(editing.id, payload);
      addActivity(userId, `Updated coupon: ${payload.name}`);
    } else {
      await couponService.addCoupon(payload);
      addActivity(userId, `Created coupon: ${payload.name}`);
    }
    refreshData();
    handleClose();
  };

  const handleToggleActive = async (coupon) => {
    const nextActive = coupon.isActive === false;
    setTogglingId(coupon.id);
    try {
      await couponService.updateCoupon(coupon.id, { isActive: nextActive });
      addActivity(
        currentUser?.userId || 'Unknown',
        `${nextActive ? 'Enabled' : 'Disabled'} coupon: ${coupon.name}`
      );
      refreshData();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm('Delete this coupon?')) {
      await couponService.deleteCoupon(id);
      addActivity(currentUser?.userId || 'Unknown', `Deleted coupon: ${name}`);
      refreshData();
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(coupons.map((c) => c.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected coupon(s)?`)) return;
    for (const id of selected) {
      const c = coupons.find((x) => x.id === id);
      await couponService.deleteCoupon(id);
      addActivity(currentUser?.userId || 'Unknown', `Deleted coupon: ${c?.name || id}`);
    }
    setSelected([]);
    refreshData();
  };

  const canSave = form.name?.trim() && Number(form.quantity) > 0;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {selected.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={handleBulkDelete}
          >
            Delete selected ({selected.length})
          </Button>
        )}
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Coupon
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < coupons.length}
                  checked={coupons.length > 0 && selected.length === coupons.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Coupon Name</TableCell>
              <TableCell align="right">Qty / Coupon</TableCell>
              <TableCell align="right">Rate (Nu)</TableCell>
              <TableCell align="right">Value (Nu)</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    No coupons yet. Add one for free meal or drink redemptions.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const enabled = coupon.isActive !== false;
                return (
                  <TableRow
                    key={coupon.id}
                    selected={selected.includes(coupon.id)}
                    sx={{ opacity: enabled ? 1 : 0.65 }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(coupon.id)}
                        onChange={() => handleSelectOne(coupon.id)}
                      />
                    </TableCell>
                    <TableCell>{coupon.name}</TableCell>
                    <TableCell align="right">{coupon.quantity}</TableCell>
                    <TableCell align="right">Nu {Number(coupon.rate).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      Nu {(Number(coupon.quantity) * Number(coupon.rate) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <Chip
                          size="small"
                          label={enabled ? 'Enabled' : 'Disabled'}
                          color={enabled ? 'success' : 'default'}
                          variant={enabled ? 'filled' : 'outlined'}
                        />
                        <Switch
                          size="small"
                          checked={enabled}
                          disabled={togglingId === coupon.id}
                          onChange={() => handleToggleActive(coupon)}
                          inputProps={{ 'aria-label': `Toggle ${coupon.name}` }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(coupon)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(coupon.id, coupon.name)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Coupon Name"
            fullWidth
            placeholder="e.g. Free Tea, Staff Meal Coupon"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Item Quantity per Coupon"
            type="number"
            fullWidth
            inputProps={{ min: 0.5, step: 0.5 }}
            helperText="How many free items this coupon covers"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Rate of Items (Nu)"
            type="number"
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
            helperText="Unit rate of the free item(s)"
            value={form.rate}
            onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={form.isActive !== false}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label={form.isActive !== false ? 'Enabled (available in Sales)' : 'Disabled (hidden in Sales)'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Coupons;
