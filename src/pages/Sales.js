import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
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
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RemoveIcon from '@mui/icons-material/Remove';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as salesService from '../services/salesService';
import { addActivity } from '../services/activityService';

function Sales() {
  const { customers, meals, sales, refreshData } = useAppState();
  const { currentUser } = useAuth();
  const saleDateStorageKey = 'canteeny_sales_selected_date';
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [saleDate, setSaleDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const saved = localStorage.getItem('canteeny_sales_selected_date');
      if (/^\d{4}-\d{2}-\d{2}$/.test(saved || '')) return saved;
    } catch (_) {
      // Ignore storage errors and fall back to today.
    }
    return today;
  });
  const [dateFilter, setDateFilter] = useState('today');
  const [mealSearch, setMealSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedItemIndices, setSelectedItemIndices] = useState(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(saleDateStorageKey, saleDate);
    } catch (_) {
      // Ignore storage errors (e.g., private mode restrictions).
    }
  }, [saleDate, saleDateStorageKey]);

  const today = new Date().toISOString().split('T')[0];
  const activeMeals = meals.filter((m) => m.isActive !== false);

  const mealOptions = useMemo(() => {
    if (!mealSearch.trim()) return activeMeals;
    const q = mealSearch.toLowerCase().trim();
    return activeMeals.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
    );
  }, [activeMeals, mealSearch]);

  const filteredSales = useMemo(() => {
    const list = sales.filter((s) => {
      if (dateFilter === 'today') return s.date === today;
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(s.date) >= weekAgo;
      }
      if (dateFilter === 'month') return s.date.startsWith(today.slice(0, 7));
      return true;
    });
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sales, dateFilter, today]);

  const addToCart = (meal) => {
    const existing = cart.find((c) => c.mealId === meal.id);
    const price = Number(meal.price) || 0;
    if (existing) {
      const newQty = existing.quantity + 0.5;
      setCart(
        cart.map((c) =>
          c.mealId === meal.id
            ? { ...c, quantity: newQty, subtotal: Math.round(newQty * price * 100) / 100 }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          mealId: meal.id,
          mealName: meal.name,
          quantity: 1,
          unitPrice: price,
          subtotal: Math.round(1 * price * 100) / 100,
        },
      ]);
    }
  };

  const adjustQuantity = (mealId, delta) => {
    const item = cart.find((c) => c.mealId === mealId);
    if (!item) return;
    const newQty = Math.round((item.quantity + delta) * 2) / 2;
    if (newQty < 0.5) {
      setCart(cart.filter((c) => c.mealId !== mealId));
      return;
    }
    setCart(
      cart.map((c) =>
        c.mealId === mealId
          ? { ...c, quantity: newQty, subtotal: Math.round(newQty * c.unitPrice * 100) / 100 }
          : c
      )
    );
  };

  const updateQuantity = (mealId, qty) => {
    const num = Number(qty);
    if (num < 0.5 || isNaN(num)) {
      setCart(cart.filter((c) => c.mealId !== mealId));
      return;
    }
    setCart(
      cart.map((c) =>
        c.mealId === mealId
          ? { ...c, quantity: num, subtotal: Math.round(num * c.unitPrice * 100) / 100 }
          : c
      )
    );
  };

  const totalAmount = cart.reduce((sum, c) => sum + c.subtotal, 0);

  const handleRemoveItemFromSale = async (sale, itemIndex) => {
    const newItems = (sale.items || []).filter((_, i) => i !== itemIndex);
    if (newItems.length === 0) {
      if (window.confirm('Remove the last item? This will delete the entire sale.')) {
        await salesService.deleteSale(sale.id);
        addActivity(currentUser?.userId || 'Unknown', `Deleted sale (${sale.customerName})`);
        setSelectedSale(null);
        setSelectedItemIndices(new Set());
        refreshData();
      }
      return;
    }
    const newTotal = newItems.reduce((s, i) => s + (i.subtotal || 0), 0);
    await salesService.updateSale(sale.id, { items: newItems });
    addActivity(
      currentUser?.userId || 'Unknown',
      `Removed item from sale: ${sale.customerName}`
    );
    setSelectedSale((prev) =>
      prev?.id === sale.id ? { ...prev, items: newItems, totalAmount: newTotal } : prev
    );
    setSelectedItemIndices(new Set());
    refreshData();
  };

  const handleRemoveMultipleItemsFromSale = async () => {
    if (!selectedSale || selectedItemIndices.size === 0) return;
    const indices = Array.from(selectedItemIndices);
    const newItems = (selectedSale.items || []).filter((_, i) => !indices.includes(i));
    if (newItems.length === 0) {
      if (window.confirm('Remove all selected items? This will delete the entire sale.')) {
        await salesService.deleteSale(selectedSale.id);
        addActivity(currentUser?.userId || 'Unknown', `Deleted sale (${selectedSale.customerName})`);
        setSelectedSale(null);
        setSelectedItemIndices(new Set());
        refreshData();
      }
      return;
    }
    const newTotal = newItems.reduce((s, i) => s + (i.subtotal || 0), 0);
    await salesService.updateSale(selectedSale.id, { items: newItems });
    addActivity(
      currentUser?.userId || 'Unknown',
      `Removed ${indices.length} item(s) from sale: ${selectedSale.customerName}`
    );
    setSelectedSale((prev) =>
      prev?.id === selectedSale.id ? { ...prev, items: newItems, totalAmount: newTotal } : prev
    );
    setSelectedItemIndices(new Set());
    refreshData();
  };

  const toggleItemSelection = (idx) => {
    setSelectedItemIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAllItems = () => {
    const items = selectedSale?.items || [];
    if (selectedItemIndices.size === items.length) {
      setSelectedItemIndices(new Set());
    } else {
      setSelectedItemIndices(new Set(items.map((_, i) => i)));
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    await salesService.addSale({
      customerId: customer?.id || null,
      customerName: customer ? `${customer.name} (${customer.department})` : 'Walk-in',
      items: cart,
      date: saleDate,
    });
    addActivity(
      currentUser?.userId || 'Unknown',
      `Recorded sale: Nu ${totalAmount.toFixed(2)} to ${customer ? customer.name : 'Walk-in'}`
    );
    setCart([]);
    setCustomer(null);
    refreshData();
  };

  const handleDeleteSale = async (id, customerName, total) => {
    if (window.confirm('Delete this sale?')) {
      await salesService.deleteSale(id);
      addActivity(
        currentUser?.userId || 'Unknown',
        `Deleted sale: Nu ${(total || 0).toFixed(2)} (${customerName || 'Walk-in'})`
      );
      refreshData();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* New Sale - Left Panel */}
        <Paper
          sx={{
            p: 3,
            flex: '1 1 380px',
            minWidth: 0,
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 480,
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, mr: -1, pr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <PointOfSaleIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                New Sale
              </Typography>
            </Box>

            {/* Sale date - allows adding sales for past dates */}
            <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Sale date
            </Typography>
            <TextField
              type="date"
              size="small"
              fullWidth
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Customer */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Customer
            </Typography>
            <Autocomplete
              size="small"
              options={customers}
              getOptionLabel={(c) => `${c.name} — ${c.department}`}
              value={customer}
              onChange={(_, v) => setCustomer(v)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Walk-in" />
              )}
            />
          </Box>

          {/* Meals search */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Add meal
            </Typography>
            <Autocomplete
              size="small"
              options={mealOptions}
              getOptionLabel={(m) => `${m.name} — ${m.category || 'General'} · Nu ${Number(m.price).toFixed(2)}`}
              value={null}
              onChange={(_, v) => {
                if (v) addToCart(v);
                setMealSearch('');
              }}
              inputValue={mealSearch}
              onInputChange={(_, v) => setMealSearch(v)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Search meal by name or category..." />
              )}
              renderOption={(props, m) => (
                <li {...props} key={m.id}>
                  {m.name} — {m.category || 'General'} · Nu {Number(m.price).toFixed(2)}
                </li>
              )}
            />
          </Box>

          {/* Cart */}
          {cart.length > 0 && (
            <Box sx={{ mt: 2, flex: 1, minHeight: 120 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})
              </Typography>
              <TableContainer sx={{ maxHeight: 220, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, width: 160 }}>
                        Qty
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.mealId}>
                        <TableCell sx={{ fontWeight: 500 }}>{item.mealName}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => adjustQuantity(item.mealId, -0.5)}
                              sx={{ p: 0.25 }}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ min: 0.5, step: 0.5 }}
                              sx={{ width: 72, '& input': { textAlign: 'center' } }}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.mealId, parseFloat(e.target.value) || 1)
                              }
                            />
                            <IconButton
                              size="small"
                              onClick={() => adjustQuantity(item.mealId, 0.5)}
                              sx={{ p: 0.25 }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="right">Nu {item.subtotal?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          </Box>

          {/* Total & Complete - always visible at bottom */}
          <Box
            sx={{
              flexShrink: 0,
              mt: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              rowGap: 1.5,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ m: 0, lineHeight: 1.4 }}>
              Total: Nu {totalAmount.toFixed(2)}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              sx={{ minWidth: 160, flexShrink: 0 }}
            >
              Complete Sale
            </Button>
          </Box>
        </Paper>

        {/* Sales History - Right Panel */}
        <Paper
          sx={{
            p: 3,
            flex: '2 1 420px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 400,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Sales History
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={dateFilter}
                label="Period"
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: 60 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">
                        No sales in this period
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Complete a sale to see it here
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          textDecoration: 'underline',
                          '&:hover': { color: 'primary.dark' },
                        }}
                        onClick={() => {
                          setSelectedSale(sale);
                          setSelectedItemIndices(new Set());
                        }}
                      >
                        {sale.customerName}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        Nu {(sale.totalAmount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleDeleteSale(sale.id, sale.customerName, sale.totalAmount)
                          }
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </TableContainer>
        </Paper>
      </Box>

      <Dialog
        open={!!selectedSale}
        onClose={() => {
          setSelectedSale(null);
          setSelectedItemIndices(new Set());
        }}
        maxWidth="md"
        fullWidth
        fullScreen
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1, flexWrap: 'wrap', gap: 1 }}>
          <span>
            Order — {selectedSale?.customerName} · {selectedSale?.date}
          </span>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedItemIndices.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={handleRemoveMultipleItemsFromSale}
              >
                Delete selected ({selectedItemIndices.size})
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => {
                setSelectedSale(null);
                setSelectedItemIndices(new Set());
              }}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select items to delete multiple at once, or click the trash icon to remove a single item.
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ width: 48 }}>
                        <Checkbox
                          indeterminate={
                            selectedItemIndices.size > 0 &&
                            selectedItemIndices.size < (selectedSale.items || []).length
                          }
                          checked={
                            (selectedSale.items || []).length > 0 &&
                            selectedItemIndices.size === (selectedSale.items || []).length
                          }
                          onChange={toggleSelectAllItems}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Subtotal</TableCell>
                      <TableCell padding="none" sx={{ width: 48 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedSale.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          No items in this order
                        </TableCell>
                      </TableRow>
                    ) : (
                      (selectedSale.items || []).map((item, idx) => (
                        <TableRow key={idx} selected={selectedItemIndices.has(idx)}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedItemIndices.has(idx)}
                              onChange={() => toggleItemSelection(idx)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>{item.mealName}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            Nu {(item.unitPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            Nu {(item.subtotal ?? (item.quantity * item.unitPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell padding="none">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItemFromSale(selectedSale, idx)}
                              color="error"
                              title="Remove this item (customer cancelled)"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="h6" fontWeight={700} sx={{ mt: 2 }}>
                Total: Nu {(selectedSale.totalAmount || 0).toFixed(2)}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Sales;
