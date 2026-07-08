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
  mobilePayInstructions: 'Scan the QR code or copy the account number, then upload your payment screenshot.',
};

const toSettings = (row) =>
  row
    ? {
        id: row.id,
        qrImageData: row.qr_image_data || '',
        paymentDisplayName: row.payment_display_name || '',
        accountHolderName: row.account_holder_name || '',
        accountNumber: row.account_number || '',
        monthlyPrice: Number(row.monthly_price) || 0,
        sixMonthPrice: Number(row.six_month_price) || 0,
        annualPrice: Number(row.annual_price) || 0,
        mobilePayInstructions: row.mobile_pay_instructions || '',
      }
    : null;

export async function getPlatformSettings() {
  if (supabase) {
    const { data, error } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
    if (!error && data) {
      const settings = toSettings(data);
      setInStorage(STORAGE_KEYS.PLATFORM_SETTINGS, settings);
      return settings;
    }
  }
  return getFromStorage(STORAGE_KEYS.PLATFORM_SETTINGS, DEFAULT_SETTINGS);
}

export async function updatePlatformSettings(updates) {
  const current = await getPlatformSettings();

  if (supabase && current.id && current.id !== 'default') {
    const payload = {};
    if (updates.qrImageData !== undefined) payload.qr_image_data = updates.qrImageData;
    if (updates.paymentDisplayName !== undefined) payload.payment_display_name = updates.paymentDisplayName;
    if (updates.accountHolderName !== undefined) payload.account_holder_name = updates.accountHolderName;
    if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
    if (updates.monthlyPrice !== undefined) payload.monthly_price = updates.monthlyPrice;
    if (updates.sixMonthPrice !== undefined) payload.six_month_price = updates.sixMonthPrice;
    if (updates.annualPrice !== undefined) payload.annual_price = updates.annualPrice;
    if (updates.mobilePayInstructions !== undefined) {
      payload.mobile_pay_instructions = updates.mobilePayInstructions;
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('platform_settings')
      .update(payload)
      .eq('id', current.id)
      .select()
      .single();
    if (error) throw new Error(error.message || 'Failed to update settings');
    const settings = toSettings(data);
    setInStorage(STORAGE_KEYS.PLATFORM_SETTINGS, settings);
    return settings;
  }

  const settings = { ...current, ...updates };
  setInStorage(STORAGE_KEYS.PLATFORM_SETTINGS, settings);
  return settings;
}
