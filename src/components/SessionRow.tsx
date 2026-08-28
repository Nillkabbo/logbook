import { StyleSheet, Text, View } from 'react-native';

import { formatDuration, formatTimeOfDay } from '@/engine/time';
import { sessionDurationSeconds } from '@/engine/sessions';
import type { Session } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';
import { useHour12 } from '@/ui/clock';

/** One session row as rendered on Home and Logs: time range, duration, optional note. */
export function SessionRow({ session, now }: { session: Session; now: Date }) {
  const theme = useTheme();
  const hour12 = useHour12();
  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTimes, { color: theme.text }]}>
          {formatTimeOfDay(session.checkIn, hour12)} –{' '}
          {session.checkOut ? formatTimeOfDay(session.checkOut, hour12) : 'now'}
        </Text>
        <Text style={[styles.rowDuration, { color: theme.text }]}>
          {formatDuration(sessionDurationSeconds(session, session.checkOut ?? now))}
        </Text>
      </View>
      {session.category.length > 0 && (
        <View style={[styles.chip, { borderColor: theme.accent }]}>
          <Text style={[styles.chipText, { color: theme.accent }]}>{session.category}</Text>
        </View>
      )}
      {session.note.length > 0 && <Text style={[styles.rowNote, { color: theme.muted }]}>{session.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 14,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rowTimes: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  rowDuration: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rowNote: {
    fontSize: 13,
  },
});
