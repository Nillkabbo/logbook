/**
 * Edit validation for the session detail sheet. Returns `null` when the pair is
 * acceptable, or a human-readable message explaining the rule that was broken.
 */
/** Messages are i18n keys (src/ui/i18n) — the engine stays pure, the UI translates. */
export function validateSessionTimes(
  checkIn: Date,
  checkOut: Date | null,
  now: Date,
): string | null {
  if (checkIn.getTime() > now.getTime()) {
    return 'errCheckinFuture';
  }
  if (checkOut && checkOut.getTime() > now.getTime()) {
    return 'errCheckoutFuture';
  }
  if (checkOut && checkOut.getTime() <= checkIn.getTime()) {
    return 'errCheckoutAfter';
  }
  return null;
}

/** Reminder threshold must be a number in the inclusive 1–16 hour range. */
export function validateReminderThreshold(hours: number): string | null {
  if (!Number.isFinite(hours)) {
    return 'errNotNumber';
  }
  if (hours < 1 || hours > 16) {
    return 'errThresholdRange';
  }
  return null;
}

/** Weekly target must be a positive number of hours. */
export function validateWeeklyTarget(hours: number): string | null {
  if (!Number.isFinite(hours)) {
    return 'errTargetNumber';
  }
  if (hours <= 0) {
    return 'errTargetPositive';
  }
  return null;
}

/** Parses user-typed hours, accepting either decimal separator; NaN when not numeric. */
export function parseHoursInput(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
}

/** Hourly rate must be zero (unset) or a positive finite number. */
export function validateHourlyRate(rate: number): string | null {
  if (!Number.isFinite(rate)) {
    return 'errRateNumber';
  }
  if (rate < 0) {
    return 'errRateNegative';
  }
  return null;
}

/** A rate-history change must be a positive finite number — zero would earn nothing forever. */
export function validateRateChange(rate: number): string | null {
  if (!Number.isFinite(rate)) {
    return 'errRateNumber';
  }
  if (rate <= 0) {
    return 'errRatePositive';
  }
  return null;
}
