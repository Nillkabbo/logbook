import { StyleSheet, Text, View } from 'react-native';

import { formatDuration, formatTimeOfDay } from '@/engine/time';
import { sessionDurationSeconds } from '@/engine/sessions';
import type { Session } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';
import { useHour12 } from '@/ui/clock';
import { useI18n } from '@/ui/i18n';

/** One session row as rendered on Home and Logs: time range, duration, optional note. */
export function SessionRow({ session, now }: { session: Session; now: Date }) {
  const theme = useTheme();
  const hour12 = useHour12();
  const { t } = useI18n();
  // The running session's card is the app's one glass element — translucent,
  // hairline-edged, never counted in totals.
  const running = session.checkOut === null;
  const card = running
    ? [styles.row, { backgroundColor: theme.glass, borderColor: theme.glassEdge }]
    : [styles.row, { backgroundColor: theme.surface }, theme.cardShadow];
  return (
    <View style={card}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTimes, { color: theme.text }]}>
          {formatTimeOfDay(session.checkIn, hour12)} –{' '}
          {session.checkOut ? formatTimeOfDay(session.checkOut, hour12) : t('now')}
        </Text>
        <View style={styles.durationWrap}>
          {running && <View style={[styles.liveDot, { backgroundColor: theme.accent }]} />}
          <Text style={[styles.rowDuration, { color: theme.text }]}>
            {formatDuration(sessionDurationSeconds(session, session.checkOut ?? now))}
          </Text>
        </View>
      </View>
      {session.category.length > 0 && (
        <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.chipText, { color: theme.accent }]}>{session.category}</Text>
        </View>
      )}
      {session.note.length > 0 && <Text style={[styles.rowNote, { color: theme.muted }]}>{session.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 16,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    gap: 4,
  },
  durationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
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
