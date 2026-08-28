/**
 * Clock formatting for the LogBook engine — every wall-clock and duration
 * representation lives here. Pure functions only: this module must never
 * import React Native.
 */

/** Formats whole seconds as clock-style `H:MM` (minutes zero-padded, seconds floored away). */
export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/** Formats whole seconds as a live elapsed timer `H:MM:SS` (minutes and seconds zero-padded). */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** 24-hour `HH:MM` wall-clock time in the local timezone. */
export function formatTimeOfDay(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
