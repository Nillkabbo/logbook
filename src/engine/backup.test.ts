import { describe, expect, it } from 'vitest';

import { BACKUP_INTERVAL_MS, isBackupDue } from './backup';

const DAY = 86_400_000;
const NOW = new Date(2026, 7, 28, 12, 0);

describe('isBackupDue', () => {
  it('never exported → due', () => {
    expect(isBackupDue(null, NOW)).toBe(true);
  });

  it('exported 29 days ago → not due yet', () => {
    expect(isBackupDue(NOW.getTime() - 29 * DAY, NOW)).toBe(false);
  });

  it('exported 31 days ago → due', () => {
    expect(isBackupDue(NOW.getTime() - 31 * DAY, NOW)).toBe(true);
  });

  it('interval is 30 days', () => {
    expect(BACKUP_INTERVAL_MS).toBe(30 * DAY);
  });
});
