import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import NuIcon from '../components/NuIcon';
import {
  getDailyReport,
  getMonthlyReportByCustomerDateRange,
  getReportByDateRange,
} from '../services/reportService';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as salesService from '../services/salesService';
import { addActivity } from '../services/activityService';
import {
  downloadReportPDF,
  downloadReportExcel,
  downloadCustomerBillPDF,
  downloadCustomerBillExcel,
} from '../utils/exportReport';
import { formatDisplayDate, formatDisplayDates } from '../utils/dateFormat';
import SaleAnnotations from '../components/SaleAnnotations';

function Reports() {
  const { sales, customers, refreshData } = useAppState();
  const { canManageUsers, currentUser, tenant } = useAuth();
  const [mode, setMode] = useState('daily');
  const [saleTypeTab, setSaleTypeTab] = useState('credit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteStartDate, setDeleteStartDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [deleteEndDate, setDeleteEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [deleteSearch, setDeleteSearch] = useState('');
  const [selectedSaleIds, setSelectedSaleIds] = useState(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [saveMenuAnchor, setSaveMenuAnchor] = useState(null);
  const [billSaveMenuAnchor, setBillSaveMenuAnchor] = useState(null);

  const salesByType = useMemo(() => {
    return sales.filter((s) => {
      const type =
        s.paymentType === 'cash'
          ? 'cash'
          : s.paymentType === 'coupon' || s.couponId || s.couponName
            ? 'coupon'
            : 'credit';
      return type === saleTypeTab;
    });
  }, [sales, saleTypeTab]);

  const saleTypeLabel =
    saleTypeTab === 'cash' ? 'Cash' : saleTypeTab === 'coupon' ? 'Coupon' : 'Credit';

  const daily = mode === 'daily' ? getDailyReport(date, salesByType) : null;
  const monthlyReport =
    mode === 'monthly'
      ? getMonthlyReportByCustomerDateRange(startDate, endDate, salesByType, customers)
      : null;
  const report = mode === 'daily' ? daily : null;

  const filteredByDepartment = useMemo(() => {
    if (!monthlyReport?.byDepartment) return [];
    const q = search?.toLowerCase().trim() || '';
    if (!q)
      return monthlyReport.byDepartment;

    return monthlyReport.byDepartment
      .map(({ department, customers }) => ({
        department,
        customers: customers.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.department || '').toLowerCase().includes(q)
        ),
      }))
      .filter((d) => d.customers.length > 0);
  }, [monthlyReport, search]);

  const filteredGrandTotal = useMemo(() => {
    return filteredByDepartment.reduce(
      (sum, { customers }) =>
        sum + customers.reduce((s, c) => s + (c.totalAmount || 0), 0),
      0
    );
  }, [filteredByDepartment]);

  const deleteRangeReport = useMemo(() => {
    if (mode !== 'delete') return null;
    return getReportByDateRange(deleteStartDate, deleteEndDate, salesByType);
  }, [mode, deleteStartDate, deleteEndDate, salesByType]);

  const deleteFilteredSales = useMemo(() => {
    const list = deleteRangeReport?.sales || [];
    const q = deleteSearch.toLowerCase().trim();
    const filtered = q
      ? list.filter((s) => (s.customerName || '').toLowerCase().includes(q))
      : list;
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );
  }, [deleteRangeReport, deleteSearch]);

  const selectedDeleteSales = useMemo(
    () => deleteFilteredSales.filter((s) => selectedSaleIds.has(s.id)),
    [deleteFilteredSales, selectedSaleIds]
  );

  const selectedDeleteTotal = useMemo(
    () => selectedDeleteSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    [selectedDeleteSales]
  );

  const allDeleteVisibleSelected =
    deleteFilteredSales.length > 0 &&
    deleteFilteredSales.every((s) => selectedSaleIds.has(s.id));

  const someDeleteVisibleSelected =
    !allDeleteVisibleSelected && deleteFilteredSales.some((s) => selectedSaleIds.has(s.id));

  const toggleSaleSelection = (id) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDeleteSales = () => {
    if (allDeleteVisibleSelected) {
      setSelectedSaleIds((prev) => {
        const next = new Set(prev);
        deleteFilteredSales.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedSaleIds((prev) => {
        const next = new Set(prev);
        deleteFilteredSales.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handleDeleteSelectedSales = async () => {
    const ids = selectedDeleteSales.map((s) => s.id);
    if (ids.length === 0) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await salesService.deleteSales(ids);
      addActivity(
        currentUser?.userId || 'Unknown',
        `Deleted ${ids.length} ${saleTypeTab} sale(s) from ${deleteStartDate} to ${deleteEndDate}`
      );
      setSelectedSaleIds(new Set());
      setDeleteConfirmOpen(false);
      refreshData();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete sales');
    } finally {
      setDeleting(false);
    }
  };

  const handleReportSave = async (format) => {
    setSaveMenuAnchor(null);
    const tenantName = tenant?.name || '';
    try {
      if (format === 'pdf') {
        await downloadReportPDF(
          filteredByDepartment,
          filteredGrandTotal,
          startDate,
          endDate,
          saleTypeLabel,
          tenantName
        );
      } else {
        downloadReportExcel(
          filteredByDepartment,
          filteredGrandTotal,
          startDate,
          endDate,
          saleTypeLabel,
          tenantName
        );
      }
    } catch (err) {
      console.error('Failed to export report:', err);
      window.alert(err.message || 'Failed to export report. Please try again.');
    }
  };

  const handleBillSave = async (format) => {
    if (!detailCustomer) return;
    setBillSaveMenuAnchor(null);
    const tenantName = tenant?.name || '';
    try {
      if (format === 'pdf') {
        await downloadCustomerBillPDF(
          detailCustomer,
          startDate,
          endDate,
          saleTypeLabel,
          tenantName
        );
      } else {
        downloadCustomerBillExcel(
          detailCustomer,
          startDate,
          endDate,
          saleTypeLabel,
          tenantName
        );
      }
    } catch (err) {
      console.error('Failed to export bill:', err);
      window.alert(err.message || 'Failed to export bill. Please try again.');
    }
  };

  return (
    <Box>
      <Tabs
        value={saleTypeTab}
        onChange={(_, value) => {
          setSaleTypeTab(value);
          setSelectedSaleIds(new Set());
          setDetailCustomer(null);
        }}
        sx={{ mb: 2, minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value="credit"
          label="Credit Sales"
          icon={<CreditCardIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
        />
        <Tab
          value="cash"
          label="Cash Sales"
          icon={<NuIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
        />
        <Tab
          value="coupon"
          label="Coupon Sales"
          icon={<LocalOfferIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
        />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={mode}
            label="Report Type"
            onChange={(e) => setMode(e.target.value)}
          >
            <MenuItem value="daily">Daily Sales</MenuItem>
            <MenuItem value="monthly">Monthly Sales</MenuItem>
            {canManageUsers && <MenuItem value="delete">Delete Sales</MenuItem>}
          </Select>
        </FormControl>
        {mode === 'daily' && (
          <TextField
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        )}
        {mode === 'monthly' && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}
        {mode === 'delete' && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              type="date"
              label="Start Date"
              value={deleteStartDate}
              onChange={(e) => {
                setDeleteStartDate(e.target.value);
                setSelectedSaleIds(new Set());
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={deleteEndDate}
              onChange={(e) => {
                setDeleteEndDate(e.target.value);
                setSelectedSaleIds(new Set());
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}
      </Box>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          {mode === 'daily'
            ? `${saleTypeLabel} Daily Report - ${formatDisplayDate(date)}`
            : mode === 'monthly'
              ? `${saleTypeLabel} Monthly Report - ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`
              : `Delete ${saleTypeLabel} Sales - ${formatDisplayDate(deleteStartDate)} to ${formatDisplayDate(deleteEndDate)}`}
        </Typography>

        {mode === 'delete' && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Selected sales will be permanently deleted from Supabase. This cannot be undone.
            </Alert>

            {deleteError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteError('')}>
                {deleteError}
              </Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                size="small"
                placeholder="Search customer..."
                value={deleteSearch}
                onChange={(e) => setDeleteSearch(e.target.value)}
                sx={{ minWidth: 240 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={toggleSelectAllDeleteSales}
                disabled={deleteFilteredSales.length === 0}
              >
                {allDeleteVisibleSelected ? 'Deselect all' : 'Select all'}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={selectedDeleteSales.length === 0 || deleting}
              >
                Delete selected ({selectedDeleteSales.length})
              </Button>
            </Box>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              {deleteFilteredSales.length} sale(s) in range · Nu{' '}
              {(deleteRangeReport?.total || 0).toFixed(2)} total
              {selectedDeleteSales.length > 0 &&
                ` · ${selectedDeleteSales.length} selected (Nu ${selectedDeleteTotal.toFixed(2)})`}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 48 }}>
                      <Checkbox
                        indeterminate={someDeleteVisibleSelected}
                        checked={allDeleteVisibleSelected}
                        onChange={toggleSelectAllDeleteSales}
                        disabled={deleteFilteredSales.length === 0}
                      />
                    </TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deleteFilteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No {saleTypeTab} sales in this date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deleteFilteredSales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        hover
                        selected={selectedSaleIds.has(sale.id)}
                        onClick={() => toggleSaleSelection(sale.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedSaleIds.has(sale.id)}
                            onChange={() => toggleSaleSelection(sale.id)}
                          />
                        </TableCell>
                        <TableCell>{formatDisplayDate(sale.date)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {sale.customerName}
                          <SaleAnnotations sale={sale} />
                        </TableCell>
                        <TableCell>
                          {(sale.items || [])
                            .map((i) => `${i.mealName} x${i.quantity}`)
                            .join(', ') || '-'}
                        </TableCell>
                        <TableCell align="right">
                          Nu {(sale.totalAmount || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {mode === 'daily' && (
          <>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              Total: Nu {(report?.total || 0).toFixed(2)} (
              {report?.sales?.length || 0} transactions)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(report?.sales || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No {saleTypeTab} sales in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...(report?.sales || [])]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{formatDisplayDate(sale.date)}</TableCell>
                          <TableCell>
                            {sale.customerName}
                            <SaleAnnotations sale={sale} />
                          </TableCell>
                          <TableCell>
                            {(sale.items || [])
                              .map((i) => `${i.mealName} x${i.quantity}`)
                              .join(', ') || '-'}
                          </TableCell>
                          <TableCell align="right">
                            Nu {(sale.totalAmount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {mode === 'monthly' && (
          <>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                size="small"
                placeholder="Search customer or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<SaveAltIcon />}
                onClick={(e) => setSaveMenuAnchor(e.currentTarget)}
                disabled={filteredByDepartment.length === 0}
              >
                Save as
              </Button>
              <Menu
                anchorEl={saveMenuAnchor}
                open={!!saveMenuAnchor}
                onClose={() => setSaveMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              >
                <MenuItem onClick={() => handleReportSave('pdf')}>
                  <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Save to device as PDF</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleReportSave('excel')}>
                  <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Save to device as Excel</ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Total: Nu {filteredGrandTotal.toFixed(2)}
              {search && ` (filtered)`}
            </Typography>

            {filteredByDepartment.length === 0 ? (
              <Typography color="textSecondary">
                No {saleTypeTab} sales in this period{search ? ' matching your search.' : '.'}
              </Typography>
            ) : (
              filteredByDepartment.map(({ department, customers }) => (
                <Box key={department} sx={{ mb: 4 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main' }}
                  >
                    {department}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Dates</TableCell>
                          <TableCell>Customer Name</TableCell>
                          <TableCell>Department</TableCell>
                          <TableCell>Employee Type</TableCell>
                          <TableCell align="right">Total Bill (Nu)</TableCell>
                          <TableCell>View</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customers.map((c) => {
                          return (
                            <TableRow
                              key={c.customerId || c.name + c.department}
                            >
                              <TableCell>{formatDisplayDates(c.saleDates)}</TableCell>
                              <TableCell>{c.name}</TableCell>
                              <TableCell>{c.department}</TableCell>
                              <TableCell>{c.employeeType || '-'}</TableCell>
                              <TableCell align="right">
                                Nu {(c.totalAmount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => setDetailCustomer(c)}
                                  title="View bills (items with date)"
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))
            )}
          </>
        )}
      </Paper>

      <Dialog
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        maxWidth="md"
        fullWidth
        fullScreen
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <span>Bills - {detailCustomer?.name} ({detailCustomer?.department})</span>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SaveAltIcon />}
              onClick={(e) => setBillSaveMenuAnchor(e.currentTarget)}
              disabled={!detailCustomer?.transactions?.length}
            >
              Save as
            </Button>
            <Menu
              anchorEl={billSaveMenuAnchor}
              open={!!billSaveMenuAnchor}
              onClose={() => setBillSaveMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => handleBillSave('pdf')}>
                  <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Save to device as PDF</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleBillSave('excel')}>
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Save to device as Excel</ListItemText>
              </MenuItem>
            </Menu>
            <IconButton size="small" onClick={() => setDetailCustomer(null)} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailCustomer && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Subtotal (Nu)</TableCell>
                    <TableCell align="right">Total (Nu)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailCustomer.transactions || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No transactions
                      </TableCell>
                    </TableRow>
                  ) : (
                    (detailCustomer.transactions || []).flatMap((txn, txnIdx) => {
                      const items = txn.items || [];
                      if (items.length === 0) {
                        return (
                          <TableRow key={txnIdx}>
                            <TableCell>{formatDisplayDate(txn.date)}</TableCell>
                            <TableCell colSpan={3}>-</TableCell>
                            <TableCell align="right">Nu {(txn.totalAmount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      }
                      return items.map((item, itemIdx) => (
                        <TableRow key={`${txnIdx}-${itemIdx}`}>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            {itemIdx === 0 ? formatDisplayDate(txn.date) : ''}
                          </TableCell>
                          <TableCell>{item.mealName}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            Nu {(item.subtotal ?? (item.quantity * item.unitPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                            {itemIdx === 0 ? (
                              <>
                                {`Nu ${(txn.totalAmount || 0).toFixed(2)}`}
                                {txn.saleNote ? (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {txn.saleNote}
                                  </Typography>
                                ) : null}
                              </>
                            ) : (
                              ''
                            )}
                          </TableCell>
                        </TableRow>
                      ));
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete selected sales?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to permanently delete {selectedDeleteSales.length} sale(s) totaling Nu{' '}
            {selectedDeleteTotal.toFixed(2)} from {deleteStartDate} to {deleteEndDate}. This will
            remove them from Supabase and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteSelectedSales}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete permanently'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default Reports;
