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
  IconButton,
  LinearProgress,
  Paper,
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as mealService from '../services/mealService';
import { addActivity } from '../services/activityService';
import {
  parseExcelFile,
  parseMealRows,
  downloadMealTemplate,
} from '../utils/importExcel';

function Meals() {
  const { meals, refreshData } = useAppState();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    category: 'General',
    price: '',
  });

  const handleOpen = (meal = null) => {
    if (meal) {
      setEditing(meal);
      setForm({
        name: meal.name,
        category: meal.category || 'General',
        price: String(meal.price || ''),
      });
    } else {
      setEditing(null);
      setForm({ name: '', category: 'General', price: '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm({ name: '', category: 'General', price: '' });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    const userId = currentUser?.userId || 'Unknown';
    if (editing) {
      await mealService.updateMeal(editing.id, {
        name: form.name,
        category: form.category,
        price: form.price,
      });
      addActivity(userId, `Updated meal: ${form.name}`);
    } else {
      await mealService.addMeal({
        name: form.name,
        category: form.category,
        price: form.price,
      });
      addActivity(userId, `Created meal: ${form.name}`);
    }
    refreshData();
    handleClose();
  };

  const handleDelete = async (id, name) => {
    if (window.confirm('Delete this meal?')) {
      await mealService.deleteMeal(id);
      addActivity(currentUser?.userId || 'Unknown', `Deleted meal: ${name}`);
      refreshData();
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(meals.map((m) => m.id));
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
    if (!window.confirm(`Delete ${selected.length} selected meal(s)?`)) return;
    for (const id of selected) {
      const m = meals.find((x) => x.id === id);
      await mealService.deleteMeal(id);
      addActivity(currentUser?.userId || 'Unknown', `Deleted meal: ${m?.name || id}`);
    }
    setSelected([]);
    refreshData();
  };

  const isMealDuplicate = (name) =>
    meals.some((m) => (m.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase());

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
      const parsed = parseMealRows(rows);
      if (parsed.length === 0) {
        setUploadResult({ added: 0, skipped: 0, error: 'No valid rows found. Ensure columns: Name, Category, Price' });
        return;
      }
      let added = 0;
      let skipped = 0;
      const seenInFile = new Set();
      for (const row of parsed) {
        const key = (row.name || '').trim().toLowerCase();
        if (seenInFile.has(key)) {
          skipped++;
          continue;
        }
        seenInFile.add(key);
        if (isMealDuplicate(row.name)) {
          skipped++;
          continue;
        }
        const result = await mealService.addMeal({
          name: row.name,
          category: row.category,
          price: row.price,
        });
        if (result) {
          added++;
          addActivity(currentUser?.userId || 'Unknown', `Bulk import: Added meal ${row.name}`);
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Meal
          </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < meals.length}
                  checked={meals.length > 0 && selected.length === meals.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price (Nu)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No meals yet. Add one to get started.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              meals.map((meal) => (
                <TableRow key={meal.id} selected={selected.includes(meal.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(meal.id)}
                      onChange={() => handleSelectOne(meal.id)}
                    />
                  </TableCell>
                  <TableCell>{meal.name}</TableCell>
                  <TableCell>{meal.category}</TableCell>
                  <TableCell align="right">Nu {Number(meal.price).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpen(meal)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(meal.id, meal.name)}>
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
        <DialogTitle>{editing ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Category"
            fullWidth
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Price (Nu)"
            type="number"
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
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
        <DialogTitle>Bulk Upload Meals</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload an Excel file with columns: <strong>Name</strong>, <strong>Category</strong>, <strong>Price</strong>. Duplicates (same meal name) will be skipped.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadMealTemplate}
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

export default Meals;
