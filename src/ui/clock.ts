import { getCalendars } from 'expo-localization';

/**
 * The device's clock preference, for screen display only. The engine's
 * formatters stay pure — callers pass `hour12` in. The CSV stays 24-hour
 * forever: a machine format must never be ambiguous.
 */
export function useHour12(): boolean {
  const uses24 = getCalendars()[0]?.uses24hourClock;
  if (uses24 === true) return false;
  if (uses24 === false) return true;
  // Null on some devices — fall back to the locale's default cycle.
  const resolved = new Intl.DateTimeFormat().resolvedOptions().hourCycle ?? 'h23';
  return resolved === 'h11' || resolved === 'h12';
}
