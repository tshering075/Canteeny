import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
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
import {
  getDailyReport,
  getMonthlyReportByCustomerDateRange,
} from '../services/reportService';
import { useAppState } from '../context/AppContext';
import {
  downloadReportPDF,
  downloadReportExcel,
  downloadCustomerBillPDF,
  downloadCustomerBillExcel,
} from '../utils/exportReport';

function Reports() {
  const { sales, customers } = useAppState();
  const [mode, setMode] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [saveMenuAnchor, setSaveMenuAnchor] = useState(null);
  const [billSaveMenuAnchor, setBillSaveMenuAnchor] = useState(null);

  const daily = mode === 'daily' ? getDailyReport(date, sales) : null;
  const monthlyReport =
    mode === 'monthly'
      ? getMonthlyReportByCustomerDateRange(startDate, endDate, sales, customers)
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

  const handleReportSave = (format) => {
    setSaveMenuAnchor(null);
    if (format === 'pdf') downloadReportPDF(filteredByDepartment, filteredGrandTotal, startDate, endDate);
    else downloadReportExcel(filteredByDepartment, filteredGrandTotal, startDate, endDate);
  };

  const handleBillSave = (format) => {
    if (!detailCustomer) return;
    setBillSaveMenuAnchor(null);
    if (format === 'pdf') downloadCustomerBillPDF(detailCustomer, startDate, endDate);
    else downloadCustomerBillExcel(detailCustomer, startDate, endDate);
  };

  return (
    <Box>
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
      </Box>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          {mode === 'daily'
            ? `Daily Report - ${date}`
            : `Monthly Report - ${startDate} to ${endDate}`}
        </Typography>

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
                        No sales in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...(report?.sales || [])]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{sale.date}</TableCell>
                          <TableCell>{sale.customerName}</TableCell>
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
                No sales in this period{search ? ' matching your search.' : '.'}
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
                          const datesText =
                            (c.saleDates || []).length > 0
                              ? (c.saleDates || []).join(', ')
                              : '-';

                          return (
                            <TableRow
                              key={c.customerId || c.name + c.department}
                            >
                              <TableCell>{datesText}</TableCell>
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
                            <TableCell>{txn.date}</TableCell>
                            <TableCell colSpan={3}>-</TableCell>
                            <TableCell align="right">Nu {(txn.totalAmount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      }
                      return items.map((item, itemIdx) => (
                        <TableRow key={`${txnIdx}-${itemIdx}`}>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            {itemIdx === 0 ? txn.date : ''}
                          </TableCell>
                          <TableCell>{item.mealName}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            Nu {(item.subtotal ?? (item.quantity * item.unitPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                            {itemIdx === 0 ? `Nu ${(txn.totalAmount || 0).toFixed(2)}` : ''}
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

    </Box>
  );
}

export default Reports;
