import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLogbook } from '@/hooks/useLogbook';
import { logsModel } from '@/engine/logs';
import { formatTimeOfDay } from '@/engine/home';
import { formatDuration } from '@/engine/durations';
import { sessionDurationSeconds } from '@/engine/sessions';

export default function LogsScreen() {
  const logbook = useLogbook();

  useFocusEffect(
    useCallback(() => {
      logbook.refresh();
    }, [logbook]),
  );

  const weeks = logsModel(logbook.sessions, logbook.settings);
  const now = logbook.now;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {weeks.length === 0 && <Text style={styles.empty}>No sessions logged yet.</Text>}
      {weeks.map((week) => (
        <View key={week.key} style={styles.week}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekLabel}>{week.label}</Text>
            <Text style={[styles.weekTotal, week.overTarget && styles.overTargetText]}>
              {week.totalLabel} / {week.targetLabel}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  week.overTarget && styles.progressFillOver,
                  { width: `${Math.min(1, week.progress) * 100}%` },
                ]}
              />
            </View>
          </View>

          {week.days.map((day) => (
            <View key={day.key} style={styles.day}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <Text style={styles.dayTotal}>{day.totalLabel}</Text>
              </View>
              {day.sessions.map((session) => (
                <View key={session.id} style={styles.row}>
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
              ))}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.5,
    paddingVertical: 32,
  },
  week: {
    gap: 8,
  },
  weekHeader: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.4)',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekTotal: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  overTargetText: {
    color: '#c0392b',
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#0a7ea4',
  },
  progressFillOver: {
    backgroundColor: '#c0392b',
  },
  day: {
    gap: 4,
    marginTop: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  dayTotal: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    opacity: 0.7,
  },
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
