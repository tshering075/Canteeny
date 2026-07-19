import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PLAN_TYPES, isFreeTrialPlan } from '../services/subscriptionService';

// Supabase-like invoice palette: clean, minimal, soft green accent
const INK = [23, 23, 23];
const MUTED = [100, 116, 139];
const BORDER = [226, 232, 240];
const HEADER_BG = [248, 250, 252];
const ACCENT = [62, 207, 142]; // Supabase green-inspired
const PAGE_W = 210;
const MARGIN = 18;

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

function paymentMethodLabel(payment) {
  if (isFreeTrialPlan(payment?.planType)) return 'Free Trial';
  if (payment?.paymentMethod === 'cash') return 'Cash';
  return 'Mobile Pay';
}

function statusLabel(status) {
  if (status === 'approved') return 'Paid';
  if (status === 'rejected') return 'Void';
  return 'Open';
}

/** Plan coverage period for this invoice (start → end), like Supabase billing lines. */
export function getPlanPeriod(payment) {
  const plan = PLAN_TYPES[payment?.planType];
  const days = plan?.days || 30;
  const startRaw = payment?.reviewedAt || payment?.submittedAt || Date.now();
  const start = new Date(startRaw);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return { start, end, days };
}

/** e.g. "Apr 19 – May 19, 2026" (Supabase-style) */
export function formatPlanDateRange(start, end) {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startStr = s.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endStr = e.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

export function buildInvoiceData({ payment, tenant, settings }) {
  const invoiceNumber = resolveInvoiceNumber(payment);
  const submittedAt = payment.submittedAt ? new Date(payment.submittedAt) : new Date();
  const planLabel = PLAN_TYPES[payment.planType]?.label || payment.planType || '—';
  const amount = Number(payment.amount) || 0;
  const period = getPlanPeriod(payment);
  const planDateRange = formatPlanDateRange(period.start, period.end);

  return {
    invoiceNumber,
    submittedAt,
    dueDate: submittedAt,
    status: payment.status || 'pending',
    statusLabel: statusLabel(payment.status || 'pending'),
    tenantName: tenant?.name || 'Client',
    tenantContactName: tenant?.contactName || '',
    tenantEmail: tenant?.contactEmail || '',
    tenantPhone: tenant?.contactPhone || '',
    issuerName: settings?.paymentDisplayName || 'Canteeny',
    accountHolder: settings?.accountHolderName || '',
    accountNumber: settings?.accountNumber || '',
    planLabel,
    paymentMethodLabel: paymentMethodLabel(payment),
    description: `${planLabel} subscription`,
    planDateRange,
    planPeriodStart: period.start,
    planPeriodEnd: period.end,
    quantity: 1,
    unitPrice: amount,
    amount,
    subtotal: amount,
    total: amount,
    amountDue: payment.status === 'approved' ? 0 : amount,
    notes: payment.notes || '',
    adminNotes: payment.adminNotes || '',
  };
}

function formatMoney(n) {
  return `Nu. ${Number(n || 0).toFixed(2)}`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function createInvoicePdf(invoice) {
  const doc = new jsPDF();
  const right = PAGE_W - MARGIN;

  // Brand mark (small accent bar, Supabase-style restraint)
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // Header: brand left, Invoice title right
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Canteeny', MARGIN, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(invoice.issuerName, MARGIN, 24);
  if (invoice.accountHolder) doc.text(invoice.accountHolder, MARGIN, 29);
  if (invoice.accountNumber) doc.text(`Account ${invoice.accountNumber}`, MARGIN, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text('Invoice', right, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(invoice.invoiceNumber, right, 25, { align: 'right' });

  // Status pill
  const statusText = invoice.statusLabel;
  const statusColor =
    invoice.status === 'approved'
      ? [16, 185, 129]
      : invoice.status === 'rejected'
        ? [239, 68, 68]
        : [245, 158, 11];
  doc.setFillColor(...statusColor);
  const statusW = doc.getTextWidth(statusText) + 8;
  doc.roundedRect(right - statusW, 29, statusW, 6.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, right - statusW / 2, 33.5, { align: 'center' });

  // Divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 42, right, 42);

  // Meta + Bill to
  let y = 52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('INVOICE DATE', MARGIN, y);
  doc.text('DUE DATE', MARGIN, y + 12);
  doc.text('AMOUNT DUE', MARGIN, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(formatDate(invoice.submittedAt), MARGIN, y + 5);
  doc.text(formatDate(invoice.dueDate), MARGIN, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.text(
    invoice.status === 'approved' ? formatMoney(0) : formatMoney(invoice.amountDue),
    MARGIN,
    y + 29
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('BILL TO', 110, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(invoice.tenantName, 110, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let billY = y + 11;
  if (invoice.tenantContactName) {
    doc.text(invoice.tenantContactName, 110, billY);
    billY += 5;
  }
  if (invoice.tenantEmail) {
    doc.text(invoice.tenantEmail, 110, billY);
    billY += 5;
  }
  if (invoice.tenantPhone) {
    doc.text(invoice.tenantPhone, 110, billY);
  }

  // Line items table — clean Stripe/Supabase style
  doc.autoTable({
    startY: 92,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Description', 'Qty', 'Unit price', 'Amount']],
    body: [
      [
        [
          invoice.description,
          invoice.planDateRange,
          invoice.paymentMethodLabel,
        ]
          .filter(Boolean)
          .join('\n'),
        String(invoice.quantity),
        formatMoney(invoice.unitPrice),
        formatMoney(invoice.amount),
      ],
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      textColor: INK,
      cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
      lineColor: BORDER,
      lineWidth: 0.2,
      valign: 'top',
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: MUTED,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage: () => {},
  });

  // Totals block (right-aligned)
  y = doc.lastAutoTable.finalY + 12;
  const totalsX = 130;
  const valueX = right;

  doc.setDrawColor(...BORDER);
  doc.line(totalsX, y - 4, right, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Subtotal', totalsX, y);
  doc.setTextColor(...INK);
  doc.text(formatMoney(invoice.subtotal), valueX, y, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text('Total', totalsX, y);
  doc.text(formatMoney(invoice.total), valueX, y, { align: 'right' });

  y += 10;
  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(totalsX - 2, y - 5, right - totalsX + 2, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(
    invoice.status === 'approved' ? 'Amount paid' : 'Amount due',
    totalsX,
    y + 2.5
  );
  doc.setFont('helvetica', 'bold');
  doc.text(
    invoice.status === 'approved' ? formatMoney(invoice.total) : formatMoney(invoice.amountDue),
    valueX,
    y + 2.5,
    { align: 'right' }
  );

  // Notes
  y += 22;
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('NOTES', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(invoice.notes, MARGIN, y + 5, { maxWidth: PAGE_W - MARGIN * 2 });
    y += 16;
  }

  if (invoice.adminNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('ADMIN NOTES', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(invoice.adminNotes, MARGIN, y + 5, { maxWidth: PAGE_W - MARGIN * 2 });
  }

  // Footer
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, 275, right, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const footer =
    invoice.status === 'approved'
      ? 'Thank you for your business. This invoice was paid in full.'
      : invoice.status === 'rejected'
        ? 'This invoice was voided and is not payable.'
        : 'Payment received — your plan activates after administrator approval.';
  doc.text(footer, MARGIN, 281, { maxWidth: 140 });
  doc.text('canteeny.app', right, 281, { align: 'right' });

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
