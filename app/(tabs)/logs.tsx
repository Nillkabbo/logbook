import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { weekKey } from '@/engine/weeks';
import { categorySuggestions } from '@/engine/sessions';
import { useI18n } from '@/ui/i18n';
import { logsModel, type LogWeek } from '@/engine/logs';
import type { Session } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';

export default function LogsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
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
  // Per-visit expansion overrides on top of the model's defaults — never persisted.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (week: LogWeek) => expanded[week.key] ?? week.defaultExpanded;
  const toggleWeek = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  useFocusEffect(
    useCallback(() => {
      refresh();
      setCategoryFilter(null); // filters are per-visit, not sticky
      setExpanded({}); // expansion overrides are per-visit too
    }, [refresh]),
  );

  const weeks = logsModel(sessions, settings, now, categoryFilter ?? undefined, locale);
  const suggestions = categorySuggestions(sessions);

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.container}>
      {categorySuggestions.length > 0 && (
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, categoryFilter === null && { backgroundColor: theme.accent }]}
            onPress={() => setCategoryFilter(null)}>
            <Text style={[styles.filterText, { color: categoryFilter === null ? theme.onAccent : theme.text }]}>{t('all')}</Text>
          </Pressable>
          {suggestions.map((chip) => {
            const active = categoryFilter === chip;
            return (
              <Pressable
                key={chip}
                style={[styles.filterChip, { backgroundColor: theme.inset }, active && { backgroundColor: theme.accent }]}
                onPress={() => setCategoryFilter(active ? null : chip)}>
                <Text style={[styles.filterText, { color: active ? theme.onAccent : theme.text }]}>{chip}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {weeks.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🕘</Text>
          <Text style={[styles.empty, { color: theme.muted }]}>{t('emptyLogs')}</Text>
        </View>
      )}
      {weeks.map((week) =>
        isExpanded(week) ? (
          <View key={week.key} style={styles.week}>
            <View style={styles.weekHeader}>
              <Pressable style={styles.weekTitleRow} onPress={() => toggleWeek(week.key)}>
                <Text style={[styles.weekLabel, { color: theme.text }]}>{week.label}</Text>
                <Text style={[styles.chevron, { color: theme.muted }]}>⌄</Text>
              </Pressable>
              <Pressable onPress={() => toggleOff(week.key)}>
                <Text style={[styles.offToggle, { color: theme.muted }]}>
                  {week.off ? t('markOn') : t('markOff')}
                </Text>
              </Pressable>
            </View>
            {week.off ? (
              <View style={styles.offRow}>
                <Text style={[styles.offTotal, { color: theme.text }]}>{week.totalLabel}</Text>
                <View style={[styles.offBadge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.offBadgeText, { color: theme.accent }]}>{t('offWeek')}</Text>
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
                      backgroundColor: bar.isToday ? theme.accent : theme.inset,
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
                      {entry.label || t('uncategorised')}
                    </Text>
                    <Text style={[styles.breakdownTotal, { color: theme.text }]}>
                      {entry.totalLabel}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {week.days.map((day) => (
              <View key={day.key} style={styles.day}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayLabel, { color: theme.text }]}>{day.label}</Text>
                  <Text style={[styles.dayTotal, { color: theme.muted }]}>{day.totalLabel}</Text>
                </View>
                {day.sessions.map((session) => (
                  <Pressable
                    key={session.id}
                    style={({ pressed }) => [styles.rowWrap, pressed && { opacity: 0.8 }]}
                    onPress={() => setSelected(session)}>
                    <SessionRow session={session} now={now} />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Pressable
            key={week.key}
            style={({ pressed }) => [
              styles.collapsed,
              { backgroundColor: theme.surface },
              theme.cardShadow,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => toggleWeek(week.key)}>
            <Text style={[styles.collapsedLabel, { color: theme.text }]}>{week.label}</Text>
            <View style={styles.collapsedRight}>
              <Text style={[styles.collapsedTotal, { color: theme.muted }]}>{week.totalLabel}</Text>
              {week.off ? (
                <View style={[styles.statusPill, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.statusText, { color: theme.accent }]}>{t('offWeek')}</Text>
                </View>
              ) : (
                week.overTarget && (
                  <View style={[styles.statusPill, { backgroundColor: theme.stopSoft }]}>
                    <Text style={[styles.statusText, { color: theme.stop }]}>
                      OVER{week.overByLabel ? ` +${week.overByLabel}` : ''}
                    </Text>
                  </View>
                )
              )}
              <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
            </View>
          </Pressable>
        ),
      )}

      {selected && (
        <SessionDetailSheet
          session={selected}
          suggestions={suggestions}
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
    gap: 12,
  },
  empty: {
    textAlign: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 40,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
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
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
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
    borderRadius: 24,
  },
  collapsed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.card,
    padding: 14,
    gap: 8,
  },
  collapsedLabel: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  collapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedTotal: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
});
