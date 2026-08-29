import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { sessionsToCsv } from '@/engine/csv';
import type { RateRecord } from '@/engine/money';
import type { Session } from '@/engine/types';

/** What the file is: a full backup, or the filtered subset the Logs screen is looking at. */
export type ExportScope = 'backup' | 'filtered';

/**
 * The export adapter: renders the CSV (each session at its own rate), names the
 * file by scope so a filtered subset never masquerades as a backup, and hands
 * it to the OS share sheet. Returns false when sharing is unavailable so the
 * caller can inform. Stamping `lastExportAt` is the store's backup-only policy —
 * a filtered export is not a backup.
 */
export async function exportSessionsCsv(
  sessions: Session[],
  rateHistory: RateRecord[],
  scope: ExportScope,
): Promise<boolean> {
  const csv = sessionsToCsv(sessions, rateHistory);
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `logbook-${scope}-${stamp}.csv`);
  file.write(csv);
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export sessions' });
  return true;
}
