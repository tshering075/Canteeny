function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getCouponValue(coupon) {
  if (!coupon) return 0;
  const qty = Number(coupon.quantity) || 0;
  const rate = Number(coupon.rate) || 0;
  return roundMoney(qty * rate);
}

function normalizeCartItem(item) {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const subtotal = roundMoney(item.subtotal ?? quantity * unitPrice);
  return {
    mealId: item.mealId,
    mealName: item.mealName,
    quantity,
    unitPrice,
    subtotal,
  };
}

/**
 * Split cart into coupon-covered and credit-balance portions.
 * Coupon budget is qty * rate from the selected coupon.
 */
export function splitCartByCouponValue(cart, couponValue) {
  const budget = roundMoney(couponValue);
  const items = (cart || []).map(normalizeCartItem);
  const cartTotal = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));

  if (budget <= 0 || cartTotal <= budget) {
    return {
      couponItems: items,
      creditItems: [],
      couponTotal: cartTotal,
      creditTotal: 0,
    };
  }

  let remaining = budget;
  const couponItems = [];
  const creditItems = [];

  for (const item of items) {
    if (remaining <= 0) {
      creditItems.push({ ...item });
      continue;
    }

    if (item.subtotal <= remaining) {
      couponItems.push({ ...item });
      remaining = roundMoney(remaining - item.subtotal);
      continue;
    }

    const unitPrice = item.unitPrice;
    if (unitPrice > 0 && item.subtotal > 0) {
      // Allocate by amount so the full coupon budget is used (not lost to 0.5 qty steps).
      const couponSubtotal = roundMoney(Math.min(remaining, item.subtotal));
      const creditSubtotal = roundMoney(item.subtotal - couponSubtotal);
      const couponQty = roundMoney((couponSubtotal / item.subtotal) * item.quantity);
      const creditQty = roundMoney(item.quantity - couponQty);

      if (couponSubtotal > 0) {
        couponItems.push({
          ...item,
          quantity: couponQty,
          subtotal: couponSubtotal,
        });
      }
      if (creditSubtotal > 0) {
        creditItems.push({
          ...item,
          quantity: creditQty > 0 ? creditQty : item.quantity,
          subtotal: creditSubtotal,
        });
      }
    } else if (unitPrice > 0) {
      couponItems.push({
        ...item,
        subtotal: roundMoney(remaining),
      });
      creditItems.push({
        ...item,
        subtotal: roundMoney(item.subtotal - remaining),
      });
    }

    remaining = 0;
  }

  const couponTotal = roundMoney(couponItems.reduce((sum, item) => sum + item.subtotal, 0));
  const creditTotal = roundMoney(cartTotal - couponTotal);

  if (creditItems.length > 0) {
    const computedCredit = roundMoney(creditItems.reduce((sum, item) => sum + item.subtotal, 0));
    const drift = roundMoney(creditTotal - computedCredit);
    if (drift !== 0) {
      const last = creditItems[creditItems.length - 1];
      last.subtotal = roundMoney(last.subtotal + drift);
    }
  }

  return {
    couponItems,
    creditItems,
    couponTotal,
    creditTotal,
  };
}
