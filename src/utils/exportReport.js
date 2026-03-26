import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const REPORT_TITLE = 'Canteeny - Monthly Sales Report';
const TABLE_COLS = ['Dates', 'Customer Name', 'Department', 'Employee Type', 'Total Bill (Nu)'];

// Format customer for export (no View column)
function rowFromCustomer(c) {
  const datesText = (c.saleDates || []).length > 0
    ? (c.saleDates || []).join(', ')
    : '-';
  return [datesText, c.name, c.department, c.employeeType || '-', `Nu ${(c.totalAmount || 0).toFixed(2)}`];
}

export function downloadReportPDF(byDepartment, grandTotal, startDate, endDate) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(REPORT_TITLE, 14, 22);
  doc.setFontSize(11);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
  doc.text(`Grand Total: Nu ${(grandTotal || 0).toFixed(2)}`, 14, 37);

  let startY = 45;

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

  doc.save(`canteen-report-${startDate}-to-${endDate}.pdf`);
}

export function downloadReportExcel(byDepartment, grandTotal, startDate, endDate) {
  const wb = XLSX.utils.book_new();

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

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([[`Grand Total: Nu ${(grandTotal || 0).toFixed(2)}`]]),
    'Summary'
  );
  XLSX.writeFile(wb, `canteen-report-${startDate}-to-${endDate}.xlsx`);
}

// Returns PDF blob for sharing
export function getReportPDFBlob(byDepartment, grandTotal, startDate, endDate) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(REPORT_TITLE, 14, 22);
  doc.setFontSize(11);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
  doc.text(`Grand Total: Nu ${(grandTotal || 0).toFixed(2)}`, 14, 37);

  let startY = 45;
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
  return doc.output('blob');
}

// Returns Excel blob for sharing
export function getReportExcelBlob(byDepartment, grandTotal, startDate, endDate) {
  const wb = XLSX.utils.book_new();
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

// Customer bill PDF
export function downloadCustomerBillPDF(customer, startDate, endDate) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Bill - ${customer.name} (${customer.department})`, 14, 22);
  doc.setFontSize(10);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
  doc.text(`Total: Nu ${(customer.totalAmount || 0).toFixed(2)}`, 14, 37);

  const head = ['Date', 'Items', 'Total (Nu)'];
  const body = (customer.transactions || []).map((txn) => [
    txn.date,
    (txn.items || []).map((i) => `${i.mealName} x${i.quantity} (Nu ${(i.subtotal || 0).toFixed(2)})`).join(', ') || '-',
    `Nu ${(txn.totalAmount || 0).toFixed(2)}`,
  ]);

  doc.autoTable({
    head: [head],
    body,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [244, 0, 9] },
  });

  doc.save(`bill-${(customer.name || 'customer').replace(/\s+/g, '-')}-${startDate}-${endDate}.pdf`);
}

// Customer bill Excel
export function downloadCustomerBillExcel(customer, startDate, endDate) {
  const data = (customer.transactions || []).map((txn) => ({
    'Date': txn.date,
    'Items': (txn.items || []).map((i) => `${i.mealName} x${i.quantity} (Nu ${(i.subtotal || 0).toFixed(2)})`).join(', ') || '-',
    'Total (Nu)': (txn.totalAmount || 0).toFixed(2),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bill');
  XLSX.writeFile(wb, `bill-${(customer.name || 'customer').replace(/\s+/g, '-')}-${startDate}-${endDate}.xlsx`);
}

// Returns customer bill PDF blob for sharing
export function getCustomerBillPDFBlob(customer, startDate, endDate) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Bill - ${customer.name} (${customer.department})`, 14, 22);
  doc.setFontSize(10);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
  doc.text(`Total: Nu ${(customer.totalAmount || 0).toFixed(2)}`, 14, 37);

  const head = ['Date', 'Items', 'Total (Nu)'];
  const body = (customer.transactions || []).map((txn) => [
    txn.date,
    (txn.items || []).map((i) => `${i.mealName} x${i.quantity} (Nu ${(i.subtotal || 0).toFixed(2)})`).join(', ') || '-',
    `Nu ${(txn.totalAmount || 0).toFixed(2)}`,
  ]);
  doc.autoTable({
    head: [head],
    body,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [244, 0, 9] },
  });
  return doc.output('blob');
}

// Returns customer bill Excel blob for sharing
export function getCustomerBillExcelBlob(customer, startDate, endDate) {
  const data = (customer.transactions || []).map((txn) => ({
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
