import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TABLE_COLS = ['Dates', 'Customer Name', 'Department', 'Employee Type', 'Total Bill (Nu)'];

function normalizeSaleTypeLabel(saleTypeLabel) {
  const label = (saleTypeLabel || 'Credit').toString().trim();
  if (!label) return 'Credit';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function reportTitle(saleTypeLabel) {
  return `Canteeny - ${normalizeSaleTypeLabel(saleTypeLabel)} Sales Report`;
}

function reportFileSlug(saleTypeLabel) {
  return normalizeSaleTypeLabel(saleTypeLabel).toLowerCase().replace(/\s+/g, '-');
}

// Format customer for export (no View column)
function rowFromCustomer(c) {
  const datesText = (c.saleDates || []).length > 0
    ? (c.saleDates || []).join(', ')
    : '-';
  return [datesText, c.name, c.department, c.employeeType || '-', `Nu ${(c.totalAmount || 0).toFixed(2)}`];
}

function buildMonthlyReportDoc(byDepartment, grandTotal, startDate, endDate, saleTypeLabel) {
  const typeLabel = normalizeSaleTypeLabel(saleTypeLabel);
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(reportTitle(typeLabel), 14, 22);
  doc.setFontSize(11);
  doc.text(`Sale Type: ${typeLabel}`, 14, 30);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 37);
  doc.text(`Grand Total: Nu ${(grandTotal || 0).toFixed(2)}`, 14, 44);

  let startY = 52;

  (byDepartment || []).forEach(({ department, customers }) => {
    doc.setFontSize(12);
    doc.setTextColor(0, 100, 180);
    doc.text(department, 14, startY);
    startY += 8;

    const body = customers.map(rowFromCustomer);
    doc.autoTable({
      head: [TABLE_COLS],
      body,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [244, 0, 9] },
    });
    startY = doc.lastAutoTable.finalY + 12;
  });

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
      ['Report', reportTitle(typeLabel)],
      ['Sale Type', typeLabel],
      ['Period', `${startDate} to ${endDate}`],
      ['Grand Total (Nu)', (grandTotal || 0).toFixed(2)],
    ]),
    'Summary'
  );

  (byDepartment || []).forEach(({ department, customers }) => {
    const data = customers.map((c) => ({
      'Dates': (c.saleDates || []).join(', ') || '-',
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
      ['Report', reportTitle(typeLabel)],
      ['Sale Type', typeLabel],
      ['Period', `${startDate} to ${endDate}`],
      ['Grand Total (Nu)', (grandTotal || 0).toFixed(2)],
    ]),
    'Summary'
  );
  (byDepartment || []).forEach(({ department, customers }) => {
    const data = customers.map((c) => ({
      'Dates': (c.saleDates || []).join(', ') || '-',
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
  doc.setFontSize(16);
  doc.text(`Bill - ${customer.name} (${customer.department})`, 14, 22);
  doc.setFontSize(10);
  doc.text(`Sale Type: ${typeLabel}`, 14, 30);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 37);
  doc.text(`Total: Nu ${(customer.totalAmount || 0).toFixed(2)}`, 14, 44);

  const head = ['Date', 'Items', 'Total (Nu)'];
  const body = (customer.transactions || []).map((txn) => [
    txn.date,
    (txn.items || []).map((i) => `${i.mealName} x${i.quantity} (Nu ${(i.subtotal || 0).toFixed(2)})`).join(', ') || '-',
    `Nu ${(txn.totalAmount || 0).toFixed(2)}`,
  ]);

  doc.autoTable({
    head: [head],
    body,
    startY: 52,
    theme: 'grid',
    headStyles: { fillColor: [244, 0, 9] },
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
    'Date': txn.date,
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
    'Date': txn.date,
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
