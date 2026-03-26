import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
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
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as customerService from '../services/customerService';
import { addActivity } from '../services/activityService';
import {
  parseExcelFile,
  parseCustomerRows,
  downloadCustomerTemplate,
} from '../utils/importExcel';
import { formatBhutanPhone } from '../utils/phoneFormat';

function Customers() {
  const { customers, sales, refreshData } = useAppState();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    department: '',
    phone: '',
    employeeType: 'regular',
  });

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.department?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      (c.employeeType || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (customer = null) => {
    if (customer) {
      setEditing(customer);
      setForm({
        name: customer.name || '',
        department: customer.department || '',
        phone: customer.phone || '',
        employeeType: customer.employeeType || 'regular',
      });
    } else {
      setEditing(null);
      setForm({ name: '', department: '', phone: '', employeeType: 'regular' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm({ name: '', department: '', phone: '', employeeType: 'regular' });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    const userId = currentUser?.userId || 'Unknown';
    if (editing) {
      await customerService.updateCustomer(editing.id, form);
      addActivity(userId, `Updated customer: ${form.name}`);
    } else {
      await customerService.addCustomer(form);
      addActivity(userId, `Created customer: ${form.name}`);
    }
    refreshData();
    handleClose();
  };

  const handleDelete = async (id, name) => {
    if (window.confirm('Delete this customer?')) {
      await customerService.deleteCustomer(id);
      addActivity(currentUser?.userId || 'Unknown', `Deleted customer: ${name}`);
      refreshData();
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(filtered.map((c) => c.id));
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
    if (!window.confirm(`Delete ${selected.length} selected customer(s)?`)) return;
    for (const id of selected) {
      const c = customers.find((x) => x.id === id);
      await customerService.deleteCustomer(id);
      addActivity(currentUser?.userId || 'Unknown', `Deleted customer: ${c?.name || id}`);
    }
    setSelected([]);
    refreshData();
  };

  const getCustomerPurchaseCount = (id) =>
    sales.filter((s) => s.customerId === id).length;

  const isDuplicate = (cust, existing) => {
    const key = (c) =>
      `${(c.name || '').trim().toLowerCase()}|${(c.department || '').trim().toLowerCase()}|${(c.phone || '').trim()}`;
    const custKey = key(cust);
    return existing.some((c) => key(c) === custKey);
  };

  const handleUploadClick = () => {
    setUploadOpen(true);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const rows = await parseExcelFile(file);
      const parsed = parseCustomerRows(rows);
      if (parsed.length === 0) {
        setUploadResult({ added: 0, skipped: 0, error: 'No valid rows found. Ensure columns: Name, Department, Phone, Employee Type' });
        return;
      }
      let added = 0;
      let skipped = 0;
      const seenInFile = new Set();
      for (const row of parsed) {
        const key = `${(row.name || '').trim().toLowerCase()}|${(row.department || '').trim().toLowerCase()}|${(row.phone || '').trim()}`;
        if (seenInFile.has(key)) {
          skipped++;
          continue;
        }
        seenInFile.add(key);
        if (isDuplicate(row, customers)) {
          skipped++;
          continue;
        }
        const result = await customerService.addCustomer({
          name: row.name,
          department: row.department,
          phone: row.phone,
          employeeType: row.employeeType,
        });
        if (result) {
          added++;
          addActivity(currentUser?.userId || 'Unknown', `Bulk import: Added customer ${row.name}`);
        } else {
          skipped++;
        }
      }
      setUploadResult({ added, skipped, total: parsed.length });
      refreshData();
    } catch (err) {
      setUploadResult({ added: 0, skipped: 0, error: err.message || 'Failed to parse Excel file' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
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
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleUploadClick}
          >
            Upload Excel
          </Button>
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Customer
          </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < filtered.length}
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Employee Type</TableCell>
              <TableCell align="right">Purchases</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {customers.length === 0
                      ? 'No customers yet. Add one to get started.'
                      : 'No matching customers.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} selected={selected.includes(c.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(c.id)}
                      onChange={() => handleSelectOne(c.id)}
                    />
                  </TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.department}</TableCell>
                  <TableCell>{formatBhutanPhone(c.phone) || '-'}</TableCell>
                  <TableCell>{c.employeeType || '-'}</TableCell>
                  <TableCell align="right">{getCustomerPurchaseCount(c.id)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpen(c)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(c.id, c.name)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Department"
            fullWidth
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            placeholder="e.g. +975 17 12 34 56 (8 digits after +975)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Employee Type</InputLabel>
            <Select
              value={form.employeeType}
              label="Employee Type"
              onChange={(e) => setForm((f) => ({ ...f, employeeType: e.target.value }))}
            >
              <MenuItem value="regular">Regular</MenuItem>
              <MenuItem value="casual">Casual</MenuItem>
              <MenuItem value="guest">Guest</MenuItem>
              <MenuItem value="others">Others</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name?.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Upload Customers</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload an Excel file with columns: <strong>Name</strong>, <strong>Department</strong>, <strong>Phone</strong>, <strong>Employee Type</strong>. Duplicates (same name + department + phone) will be skipped.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadCustomerTemplate}
            fullWidth
            sx={{ mb: 2 }}
          >
            Download Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            fullWidth
          >
            {uploading ? 'Processing...' : 'Select Excel File'}
          </Button>
          {uploading && <LinearProgress sx={{ mt: 2 }} />}
          {uploadResult && !uploading && (
            <Alert severity={uploadResult.error ? 'error' : 'success'} sx={{ mt: 2 }}>
              {uploadResult.error || (
                <>
                  Added: {uploadResult.added} · Skipped (duplicates): {uploadResult.skipped}
                  {uploadResult.total !== undefined && ` · Total rows: ${uploadResult.total}`}
                </>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Customers;
