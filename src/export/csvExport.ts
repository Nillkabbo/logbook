import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Writes the CSV to the cache directory and hands it to the OS share sheet.
 * Returns false when sharing is unavailable (e.g. web) so the caller can inform.
 */
export async function exportCsvViaShareSheet(csv: string): Promise<boolean> {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `logbook-sessions-${stamp}.csv`);
  file.write(csv);
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export sessions' });
  return true;
}
