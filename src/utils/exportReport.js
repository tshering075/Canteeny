import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDisplayDate, formatDisplayDates } from './dateFormat';

// Match invoice PDF palette (Supabase-style clean report)
const INK = [23, 23, 23];
const MUTED = [100, 116, 139];
const BORDER = [226, 232, 240];
const HEADER_BG = [248, 250, 252];
const ACCENT = [62, 207, 142];
const PAGE_W = 210;
const MARGIN = 18;

const TABLE_COLS = ['Dates', 'Customer Name', 'Department', 'Employee Type', 'Total Bill (Nu)'];

const cleanTableTheme = {
  theme: 'plain',
  styles: {
    font: 'helvetica',
    fontSize: 9,
    textColor: INK,
    cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
    lineColor: BORDER,
    lineWidth: 0.2,
    valign: 'middle',
  },
  headStyles: {
    font: 'helvetica',
    fontStyle: 'bold',
    fillColor: HEADER_BG,
    textColor: MUTED,
    fontSize: 8,
    cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
  },
  alternateRowStyles: {
    fillColor: [255, 255, 255],
  },
};

function normalizeSaleTypeLabel(saleTypeLabel) {
  const label = (saleTypeLabel || 'Credit').toString().trim();
  if (!label) return 'Credit';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function reportTitle(saleTypeLabel) {
  return `${normalizeSaleTypeLabel(saleTypeLabel)} Sales Report`;
}

function reportFileSlug(saleTypeLabel) {
  return normalizeSaleTypeLabel(saleTypeLabel).toLowerCase().replace(/\s+/g, '-');
}

function formatMoney(n) {
  return `Nu ${(Number(n) || 0).toFixed(2)}`;
}

function drawReportHeader(doc, { title, metaLines }) {
  const right = PAGE_W - MARGIN;
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('Canteeny', MARGIN, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Sales report', MARGIN, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(title, right, 18, { align: 'right' });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 30, right, 30);

  let y = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  (metaLines || []).forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 5;
  });
  return y + 4;
}

// Format customer for export (no View column)
function rowFromCustomer(c) {
  const datesText = formatDisplayDates(c.saleDates);
  return [datesText, c.name, c.department, c.employeeType || '-', formatMoney(c.totalAmount)];
}

function buildMonthlyReportDoc(byDepartment, grandTotal, startDate, endDate, saleTypeLabel) {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const doc = new jsPDF();
  doc.setFont('helvetica', 'normal');

  let startY = drawReportHeader(doc, {
    title: reportTitle(typeLabel),
    metaLines: [
      `Sale type: ${typeLabel}`,
      `Period: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`,
      `Grand total: ${formatMoney(grandTotal)}`,
    ],
  });

  (byDepartment || []).forEach(({ department, customers }) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(department, MARGIN, startY);
    startY += 6;

    const body = customers.map(rowFromCustomer);
    doc.autoTable({
      head: [TABLE_COLS],
      body,
      startY,
      margin: { left: MARGIN, right: MARGIN },
      ...cleanTableTheme,
      columnStyles: {
        4: { halign: 'right' },
      },
    });
    startY = doc.lastAutoTable.finalY + 12;
  });

  // Footer total
  const right = PAGE_W - MARGIN;
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, startY - 4, right, startY - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text('Grand total', MARGIN, startY + 4);
  doc.text(formatMoney(grandTotal), right, startY + 4, { align: 'right' });

  return doc;
}

export function downloadReportPDF(byDepartment, grandTotal, startDate, endDate, saleTypeLabel = 'Credit') {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const doc = buildMonthlyReportDoc(byDepartment, grandTotal, startDate, endDate, typeLabel);
  doc.save(`canteen-${reportFileSlug(typeLabel)}-report-${startDate}-to-${endDate}.pdf`);
}

export function downloadReportExcel(byDepartment, grandTotal, startDate, endDate, saleTypeLabel = 'Credit') {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Report', `Canteeny - ${reportTitle(typeLabel)}`],
      ['Sale Type', typeLabel],
      ['Period', `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`],
      ['Grand Total (Nu)', (grandTotal || 0).toFixed(2)],
    ]),
    'Summary'
  );

  (byDepartment || []).forEach(({ department, customers }) => {
    const data = customers.map((c) => ({
      'Dates': formatDisplayDates(c.saleDates),
      'Customer Name': c.name,
      'Department': c.department,
      'Employee Type': c.employeeType || '-',
      'Total Bill (Nu)': (c.totalAmount || 0).toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, department.slice(0, 31));
  });

  XLSX.writeFile(wb, `canteen-${reportFileSlug(typeLabel)}-report-${startDate}-to-${endDate}.xlsx`);
}

// Returns PDF blob for sharing
export function getReportPDFBlob(byDepartment, grandTotal, startDate, endDate, saleTypeLabel = 'Credit') {
  return buildMonthlyReportDoc(byDepartment, grandTotal, startDate, endDate, saleTypeLabel).output('blob');
}

// Returns Excel blob for sharing
export function getReportExcelBlob(byDepartment, grandTotal, startDate, endDate, saleTypeLabel = 'Credit') {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Report', `Canteeny - ${reportTitle(typeLabel)}`],
      ['Sale Type', typeLabel],
      ['Period', `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`],
      ['Grand Total (Nu)', (grandTotal || 0).toFixed(2)],
    ]),
    'Summary'
  );
  (byDepartment || []).forEach(({ department, customers }) => {
    const data = customers.map((c) => ({
      'Dates': formatDisplayDates(c.saleDates),
      'Customer Name': c.name,
      'Department': c.department,
      'Employee Type': c.employeeType || '-',
      'Total Bill (Nu)': (c.totalAmount || 0).toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, department.slice(0, 31));
  });
  const arr = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function buildCustomerBillDoc(customer, startDate, endDate, saleTypeLabel) {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const doc = new jsPDF();
  doc.setFont('helvetica', 'normal');

  const startY = drawReportHeader(doc, {
    title: 'Customer Bill',
    metaLines: [
      `Customer: ${customer.name || '—'} (${customer.department || '—'})`,
      `Sale type: ${typeLabel}`,
      `Period: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`,
      `Total: ${formatMoney(customer.totalAmount)}`,
    ],
  });

  const head = ['Date', 'Items', 'Total (Nu)'];
  const body = (customer.transactions || []).map((txn) => [
    formatDisplayDate(txn.date),
    (txn.items || [])
      .map((i) => `${i.mealName} x${i.quantity} (${formatMoney(i.subtotal || 0)})`)
      .join(', ') || '-',
    formatMoney(txn.totalAmount),
  ]);

  doc.autoTable({
    head: [head],
    body,
    startY,
    margin: { left: MARGIN, right: MARGIN },
    ...cleanTableTheme,
    columnStyles: {
      2: { halign: 'right' },
    },
  });

  return doc;
}

// Customer bill PDF
export function downloadCustomerBillPDF(customer, startDate, endDate, saleTypeLabel = 'Credit') {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const doc = buildCustomerBillDoc(customer, startDate, endDate, typeLabel);
  doc.save(
    `bill-${reportFileSlug(typeLabel)}-${(customer.name || 'customer').replace(/\s+/g, '-')}-${startDate}-${endDate}.pdf`
  );
}

// Customer bill Excel
export function downloadCustomerBillExcel(customer, startDate, endDate, saleTypeLabel = 'Credit') {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const data = (customer.transactions || []).map((txn) => ({
    'Sale Type': typeLabel,
    'Date': formatDisplayDate(txn.date),
    'Items': (txn.items || []).map((i) => `${i.mealName} x${i.quantity} (Nu ${(i.subtotal || 0).toFixed(2)})`).join(', ') || '-',
    'Total (Nu)': (txn.totalAmount || 0).toFixed(2),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bill');
  XLSX.writeFile(
    wb,
    `bill-${reportFileSlug(typeLabel)}-${(customer.name || 'customer').replace(/\s+/g, '-')}-${startDate}-${endDate}.xlsx`
  );
}

// Returns customer bill PDF blob for sharing
export function getCustomerBillPDFBlob(customer, startDate, endDate, saleTypeLabel = 'Credit') {
  return buildCustomerBillDoc(customer, startDate, endDate, saleTypeLabel).output('blob');
}

// Returns customer bill Excel blob for sharing
export function getCustomerBillExcelBlob(customer, startDate, endDate, saleTypeLabel = 'Credit') {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const data = (customer.transactions || []).map((txn) => ({
    'Sale Type': typeLabel,
    'Date': formatDisplayDate(txn.date),
    'Items': (txn.items || []).map((i) => `${i.mealName} x${i.quantity} (Nu ${(i.subtotal || 0).toFixed(2)})`).join(', ') || '-',
    'Total (Nu)': (txn.totalAmount || 0).toFixed(2),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bill');
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
