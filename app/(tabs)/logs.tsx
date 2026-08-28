import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { weekKey } from '@/engine/weeks';
import { logsModel } from '@/engine/logs';
import type { Session } from '@/engine/types';
import { useTheme } from '@/theme';

export default function LogsScreen() {
  const theme = useTheme();
  const { refresh, sessions, settings, now, saveSession, removeSession, saveSettings } =
    useLogbook();

  const toggleOff = (key: string) =>
    saveSettings({
      offWeeks: settings.offWeeks.includes(key)
        ? settings.offWeeks.filter((k) => k !== key)
        : [...settings.offWeeks, key],
    });
  const [selected, setSelected] = useState<Session | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      setCategoryFilter(null); // filters are per-visit, not sticky
    }, [refresh]),
  );

  const weeks = logsModel(sessions, settings, now, categoryFilter ?? undefined);
  const categorySuggestions = [...new Set(sessions.map((s) => s.category))].filter(
    (c) => c.length > 0,
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.subtle }}
      contentContainerStyle={styles.container}>
      {categorySuggestions.length > 0 && (
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, categoryFilter === null && { backgroundColor: theme.accent, borderColor: theme.accent }]}
            onPress={() => setCategoryFilter(null)}>
            <Text style={[styles.filterText, { color: categoryFilter === null ? theme.onAccent : theme.text }]}>All</Text>
          </Pressable>
          {categorySuggestions.map((chip) => {
            const active = categoryFilter === chip;
            return (
              <Pressable
                key={chip}
                style={[styles.filterChip, { borderColor: theme.border }, active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => setCategoryFilter(active ? null : chip)}>
                <Text style={[styles.filterText, { color: active ? theme.onAccent : theme.text }]}>{chip}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {weeks.length === 0 && (
        <Text style={[styles.empty, { color: theme.muted }]}>No sessions yet — your history builds here.</Text>
      )}
      {weeks.map((week) => (
        <View key={week.key} style={styles.week}>
          <View style={[styles.weekHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.weekTitleRow}>
              <Text style={[styles.weekLabel, { color: theme.text }]}>{week.label}</Text>
              <Pressable onPress={() => toggleOff(week.key)}>
                <Text style={[styles.offToggle, { color: theme.muted }]}>
                  {week.off ? 'Mark on' : 'Mark off'}
                </Text>
              </Pressable>
            </View>
            {week.off ? (
              <View style={styles.offRow}>
                <Text style={[styles.offTotal, { color: theme.text }]}>{week.totalLabel}</Text>
                <View style={[styles.offBadge, { borderColor: theme.accent }]}>
                  <Text style={[styles.offBadgeText, { color: theme.accent }]}>Off week</Text>
                </View>
              </View>
            ) : (
              <WeekProgress
                totalLabel={week.totalLabel}
                targetLabel={week.targetLabel}
                progress={week.progress}
                overTarget={week.overTarget}
                overByLabel={week.overByLabel}
              />
            )}
            {week.earningsLabel && (
              <Text style={[styles.earnings, { color: theme.accent }]}>{week.earningsLabel}</Text>
            )}
            <View style={styles.bars}>
              {week.dayBars.map((bar) => (
                <View
                  key={bar.key}
                  style={[
                    styles.bar,
                    {
                      height: 3 + bar.intensity * 28,
                      backgroundColor: bar.isToday ? theme.accent : theme.border,
                    },
                  ]}
                />
              ))}
            </View>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterText: {
    fontSize: 13,
  },
  week: {
    gap: 8,
  },
  weekHeader: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  offToggle: {
    fontSize: 13,
    fontWeight: '600',
  },
  offRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offTotal: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  offBadge: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  earnings: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 32,
    marginTop: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
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
