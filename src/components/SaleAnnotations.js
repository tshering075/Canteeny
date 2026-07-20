import React from 'react';
import { Typography } from '@mui/material';

/** Coupon name and sale note shown under customer in lists. */
export default function SaleAnnotations({ sale }) {
  if (!sale) return null;

  return (
    <>
      {sale.couponName ? (
        <Typography variant="caption" display="block" color="text.secondary">
          Coupon: {sale.couponName}
        </Typography>
      ) : null}
      {sale.saleNote ? (
        <Typography variant="caption" display="block" color="text.secondary">
          {sale.saleNote}
        </Typography>
      ) : null}
    </>
  );
}

export function balanceAfterCouponNote(couponName) {
  const name = (couponName || '').trim();
  return name ? `Balance after coupon: ${name}` : '';
}
