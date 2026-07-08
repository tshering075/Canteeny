import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PLAN_TYPES } from '../services/subscriptionService';

const BRAND_COLOR = [230, 0, 18];

export function generateInvoiceNumber(submittedAt = new Date()) {
  const d = new Date(submittedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CNT-${y}${m}${day}-${rand}`;
}

export function resolveInvoiceNumber(payment) {
  if (payment?.invoiceNumber) return payment.invoiceNumber;
  const d = new Date(payment?.submittedAt || Date.now());
  const datePart = d.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(payment?.id || '000000').replace(/-/g, '').slice(0, 6).toUpperCase();
  return `CNT-${datePart}-${suffix}`;
}

export function buildInvoiceData({ payment, tenant, settings }) {
  const invoiceNumber = resolveInvoiceNumber(payment);
  const submittedAt = payment.submittedAt ? new Date(payment.submittedAt) : new Date();
  const planLabel = PLAN_TYPES[payment.planType]?.label || payment.planType || '—';
  const paymentMethodLabel = payment.paymentMethod === 'cash' ? 'Cash' : 'Mobile Pay';

  return {
    invoiceNumber,
    submittedAt,
    status: payment.status || 'pending',
    tenantName: tenant?.name || 'Client',
    tenantContact: [tenant?.contactName, tenant?.contactPhone, tenant?.contactEmail]
      .filter(Boolean)
      .join(' · '),
    issuerName: settings?.paymentDisplayName || 'Canteeny',
    accountHolder: settings?.accountHolderName || '',
    accountNumber: settings?.accountNumber || '',
    planLabel,
    paymentMethodLabel,
    amount: Number(payment.amount) || 0,
    notes: payment.notes || '',
    adminNotes: payment.adminNotes || '',
  };
}

function statusLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending Review';
}

export function createInvoicePdf(invoice) {
  const doc = new jsPDF();
  const dateStr = invoice.submittedAt.toLocaleString();

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Canteeny', 14, 18);
  doc.setFontSize(11);
  doc.text('Subscription Invoice', 14, 24);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 140, 40);
  doc.text(`Date: ${dateStr}`, 140, 46);
  doc.text(`Status: ${statusLabel(invoice.status)}`, 140, 52);

  doc.setFontSize(12);
  doc.setTextColor(...BRAND_COLOR);
  doc.text('Bill From', 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(invoice.issuerName, 14, 47);
  if (invoice.accountHolder) doc.text(invoice.accountHolder, 14, 53);
  if (invoice.accountNumber) doc.text(`A/C: ${invoice.accountNumber}`, 14, 59);

  doc.setFontSize(12);
  doc.setTextColor(...BRAND_COLOR);
  doc.text('Bill To', 14, 72);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(invoice.tenantName, 14, 79);
  if (invoice.tenantContact) doc.text(invoice.tenantContact, 14, 85);

  doc.autoTable({
    startY: 96,
    head: [['Description', 'Payment Method', 'Amount (Nu.)']],
    body: [[`${invoice.planLabel} Plan`, invoice.paymentMethodLabel, invoice.amount.toFixed(2)]],
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 10 },
  });

  let y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total: Nu. ${invoice.amount.toFixed(2)}`, 14, y);
  y += 10;

  if (invoice.notes) {
    doc.setFontSize(10);
    doc.text('Client notes:', 14, y);
    y += 6;
    doc.text(invoice.notes, 14, y, { maxWidth: 180 });
    y += 12;
  }

  if (invoice.adminNotes) {
    doc.text('Admin notes:', 14, y);
    y += 6;
    doc.text(invoice.adminNotes, 14, y, { maxWidth: 180 });
    y += 12;
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const footer =
    invoice.status === 'pending'
      ? 'This invoice confirms your payment submission. Your plan will be activated after admin approval.'
      : 'Thank you for using Canteeny.';
  doc.text(footer, 14, 280, { maxWidth: 180 });

  return doc;
}

export function downloadInvoicePdf(invoice) {
  const doc = createInvoicePdf(invoice);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function openInvoicePdf(invoice) {
  const doc = createInvoicePdf(invoice);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
