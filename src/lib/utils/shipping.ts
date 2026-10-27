/**
 * Unified Shipping & Currency Calculation Utility
 * Standardizes shipping thresholds, rates, currency formatting, and return windows across GAZAARABIA
 */

export const SHIPPING_CONFIG = {
  // UK Shipping Rules
  FREE_SHIPPING_THRESHOLD: 60,
  STANDARD_SHIPPING_FEE: 3.99,
  
  // International Shipping Rules
  INTERNATIONAL_FREE_THRESHOLD: 120,
  INTERNATIONAL_SHIPPING_FEE: 9.99,

  // Policies
  RETURN_WINDOW_DAYS: 14,
} as const;

export interface ShippingCalculation {
  fee: number;
  isFree: boolean;
  remainingForFree: number;
  threshold: number;
}

/**
 * Calculates shipping fee, free shipping eligibility, and remaining balance needed for free delivery.
 */
export function calculateShipping(subtotal: number, country?: string): ShippingCalculation {
  const safeSubtotal = Number(subtotal) || 0;
  const isInternational =
    Boolean(country) &&
    !["uk", "united kingdom", "gb", "great britain", "england", "scotland", "wales", "northern ireland"].includes(
      String(country).toLowerCase().trim()
    );

  const threshold = isInternational
    ? SHIPPING_CONFIG.INTERNATIONAL_FREE_THRESHOLD
    : SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD;

  const standardFee = isInternational
    ? SHIPPING_CONFIG.INTERNATIONAL_SHIPPING_FEE
    : SHIPPING_CONFIG.STANDARD_SHIPPING_FEE;

  if (safeSubtotal <= 0) {
    return {
      fee: 0,
      isFree: false,
      remainingForFree: threshold,
      threshold,
    };
  }

  const isFree = safeSubtotal >= threshold;
  const fee = isFree ? 0 : standardFee;
  const remainingForFree = Math.max(0, Number((threshold - safeSubtotal).toFixed(2)));

  return {
    fee,
    isFree,
    remainingForFree,
    threshold,
  };
}

/**
 * Formats currency values in British Pounds (£) rounded to 2 decimal places.
 */
export function formatGBP(amount: number | string | null | undefined): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return "£0.00";
  return `£${num.toFixed(2)}`;
}

/**
 * Rounds any currency value strictly to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}
