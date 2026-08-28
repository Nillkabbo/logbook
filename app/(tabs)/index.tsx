import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { homeModel } from '@/engine/home';

export default function HomeScreen() {
  const { refresh, checkIn, checkOut, sessions, settings, now } = useLogbook();
  const [busy, setBusy] = useState(false);

  // Re-read on focus so data written elsewhere (or app restarts) is reflected.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // The store's `now` ticks every second while a session runs, re-driving this model.
  const model = homeModel(sessions, settings, now);

  const onToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (model.running) {
        await checkOut();
      } else {
        await checkIn();
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
          <WeekProgress
            totalLabel={model.weekToDateLabel}
            targetLabel={model.weeklyTargetLabel}
            progress={model.weekProgress}
            overTarget={model.overTarget}
            emphasized
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {model.todaySessions.map((session) => (
          <SessionRow key={session.id} session={session} now={now} />
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
  empty: {
    textAlign: 'center',
    opacity: 0.5,
    paddingVertical: 16,
  },
});
