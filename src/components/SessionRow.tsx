import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatDuration, formatTimeOfDay } from '@/engine/time';
import { sessionDurationSeconds } from '@/engine/sessions';
import type { Session } from '@/engine/types';
import { cardStyle, RADIUS, useTheme } from '@/theme';
import { useHour12 } from '@/ui/clock';
import { useI18n } from '@/ui/i18n';

/** One session row as rendered on Home and Logs: time range, duration, optional note. */
function SessionRowImpl({ session, now, accentRunning = false }: { session: Session; now: Date; accentRunning?: boolean }) {
  const theme = useTheme();
  const hour12 = useHour12();
  const { t } = useI18n();
  // The running session's card is the app's one glass element — translucent,
  // hairline-edged, never counted in totals.
  const running = session.checkOut === null;
  const card = running
    ? accentRunning
      ? [styles.row, cardStyle(theme), { borderLeftWidth: 4, borderLeftColor: theme.accent }]
      : [styles.row, { backgroundColor: theme.glass, borderColor: theme.glassEdge }]
    : [styles.row, cardStyle(theme)];
  return (
    <View style={card}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTimes, { color: theme.text }]}>
          {formatTimeOfDay(session.checkIn, hour12)} –{' '}
          {session.checkOut ? formatTimeOfDay(session.checkOut, hour12) : t('now')}
        </Text>
        <View style={styles.durationWrap}>
          {running && <View style={[styles.liveDot, { backgroundColor: theme.accent, boxShadow: theme.dotGlow }]} />}
          <Text
            style={[
              styles.rowDuration,
              { color: running && accentRunning ? theme.accent : theme.text },
            ]}>
            {formatDuration(sessionDurationSeconds(session, session.checkOut ?? now))}
          </Text>
        </View>
      </View>
      {(session.category.length > 0 || session.note.length > 0) && (
        <View style={styles.metaRow}>
          {session.category.length > 0 && (
            <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.chipText, { color: theme.accent }]}>{session.category}</Text>
            </View>
          )}
          {session.note.length > 0 && (
            <Text style={[styles.rowNote, { color: theme.muted }]} numberOfLines={1} ellipsizeMode="tail">
              {session.note}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 24,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rowTimes: {
    fontSize: 15,
    fontWeight: '500',
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

/**
 * Memoised per the RN performance guide: completed rows never depend on the
 * ticking `now`, so they stop re-rendering every second a session runs.
 */
export const SessionRow = memo(
  SessionRowImpl,
  (prev, next) =>
    prev.session.id === next.session.id &&
    prev.session.checkOut?.getTime() === next.session.checkOut?.getTime() &&
    prev.session.note === next.session.note &&
    prev.session.category === next.session.category &&
    prev.accentRunning === next.accentRunning &&
    (next.session.checkOut !== null || prev.now.getTime() === next.now.getTime()),
);
