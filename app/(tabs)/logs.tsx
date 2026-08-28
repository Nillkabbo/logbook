import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { logsModel } from '@/engine/logs';
import type { Session } from '@/engine/types';
import { useTheme } from '@/theme';

export default function LogsScreen() {
  const theme = useTheme();
  const { refresh, sessions, settings, now, saveSession, removeSession } = useLogbook();
  const [selected, setSelected] = useState<Session | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const weeks = logsModel(sessions, settings);
  const categorySuggestions = [...new Set(sessions.map((s) => s.category))].filter(
    (c) => c.length > 0,
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.subtle }}
      contentContainerStyle={styles.container}>
      {weeks.length === 0 && (
        <Text style={[styles.empty, { color: theme.muted }]}>No sessions logged yet.</Text>
      )}
      {weeks.map((week) => (
        <View key={week.key} style={styles.week}>
          <View style={[styles.weekHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.weekLabel, { color: theme.text }]}>{week.label}</Text>
            <WeekProgress
              totalLabel={week.totalLabel}
              targetLabel={week.targetLabel}
              progress={week.progress}
              overTarget={week.overTarget}
              overByLabel={week.overByLabel}
            />
            {week.earningsLabel && (
              <Text style={[styles.earnings, { color: theme.accent }]}>{week.earningsLabel}</Text>
            )}
            {week.categoryBreakdown.length > 0 && (
              <View style={styles.breakdown}>
                {week.categoryBreakdown.map((entry) => (
                  <View key={entry.label || '__none__'} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.muted }]}>
                      {entry.label || 'Uncategorised'}
                    </Text>
                    <Text style={[styles.breakdownTotal, { color: theme.text }]}>
                      {entry.totalLabel}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {week.days.map((day) => (
            <View key={day.key} style={styles.day}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: theme.text }]}>{day.label}</Text>
                <Text style={[styles.dayTotal, { color: theme.muted }]}>{day.totalLabel}</Text>
              </View>
              {day.sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={({ pressed }) => [styles.rowWrap, pressed && { opacity: 0.7 }]}
                  onPress={() => setSelected(session)}>
                  <SessionRow session={session} now={now} />
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      ))}

      {selected && (
        <SessionDetailSheet
          session={selected}
          suggestions={categorySuggestions}
          onSave={(patch) => saveSession(selected.id, patch)}
          onDelete={removeSession}
          onClose={() => setSelected(null)}
        />
      )}
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
    paddingVertical: 32,
  },
  week: {
    gap: 8,
  },
  weekHeader: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  earnings: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  breakdown: {
    gap: 2,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownTotal: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
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
  },
  dayTotal: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  rowWrap: {
    borderRadius: 16,
  },
});
