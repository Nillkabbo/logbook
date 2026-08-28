import { StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/engine/durations';
import { formatTimeOfDay } from '@/engine/home';
import { sessionDurationSeconds } from '@/engine/sessions';
import type { Session } from '@/engine/types';

/** One session row as rendered on Home and Logs: time range, duration, optional note. */
export function SessionRow({ session, now }: { session: Session; now: Date }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTimes}>
          {formatTimeOfDay(session.checkIn)} –{' '}
          {session.checkOut ? formatTimeOfDay(session.checkOut) : 'now'}
        </Text>
        <Text style={styles.rowDuration}>
          {formatDuration(sessionDurationSeconds(session, session.checkOut ?? now))}
        </Text>
      </View>
      {session.note.length > 0 && <Text style={styles.rowNote}>{session.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
    gap: 2,
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
    opacity: 0.7,
  },
});
