/** Formats a USD amount as `$1,234.50`. Pure — no React Native imports. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A rate record: the hourly rate active from `effectiveFrom` onward. */
export interface RateRecord {
  id: number;
  rate: number;
  effectiveFrom: Date;
}

/**
 * The rate active on `date` — the most recent record whose effectiveFrom is
 * <= date. Null when no record covers the date (earnings hidden).
 */
export function rateForDate(history: RateRecord[], date: Date): number | null {
  let active: RateRecord | null = null;
  for (const record of history) {
    if (record.effectiveFrom.getTime() <= date.getTime()) {
      if (!active || record.effectiveFrom.getTime() > active.effectiveFrom.getTime()) {
        active = record;
      }
    }
  }
  return active?.rate ?? null;
}

/** A session's earnings: duration × the rate at the session's check-in date. */
export function sessionEarnings(
  durationSeconds: number,
  checkIn: Date,
  history: RateRecord[],
): number | null {
  const rate = rateForDate(history, checkIn);
  if (rate === null || rate <= 0) return null;
  return (durationSeconds / 3600) * rate;
}
