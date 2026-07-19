import { supabase } from '../lib/supabase';
import { getFromStorage, setInStorage, STORAGE_KEYS } from './storage';

const DEFAULT_SETTINGS = {
  id: 'default',
  qrImageData: '',
  paymentDisplayName: '',
  accountHolderName: '',
  accountNumber: '',
  monthlyPrice: 500,
  sixMonthPrice: 2700,
  annualPrice: 5000,
  freeTrialEnabled: true,
  mobilePayInstructions: 'Scan the QR code or copy the account number, then upload your payment screenshot.',
  contactName: '',
  contactWhatsapp: '',
  contactEmail: '',
};

const toSettings = (row) =>
  row
    ? {
        id: row.id,
        qrImageData: row.qr_image_data || row.qrImageData || '',
        paymentDisplayName: row.payment_display_name || row.paymentDisplayName || '',
        accountHolderName: row.account_holder_name || row.accountHolderName || '',
        accountNumber: row.account_number || row.accountNumber || '',
        monthlyPrice: Number(row.monthly_price ?? row.monthlyPrice) || 0,
        sixMonthPrice: Number(row.six_month_price ?? row.sixMonthPrice) || 0,
        annualPrice: Number(row.annual_price ?? row.annualPrice) || 0,
        // Default true when column missing (pre-migration) so existing behavior continues.
        freeTrialEnabled: row.free_trial_enabled !== false && row.freeTrialEnabled !== false,
        mobilePayInstructions: row.mobile_pay_instructions || row.mobilePayInstructions || '',
        contactName: row.contact_name || row.contactName || '',
        contactWhatsapp: row.contact_whatsapp || row.contactWhatsapp || '',
        contactEmail: row.contact_email || row.contactEmail || '',
      }
    : null;

function buildUpdatePayload(updates) {
  const payload = {};
  if (updates.qrImageData !== undefined) payload.qr_image_data = updates.qrImageData;
  if (updates.paymentDisplayName !== undefined) payload.payment_display_name = updates.paymentDisplayName;
  if (updates.accountHolderName !== undefined) payload.account_holder_name = updates.accountHolderName;
  if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
  if (updates.monthlyPrice !== undefined) payload.monthly_price = updates.monthlyPrice;
  if (updates.sixMonthPrice !== undefined) payload.six_month_price = updates.sixMonthPrice;
  if (updates.annualPrice !== undefined) payload.annual_price = updates.annualPrice;
  if (updates.freeTrialEnabled !== undefined) {
    payload.free_trial_enabled = updates.freeTrialEnabled !== false;
  }
  if (updates.mobilePayInstructions !== undefined) {
    payload.mobile_pay_instructions = updates.mobilePayInstructions;
  }
  if (updates.contactName !== undefined) payload.contact_name = updates.contactName;
  if (updates.contactWhatsapp !== undefined) payload.contact_whatsapp = updates.contactWhatsapp;
  if (updates.contactEmail !== undefined) payload.contact_email = updates.contactEmail;
  payload.updated_at = new Date().toISOString();
  return payload;
}

/** Strip keys that match missing-column errors so older DBs still save. */
function stripMissingColumns(payload, errorMessage) {
  const msg = errorMessage || '';
  const next = { ...payload };
  const pairs = [
    [/free_trial_enabled/i, 'free_trial_enabled'],
    [/contact_name/i, 'contact_name'],
    [/contact_whatsapp/i, 'contact_whatsapp'],
    [/contact_email/i, 'contact_email'],
  ];
  let stripped = false;
  for (const [re, key] of pairs) {
    if (re.test(msg) && key in next) {
      delete next[key];
      stripped = true;
    }
  }
  return stripped ? next : null;
}

export async function getPlatformSettings() {
  if (supabase) {
    const { data, error } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
    if (!error && data) {
      const settings = toSettings(data);
      setInStorage(STORAGE_KEYS.PLATFORM_SETTINGS, settings);
      return settings;
    }
  }
  const stored = getFromStorage(STORAGE_KEYS.PLATFORM_SETTINGS, DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    freeTrialEnabled: stored?.freeTrialEnabled !== false,
  };
}

export async function updatePlatformSettings(updates) {
  const current = await getPlatformSettings();

  if (supabase && current.id && current.id !== 'default') {
    let payload = buildUpdatePayload(updates);

    let { data, error } = await supabase
      .from('platform_settings')
      .update(payload)
      .eq('id', current.id)
      .select()
      .single();

    // Retry without columns that are not migrated yet.
    let retries = 0;
    while (error && retries < 4) {
      const stripped = stripMissingColumns(payload, error.message);
      if (!stripped) break;
      payload = stripped;
      ({ data, error } = await supabase
        .from('platform_settings')
        .update(payload)
        .eq('id', current.id)
        .select()
        .single());
      retries += 1;
    }

    if (error) throw new Error(error.message || 'Failed to update settings');

    const fromDb = toSettings(data);
    const settings = {
      ...fromDb,
      // Preserve contact/trial values locally if columns were stripped on save.
      contactName: updates.contactName !== undefined ? updates.contactName : fromDb.contactName,
      contactWhatsapp:
        updates.contactWhatsapp !== undefined ? updates.contactWhatsapp : fromDb.contactWhatsapp,
      contactEmail: updates.contactEmail !== undefined ? updates.contactEmail : fromDb.contactEmail,
      freeTrialEnabled:
        updates.freeTrialEnabled !== undefined
          ? updates.freeTrialEnabled !== false
          : fromDb.freeTrialEnabled !== false,
    };
    setInStorage(STORAGE_KEYS.PLATFORM_SETTINGS, settings);
    return settings;
  }

  const settings = {
    ...current,
    ...updates,
    freeTrialEnabled:
      updates.freeTrialEnabled !== undefined
        ? updates.freeTrialEnabled !== false
        : current.freeTrialEnabled !== false,
  };
  setInStorage(STORAGE_KEYS.PLATFORM_SETTINGS, settings);
  return settings;
}
