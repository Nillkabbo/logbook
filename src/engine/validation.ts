/**
 * Edit validation for the session detail sheet. Returns `null` when the pair is
 * acceptable, or a human-readable message explaining the rule that was broken.
 */
export function validateSessionTimes(
  checkIn: Date,
  checkOut: Date | null,
  now: Date,
): string | null {
  if (checkIn.getTime() > now.getTime()) {
    return 'Check-in cannot be in the future.';
  }
  if (checkOut && checkOut.getTime() > now.getTime()) {
    return 'Check-out cannot be in the future.';
  }
  if (checkOut && checkOut.getTime() <= checkIn.getTime()) {
    return 'Check-out must be after check-in.';
  }
  return null;
}

/** Reminder threshold must be a number in the inclusive 1–16 hour range. */
export function validateReminderThreshold(hours: number): string | null {
  if (!Number.isFinite(hours)) {
    return 'Reminder threshold must be a number.';
  }
  if (hours < 1 || hours > 16) {
    return 'Reminder threshold must be between 1 and 16 hours.';
  }
  return null;
}

/** Weekly target must be a positive number of hours. */
export function validateWeeklyTarget(hours: number): string | null {
  if (!Number.isFinite(hours)) {
    return 'Weekly target must be a number.';
  }
  if (hours <= 0) {
    return 'Weekly target must be a positive number of hours.';
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
    return 'Hourly rate must be a number.';
  }
  if (rate < 0) {
    return 'Hourly rate cannot be negative — leave it empty to hide earnings.';
  }
  return null;
}
