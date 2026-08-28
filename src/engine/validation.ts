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
