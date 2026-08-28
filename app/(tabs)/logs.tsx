import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
  // Toggle from the *effective* state, so a default-expanded week collapses on first tap.
  const toggleWeek = (week: LogWeek) =>
    setExpanded((prev) => ({ ...prev, [week.key]: !(prev[week.key] ?? week.defaultExpanded) }));

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
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}>
      {suggestions.length > 0 && (
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
          <View key={week.key} style={styles.weekBlock}>
          <View style={[styles.weekCard, { backgroundColor: theme.surface }, theme.cardShadow]}>
            <View style={styles.weekHeader}>
              <Pressable
              style={styles.weekTitleBlock}
              accessibilityRole="button"
              accessibilityLabel={t('markOff')}
              onPress={() => toggleWeek(week)}>
                {week.isCurrent && (
                  <Text style={[styles.weekEyebrow, { color: theme.muted }]}>{t('currentWeek')}</Text>
                )}
                <Text style={[styles.weekLabel, { color: theme.text }]}>{week.label}</Text>
              </Pressable>
              <Pressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => toggleOff(week.key)}>
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
                row
                earningsLabel={week.earningsLabel}
              />
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
              <View style={[styles.breakdown, { borderTopColor: theme.canvas }]}>
                {week.categoryBreakdown.map((entry, index) => (
                  <View key={entry.label || '__none__'} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: dotColor(theme, index) }]} />
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
                  style={({ pressed }) => [styles.rowWrap, pressed && { opacity: 0.8 }]}
                  onPress={() => setSelected(session)}>
                  <SessionRow session={session} now={now} accentRunning />
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
            onPress={() => toggleWeek(week)}>
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
                      {t('overLabel')}{week.overByLabel ? ` +${week.overByLabel}` : ''}
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

/** The breakdown dot palette — emerald first, then muted zinc steps. */
function dotColor(theme: ReturnType<typeof useTheme>, index: number): string {
  if (index === 0) return theme.accent;
  return index === 1 ? '#71717A' : theme.inset;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
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
    flexWrap: 'nowrap',
    gap: 12,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekCard: {
    borderRadius: RADIUS.card,
    padding: 24,
    gap: 24,
  },
  weekHeader: {
    gap: 4,
  },
  weekTitleBlock: {
    gap: 2,
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekEyebrow: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  weekLabel: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
  },
  offToggle: {
    fontSize: 14,
    fontWeight: '400',
  },
  offRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offTotal: {
    fontSize: 24,
    fontWeight: '600',
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
    marginTop: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  breakdown: {
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  breakdownLabel: {
    fontSize: 14,
    flex: 1,
  },
  breakdownTotal: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  weekBlock: {
    gap: 24,
  },
  day: {
    gap: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 8,
  },
  dayLabel: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dayTotal: {
    fontSize: 14,
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
    padding: 24,
    gap: 8,
  },
  collapsedLabel: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  collapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedTotal: {
    fontSize: 14,
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
