import { formatTimeOfDay } from './time';
import type { Weekday } from './types';

/**
 * Work blocks: recurring weekly commitments — chosen weekdays plus a start and
 * end time (minutes from local midnight; end < start crosses midnight, owned by
 * the start day). Blocks prompt check-ins; they never clock one in.
 */

export interface WorkBlock {
  id: number;
  weekdays: Weekday[];
  startMinute: number;
  endMinute: number;
}

export interface BlockOccurrence {
  block: WorkBlock;
  startsAt: Date;
}

function atMinute(day: Date, minutesFromMidnight: number): Date {
  const date = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  date.setMinutes(minutesFromMidnight);
  return date;
}

function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** The next upcoming block start after `now` (a start already passed does not count). */
export function nextBlockOccurrence(blocks: WorkBlock[], now: Date): BlockOccurrence | null {
  let best: BlockOccurrence | null = null;
  for (let offset = 0; offset <= 8; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    for (const block of blocks) {
      if (!block.weekdays.includes(day.getDay() as Weekday)) continue;
      const startsAt = atMinute(day, block.startMinute);
      if (startsAt.getTime() <= now.getTime()) continue;
      if (best === null || startsAt.getTime() < best.startsAt.getTime()) {
        best = { block, startsAt };
      }
    }
    if (best !== null && offset >= 1) break; // found a day-0 candidate or scanned a full week
  }
  return best;
}

/** The block `now` sits inside, overnight blocks owned by their start day. */
export function blockOccurring(blocks: WorkBlock[], now: Date): WorkBlock | null {
  const today = now.getDay() as Weekday;
  const yesterday = ((today + 6) % 7) as Weekday;
  const minutes = minuteOfDay(now);
  for (const block of blocks) {
    if (block.startMinute < block.endMinute) {
      // Same-day block
      if (block.weekdays.includes(today) && minutes >= block.startMinute && minutes < block.endMinute) {
        return block;
      }
    } else {
      // Overnight: from startMinute to midnight on the start day, or midnight to endMinute the next day
      const startedTonight =
        block.weekdays.includes(today) && minutes >= block.startMinute;
      const continuedFromYesterday =
        block.weekdays.includes(yesterday) && minutes < block.endMinute;
      if (startedTonight || continuedFromYesterday) {
        return block;
      }
    }
  }
  return null;
}

/** Block times are valid unless the range is empty; overnight ranges are fine. */
export function validateBlockTimes(startMinute: number, endMinute: number): string | null {
  if (startMinute === endMinute) {
    return 'errBlockRange';
  }
  return null;
}

/** A weekly notification spec: which weekday, what time, start or end of a block. */
export interface BlockTrigger {
  kind: 'start' | 'end';
  weekday: Weekday;
  hour: number;
  minute: number;
}

/**
 * The notification specs for one block — per weekday a start trigger and an end
 * trigger, the end rolling to the next weekday when the block crosses midnight.
 * The overnight rule lives here, once, tested.
 */
export function blockTriggers(block: WorkBlock): BlockTrigger[] {
  const triggers: BlockTrigger[] = [];
  const overnight = block.endMinute <= block.startMinute;
  for (const weekday of block.weekdays) {
    triggers.push({
      kind: 'start',
      weekday,
      hour: Math.floor(block.startMinute / 60),
      minute: block.startMinute % 60,
    });
    triggers.push({
      kind: 'end',
      weekday: overnight ? ((weekday + 1) % 7) as Weekday : weekday,
      hour: Math.floor(block.endMinute / 60),
      minute: block.endMinute % 60,
    });
  }
  return triggers;
}

/** One work block's row/sub-label text: "Sun–Thu · 9:00 AM–5:00 PM". */
export function blockRangeLabel(
  block: WorkBlock,
  weekdayName: (weekday: number) => string,
  hour12 = false,
): string {
  const atMinutes = (minutes: number) =>
    new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return (
    `${weekdayRuns(block.weekdays).map(([a, b]) => (a === b ? weekdayName(a) : `${weekdayName(a)}–${weekdayName(b)}`)).join(', ')} · ` +
    `${formatTimeOfDay(atMinutes(block.startMinute), hour12)}–` +
    `${formatTimeOfDay(atMinutes(block.endMinute), hour12)}`
  );
}

/** Compresses sorted weekdays into consecutive runs: [0,1,2,4] → [[0,2],[4,4]]. */
function weekdayRuns(weekdays: WorkBlock['weekdays']): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  for (const day of weekdays) {
    const last = runs[runs.length - 1];
    if (last && day === last[1] + 1) last[1] = day;
    else runs.push([day, day]);
  }
  return runs;
}
