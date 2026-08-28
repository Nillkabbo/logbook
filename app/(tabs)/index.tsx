import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CheckInToggle } from '@/components/CheckInToggle';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { homeModel } from '@/engine/home';
import { TYPE, useTheme } from '@/theme';

export default function HomeScreen() {
  const theme = useTheme();
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
    <View style={[styles.screen, { backgroundColor: theme.subtle }]}>
      <View style={styles.header}>
        <Text style={[styles.elapsed, { color: theme.text }]}>
          {model.running && model.elapsedLabel ? model.elapsedLabel : ' '}
        </Text>
        <CheckInToggle running={model.running !== null} disabled={busy} onPress={onToggle} />
      </View>

      <View style={styles.totals}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>Today</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>{model.todayTotalLabel}</Text>
        </View>
        <View style={[styles.totalItem, styles.weekItem]}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>This week</Text>
          <WeekProgress
            totalLabel={model.weekToDateLabel}
            targetLabel={model.weeklyTargetLabel}
            progress={model.weekProgress}
            overTarget={model.overTarget}
            overByLabel={model.overByLabel}
            emphasized
          />
          {model.earningsLabel && (
            <Text style={[styles.earnings, { color: theme.accent }]}>{model.earningsLabel}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {model.todaySessions.map((session) => (
          <SessionRow key={session.id} session={session} now={now} />
        ))}
        {model.todaySessions.length === 0 && (
          <Text style={[styles.empty, { color: theme.muted }]}>No sessions yet today.</Text>
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
    paddingVertical: 16,
    gap: 8,
  },
  elapsed: {
    ...TYPE.display,
    fontVariant: ['tabular-nums'],
    minHeight: 60,
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
    minWidth: 170,
  },
  totalLabel: {
    ...TYPE.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  earnings: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 16,
  },
});
