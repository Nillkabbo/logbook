import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { logsModel } from '@/engine/logs';
import type { Session } from '@/engine/types';

export default function LogsScreen() {
  const { refresh, sessions, settings, now, saveSession, removeSession } = useLogbook();
  const [selected, setSelected] = useState<Session | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const weeks = logsModel(sessions, settings);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {weeks.length === 0 && <Text style={styles.empty}>No sessions logged yet.</Text>}
      {weeks.map((week) => (
        <View key={week.key} style={styles.week}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekLabel}>{week.label}</Text>
            <WeekProgress
              totalLabel={week.totalLabel}
              targetLabel={week.targetLabel}
              progress={week.progress}
              overTarget={week.overTarget}
            />
          </View>

          {week.days.map((day) => (
            <View key={day.key} style={styles.day}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <Text style={styles.dayTotal}>{day.totalLabel}</Text>
              </View>
              {day.sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={({ pressed }) => [styles.rowWrap, pressed && styles.rowPressed]}
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
  rowWrap: {
    borderRadius: 8,
  },
  rowPressed: {
    opacity: 0.7,
  },
});
