import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLogbook } from '@/hooks/useLogbook';
import { homeModel, formatTimeOfDay } from '@/engine/home';
import { formatDuration } from '@/engine/durations';
import { sessionDurationSeconds } from '@/engine/sessions';

export default function HomeScreen() {
  const logbook = useLogbook();
  const [busy, setBusy] = useState(false);

  // Re-read on focus so check-ins made elsewhere (or app restarts) are reflected.
  useFocusEffect(
    useCallback(() => {
      logbook.refresh();
    }, [logbook]),
  );

  // The hook's `now` ticks every second while a session runs, re-driving this model.
  const model = homeModel(logbook.sessions, logbook.settings, logbook.now);

  const onToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (model.running) {
        await logbook.checkOut();
      } else {
        await logbook.checkIn();
      }
    } catch (error) {
      Alert.alert('Something went wrong', String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {model.running && model.elapsedLabel ? (
          <Text style={styles.elapsed}>{model.elapsedLabel}</Text>
        ) : (
          <Text style={styles.elapsedPlaceholder}> </Text>
        )}
        <Pressable
          style={[styles.toggle, model.running ? styles.toggleOut : styles.toggleIn, busy && styles.toggleDisabled]}
          disabled={busy}
          onPress={onToggle}>
          <Text style={styles.toggleText}>{model.running ? 'Check out' : 'Check in'}</Text>
        </Pressable>
      </View>

      <View style={styles.totals}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Today</Text>
          <Text style={styles.totalValue}>{model.todayTotalLabel}</Text>
        </View>
        <View style={[styles.totalItem, styles.weekItem]}>
          <Text style={styles.totalLabel}>This week</Text>
          <Text style={[styles.totalValue, model.overTarget && styles.overTargetText]}>
            {model.weekTotalLabel} / {model.weeklyTargetLabel}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                model.overTarget && styles.progressFillOver,
                { width: `${Math.min(1, model.weekProgress) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {model.todaySessions.map((session) => (
          <View key={session.id} style={styles.row}>
            <Text style={styles.rowTimes}>
              {formatTimeOfDay(session.checkIn)} –{' '}
              {session.checkOut ? formatTimeOfDay(session.checkOut) : 'now'}
            </Text>
            <Text style={styles.rowDuration}>
              {session.checkOut
                ? formatDuration(sessionDurationSeconds(session))
                : formatDuration(sessionDurationSeconds(session, logbook.now))}
            </Text>
            {session.note.length > 0 && <Text style={styles.rowNote}>{session.note}</Text>}
          </View>
        ))}
        {model.todaySessions.length === 0 && (
          <Text style={styles.empty}>No sessions yet today.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  elapsed: {
    fontSize: 44,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  elapsedPlaceholder: {
    fontSize: 44,
  },
  toggle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIn: {
    backgroundColor: '#0a7ea4',
  },
  toggleOut: {
    backgroundColor: '#c0392b',
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  totalItem: {
    alignItems: 'center',
    gap: 2,
  },
  weekItem: {
    minWidth: 150,
  },
  overTargetText: {
    color: '#c0392b',
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.25)',
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#0a7ea4',
  },
  progressFillOver: {
    backgroundColor: '#c0392b',
  },
  totalLabel: {
    fontSize: 13,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  row: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
    gap: 2,
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
  empty: {
    textAlign: 'center',
    opacity: 0.5,
    paddingVertical: 16,
  },
});
