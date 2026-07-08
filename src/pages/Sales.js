import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
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
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as salesService from '../services/salesService';
import { addActivity } from '../services/activityService';

function SectionHeader({ icon, title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon}
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

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
    } catch (_) {}
    return today;
  });
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historySearch, setHistorySearch] = useState('');
  const [mealSearch, setMealSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedItemIndices, setSelectedItemIndices] = useState(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(saleDateStorageKey, saleDate);
    } catch (_) {}
  }, [saleDate, saleDateStorageKey]);

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

  const mealsByCategory = useMemo(() => {
    const groups = {};
    mealOptions.forEach((meal) => {
      const cat = meal.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(meal);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [mealOptions]);

  const filteredSales = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    const list = sales.filter((s) => {
      if (historyDate && s.date !== historyDate) return false;
      if (!q) return true;
      const customerName = (s.customerName || '').toLowerCase();
      const dateStr = (s.date || '').toLowerCase();
      const totalStr = String(s.totalAmount ?? '');
      return customerName.includes(q) || dateStr.includes(q) || totalStr.includes(q);
    });
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sales, historyDate, historySearch]);

  const historySummary = useMemo(() => {
    const total = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    return { count: filteredSales.length, total };
  }, [filteredSales]);

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
    addActivity(currentUser?.userId || 'Unknown', `Removed item from sale: ${sale.customerName}`);
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
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Stack spacing={3}>
        <Grid
          container
          spacing={3}
          alignItems="stretch"
          sx={{ width: '100%', mt: -2, ml: -1.5, mr: 0.5 }}
        >
          {/* ── New Sale ── */}
          <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
            <Paper
              variant="outlined"
              elevation={0}
              sx={{
                p: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 3, py: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PointOfSaleIcon />
                  <Typography variant="h6" fontWeight={700}>
                    New Sale
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
                <SectionHeader
                  icon={<CalendarTodayIcon color="primary" fontSize="small" />}
                  title="Sale Details"
                  subtitle="Set date and customer"
                />
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      label="Sale date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <Autocomplete
                      size="small"
                      options={customers}
                      getOptionLabel={(c) => `${c.name} — ${c.department}`}
                      value={customer}
                      onChange={(_, v) => setCustomer(v)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Customer"
                          placeholder="Walk-in"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <PersonIcon fontSize="small" color="action" />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 3 }} />

                <SectionHeader
                  icon={<RestaurantMenuIcon color="primary" fontSize="small" />}
                  title="Select Meals"
                  subtitle="Search or tap a meal to add"
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search meal by name or category..."
                  value={mealSearch}
                  onChange={(e) => setMealSearch(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ maxHeight: { xs: 260, md: 420 }, overflowY: 'auto' }}>
                  {mealsByCategory.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ py: 1.5, textAlign: 'center', display: 'block' }}>
                      No active meals found
                    </Typography>
                  ) : (
                    mealsByCategory.map(([category, categoryMeals]) => (
                      <Box key={category} sx={{ mb: 1 }}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color="text.secondary"
                          sx={{ display: 'block', px: 0.5, mb: 0.25, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          {category}
                        </Typography>
                        <List dense disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          {categoryMeals.map((meal, idx) => {
                            const inCart = cart.find((c) => c.mealId === meal.id);
                            return (
                              <ListItem
                                key={meal.id}
                                disablePadding
                                divider={idx < categoryMeals.length - 1}
                                secondaryAction={
                                  inCart ? (
                                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ pr: 1 }}>
                                      ×{inCart.quantity}
                                    </Typography>
                                  ) : (
                                    <AddIcon sx={{ fontSize: 16, color: 'action.active', mr: 0.5 }} />
                                  )
                                }
                                sx={{
                                  minHeight: 32,
                                  bgcolor: inCart ? 'action.hover' : 'transparent',
                                }}
                              >
                                <ListItemButton
                                  onClick={() => addToCart(meal)}
                                  sx={{ py: 0.25, px: 1, minHeight: 32 }}
                                >
                                  <ListItemText
                                    disableTypography
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 4 }}>
                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.8125rem' }}>
                                          {meal.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                          Nu {Number(meal.price).toFixed(2)}
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* ── Cart ── */}
          <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
            <Paper
              variant="outlined"
              elevation={0}
              sx={{
                p: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ShoppingCartIcon color="primary" />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Cart
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cart.length === 0 ? 'No items yet' : `${cart.length} item(s) selected`}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'auto', px: 3, py: 2, minHeight: { xs: 200, md: 320 } }}>
                {cart.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 3, textAlign: 'center', borderRadius: 2, borderStyle: 'dashed', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                  >
                    <ShoppingCartIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, mx: 'auto' }} />
                    <Typography variant="body2" color="text.secondary">
                      Add meals from the list
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 280 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, width: 120 }}>
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
                                <IconButton size="small" onClick={() => adjustQuantity(item.mealId, -0.5)}>
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                                <TextField
                                  type="number"
                                  size="small"
                                  inputProps={{ min: 0.5, step: 0.5 }}
                                  sx={{ width: 56, '& input': { textAlign: 'center', py: 0.5 } }}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(item.mealId, parseFloat(e.target.value) || 1)
                                  }
                                />
                                <IconButton size="small" onClick={() => adjustQuantity(item.mealId, 0.5)}>
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              Nu {item.subtotal?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    Order total
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    Nu {totalAmount.toFixed(2)}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<PointOfSaleIcon />}
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0}
                  sx={{ py: 1.25 }}
                >
                  Complete Sale
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ── Sales History ── */}
        <Box>
          <Paper
            sx={{
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <HistoryIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Sales History
                </Typography>
              </Box>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    label="Filter by date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={8} md={5}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search customer or amount..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`${historySummary.count} sale${historySummary.count !== 1 ? 's' : ''}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`Nu ${historySummary.total.toFixed(2)}`}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <TableContainer sx={{ flex: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }} align="center">
                      Items
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }} align="right">
                      Total
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: 56 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                        <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">
                          {historySearch.trim() ? 'No sales match your search' : 'No sales on this date'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Complete a sale to see it here
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            fontWeight: 500,
                            '&:hover': { textDecoration: 'underline' },
                          }}
                          onClick={() => {
                            setSelectedSale(sale);
                            setSelectedItemIndices(new Set());
                          }}
                        >
                          {sale.customerName}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={(sale.items || []).length}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
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
      </Stack>

      {/* Order detail dialog */}
      <Dialog
        open={!!selectedSale}
        onClose={() => {
          setSelectedSale(null);
          setSelectedItemIndices(new Set());
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Order Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedSale?.customerName} · {selectedSale?.date}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedItemIndices.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={handleRemoveMultipleItemsFromSale}
              >
                Delete ({selectedItemIndices.size})
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => {
                setSelectedSale(null);
                setSelectedItemIndices(new Set());
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedSale && (
            <>
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
                            />
                          </TableCell>
                          <TableCell>{item.mealName}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">Nu {(item.unitPrice || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">
                            Nu {(item.subtotal ?? (item.quantity * item.unitPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell padding="none">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItemFromSale(selectedSale, idx)}
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
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Order total
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  Nu {(selectedSale.totalAmount || 0).toFixed(2)}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Sales;
