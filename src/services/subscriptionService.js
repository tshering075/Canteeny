export const PLAN_TYPES = {
  trial: { label: '14-Day Free Trial', months: 0, days: 14, isFree: true },
  monthly: { label: 'Monthly', months: 1, days: 30 },
  '6month': { label: '6 Months', months: 6, days: 182 },
  annual: { label: 'Annual', months: 12, days: 365 },
};

export function calculateExpiryDate(planType, fromDate = new Date()) {
  const plan = PLAN_TYPES[planType];
  if (!plan) return null;
  const base = new Date(fromDate);
  const expiry = new Date(base);
  expiry.setDate(expiry.getDate() + plan.days);
  return expiry.toISOString();
}

export function extendExpiryDate(currentExpiry, planType) {
  const now = new Date();
  const base =
    currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now;
  return calculateExpiryDate(planType, base);
}

export function getDaysRemaining(expiresAt) {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isSubscriptionActive(tenant) {
  if (!tenant) return false;
  if (tenant.status === 'paused' || tenant.status === 'expired') return false;
  if (!tenant.planExpiresAt) return false;
  return new Date(tenant.planExpiresAt) > new Date();
}

export function isExpiringSoon(tenant, daysThreshold = 7) {
  if (!tenant?.planExpiresAt) return false;
  const days = getDaysRemaining(tenant.planExpiresAt);
  return days > 0 && days <= daysThreshold;
}

export function formatExpiryDateTime(expiresAt) {
  if (!expiresAt) return 'Not set';
  return new Date(expiresAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function isFreeTrialPlan(planType) {
  return planType === 'trial' || !!PLAN_TYPES[planType]?.isFree;
}

export function getPlanPrice(settings, planType) {
  if (isFreeTrialPlan(planType)) return 0;
  if (!settings) return 0;
  if (planType === 'monthly') return Number(settings.monthlyPrice) || 0;
  if (planType === '6month') return Number(settings.sixMonthPrice) || 0;
  if (planType === 'annual') return Number(settings.annualPrice) || 0;
  return 0;
}
