/** The backup nudge: how stale an export may get before LogBook asks again. */
export const BACKUP_INTERVAL_MS = 30 * 86_400_000;

/** True when no export has happened yet, or the last one is older than the interval. */
export function isBackupDue(lastExportEpochMs: number | null, now: Date): boolean {
  if (lastExportEpochMs === null) return true;
  return now.getTime() - lastExportEpochMs >= BACKUP_INTERVAL_MS;
}
