import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, generateId, STORAGE_KEYS } from './storage';
import { extendTenantPlan, getTenantById } from './tenantService';
import { getPlanPrice, isFreeTrialPlan } from './subscriptionService';
import { getPlatformSettings } from './platformService';
import { generateInvoiceNumber } from '../utils/invoicePdf';

const toPayment = (row) =>
  row
    ? {
        id: row.id,
        tenantId: row.tenant_id,
        planType: row.plan_type,
        paymentMethod: row.payment_method,
        amount: Number(row.amount) || 0,
        screenshotData: row.screenshot_data || '',
        notes: row.notes || '',
        status: row.status || 'pending',
        adminNotes: row.admin_notes || '',
        invoiceNumber: row.invoice_number || '',
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
      }
    : null;

export async function getPaymentsForTenant(tenantId) {
  if (supabase) {
    const { data, error } = await supabase
      .from('payment_submissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false });
    if (!error && data) return data.map(toPayment);
  }
  const all = getFromStorage(STORAGE_KEYS.PAYMENTS, []);
  return all.filter((p) => p.tenantId === tenantId);
}

export async function getAllPayments() {
  if (supabase) {
    const { data, error } = await supabase
      .from('payment_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (!error && data) {
      const list = data.map(toPayment);
      setInStorage(STORAGE_KEYS.PAYMENTS, list);
      return list;
    }
  }
  return getFromStorage(STORAGE_KEYS.PAYMENTS, []);
}

export async function getPendingPayments() {
  const all = await getAllPayments();
  return all.filter((p) => p.status === 'pending');
}

export async function submitPayment({ tenantId, planType, paymentMethod, screenshotData, notes }) {
  const settings = await getPlatformSettings();
  const amount = getPlanPrice(settings, planType);
  const isTrial = isFreeTrialPlan(planType);

  if (isTrial && settings?.freeTrialEnabled === false) {
    throw new Error('Free trial is currently disabled by the platform owner.');
  }

  if (isTrial) {
    const tenant = await getTenantById(tenantId);
    if (tenant && tenant.freeTrialEnabled === false) {
      throw new Error('Free trial is not enabled for this client.');
    }
  }

  const submittedAt = new Date().toISOString();
  const invoiceNumber = generateInvoiceNumber(submittedAt);
  // Free trial activates immediately — no payment review needed.
  const status = isTrial ? 'approved' : 'pending';
  const reviewedAt = isTrial ? submittedAt : null;

  const payload = {
    tenant_id: tenantId,
    plan_type: planType,
    payment_method: isTrial ? 'cash' : paymentMethod,
    amount,
    screenshot_data: isTrial ? '' : screenshotData || '',
    notes: notes?.trim() || (isTrial ? '14-day free trial' : ''),
    status,
    invoice_number: invoiceNumber,
    submitted_at: submittedAt,
    reviewed_at: reviewedAt,
  };

  let payment = null;

  if (supabase) {
    const { data, error } = await supabase
      .from('payment_submissions')
      .insert(payload)
      .select()
      .single();
    if (error) {
      if (/invoice_number|reviewed_at/.test(error.message || '')) {
        const { invoice_number, submitted_at, reviewed_at, ...legacyPayload } = payload;
        const { data: legacyData, error: legacyError } = await supabase
          .from('payment_submissions')
          .insert(legacyPayload)
          .select()
          .single();
        if (legacyError) throw new Error(legacyError.message || 'Failed to submit payment');
        payment = {
          ...toPayment(legacyData),
          invoiceNumber,
          status,
          reviewedAt,
        };
      } else {
        throw new Error(error.message || 'Failed to submit payment');
      }
    } else {
      payment = toPayment(data);
    }
  } else {
    payment = {
      id: generateId(),
      tenantId,
      planType,
      paymentMethod: payload.payment_method,
      amount,
      screenshotData: payload.screenshot_data,
      notes: payload.notes,
      status,
      adminNotes: '',
      invoiceNumber,
      submittedAt,
      reviewedAt,
    };
  }

  if (isTrial) {
    await extendTenantPlan(tenantId, planType);
  }

  const all = getFromStorage(STORAGE_KEYS.PAYMENTS, []);
  all.unshift(payment);
  setInStorage(STORAGE_KEYS.PAYMENTS, all);
  return payment;
}

async function updatePaymentStatus(id, status, adminNotes = '') {
  const reviewedAt = new Date().toISOString();

  if (supabase) {
    const { data, error } = await supabase
      .from('payment_submissions')
      .update({ status, admin_notes: adminNotes, reviewed_at: reviewedAt })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message || 'Failed to update payment');
    const payment = toPayment(data);
    const all = getFromStorage(STORAGE_KEYS.PAYMENTS, []);
    const idx = all.findIndex((p) => p.id === id);
    if (idx >= 0) all[idx] = payment;
    setInStorage(STORAGE_KEYS.PAYMENTS, all);
    return payment;
  }

  const all = getFromStorage(STORAGE_KEYS.PAYMENTS, []);
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Payment not found');
  all[idx] = { ...all[idx], status, adminNotes, reviewedAt };
  setInStorage(STORAGE_KEYS.PAYMENTS, all);
  return all[idx];
}

export async function approvePayment(paymentId, adminNotes = '') {
  const all = await getAllPayments();
  const payment = all.find((p) => p.id === paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'pending') throw new Error('Payment already reviewed');

  await extendTenantPlan(payment.tenantId, payment.planType);
  return updatePaymentStatus(paymentId, 'approved', adminNotes);
}

export async function rejectPayment(paymentId, adminNotes = '') {
  return updatePaymentStatus(paymentId, 'rejected', adminNotes);
}
