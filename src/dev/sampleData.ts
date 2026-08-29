/**
 * DEV-ONLY sample-data seeder: realistic sessions across the given number of
 * weeks (8 ≈ 2 months, 52 ≈ 1 year), plus work blocks and a rate history
 * ($28 → $30 → $32.50). Clears existing data first so re-loading is
 * idempotent. Wired only from the Data sub-screen under __DEV__; strip this
 * module before release. Returns the number of sessions seeded. Callers
 * refresh the store afterwards.
 */
import {
  completeSession,
  deleteBlock as deleteBlockInDb,
  deleteRate,
  deleteSession as deleteSessionInDb,
  insertBlock,
  insertRate,
  insertSession,
  listBlocks,
  listRateHistory,
  listSessions,
  updateSettings as updateSettingsInDb,
} from '@/db/database';

export async function loadSampleData(weeks = 8): Promise<number> {
  {
    // Clear existing data so re-loading is idempotent
    for (const session of await listSessions()) {
      await deleteSessionInDb(session.id);
    }
    for (const block of await listBlocks()) {
      await deleteBlockInDb(block.id);
    }
    for (const record of await listRateHistory()) {
      await deleteRate(record.id);
    }

    // Deterministic PRNG (Lehmer/Park-Miller)
    let prng = 12345;
    const rand = () => {
      prng = (prng * 48271) % 2147483647;
      return prng / 2147483647;
    };
    const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
    const randInt = (min: number, max: number) =>
      min + Math.floor(rand() * (max - min + 1));

    const CATEGORIES = ['Deep work', 'Deep work', 'Meetings', 'Meetings', 'Admin', 'Writing'];
    const NOTES: Record<string, string[]> = {
      'Deep work': ['payments refactor', 'auth flow', 'dashboard polish', 'API migration', 'bug hunt'],
      'Meetings': ['sprint planning', '1:1 with Sam', 'design review', 'client call', 'standup'],
      'Admin': ['expenses', 'inbox zero', 'timesheet'],
      'Writing': ['blog post', 'release notes', 'docs update'],
    };

    const now = new Date();

    // ── Work blocks ──
    await insertBlock([1, 2, 3, 4, 5], 540, 1020); // Mon–Fri 9:00–17:00
    await insertBlock([6], 600, 840); // Sat 10:00–14:00

    // ── Rate history: $28 from Jan, $30 from Apr, $32.50 from Aug ──
    await insertRate(28, new Date(now.getFullYear(), 0, 1));
    await insertRate(30, new Date(now.getFullYear(), 3, 1));
    await insertRate(32.5, new Date(now.getFullYear(), 7, 1));

    // ── Compute week boundaries relative to this week's Sunday ──
    const thisSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    const weekStart = (weeksAgo: number) => {
      const d = new Date(thisSunday);
      d.setDate(thisSunday.getDate() - weeksAgo * 7);
      return d;
    };
    const weekEnd = (weeksAgo: number) => {
      const d = new Date(thisSunday);
      d.setDate(thisSunday.getDate() - weeksAgo * 7 + 7);
      return d;
    };

    // Off week = 2 weeks ago; over-target = 3 and 5 weeks ago
    const OFF_WEEK = 2;
    const OVER_WEEKS = [3, 5];

    let count = 0;

    // ── Generate sessions ──
    for (let weeksAgo = weeks; weeksAgo >= 0; weeksAgo--) {
      const wStart = weekStart(weeksAgo);
      const wEnd = weekEnd(weeksAgo);
      const isOff = weeksAgo === OFF_WEEK;
      const isOver = OVER_WEEKS.includes(weeksAgo);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        if (isOff) break; // skip the entire off week

        const date = new Date(wStart);
        date.setDate(wStart.getDate() + dayOffset);
        const dow = date.getDay();

        // Sunday: never
        if (dow === 0) continue;
        // Saturday: 20% chance
        if (dow === 6 && rand() > 0.2) continue;
        // Weekday: 15% skip (not in over-target weeks)
        if (dow >= 1 && dow <= 5 && rand() < 0.15 && !isOver) continue;
        // Today (weeksAgo=0, dayOffset=today's dow): skip if before now
        if (weeksAgo === 0 && date > now) continue;

        // 1-3 sessions per day
        const sessionsToday = isOver ? randInt(2, 3) : randInt(1, 3);
        // Over-target weeks get longer sessions
        const baseDur = isOver ? randInt(180, 300) : randInt(60, 240);

        // Start times: morning ~8:30, midday ~12:00, afternoon ~14:30
        const startHours = [8.5, 12, 14.5];

        for (let i = 0; i < sessionsToday; i++) {
          const cat = pick(CATEGORIES);
          const note = rand() < 0.35 ? pick(NOTES[cat] ?? ['']) : '';
          const startH = startHours[i] + rand() * 0.5; // up to 30min jitter
          const durMin = baseDur + randInt(-30, 30);
          const startTotalMin = Math.floor(startH * 60);
          const endTotalMin = Math.min(startTotalMin + durMin, 17 * 60 + 30);
          if (endTotalMin - startTotalMin < 30) continue;

          const checkIn = new Date(
            date.getFullYear(), date.getMonth(), date.getDate(),
            Math.floor(startTotalMin / 60), startTotalMin % 60,
          );
          const checkOut = new Date(
            date.getFullYear(), date.getMonth(), date.getDate(),
            Math.floor(endTotalMin / 60), endTotalMin % 60,
          );
          const id = await insertSession(checkIn, note, cat);
          await completeSession(id, checkOut);
          count++;
        }
      }
    }

    // ── Running session: started 45 minutes ago ──
    const runningStart = new Date(now.getTime() - 45 * 60 * 1000);
    await insertSession(runningStart, '', '');
    count++;

    // ── Settings ──
    const offSunday = weekStart(OFF_WEEK);
    const offKey = `${offSunday.getFullYear()}-${String(offSunday.getMonth() + 1).padStart(2, '0')}-${String(offSunday.getDate()).padStart(2, '0')}`;
    await updateSettingsInDb({ hourlyRate: 32.5, offWeeks: [offKey] });

    return count;
  };
}
