import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { categorySuggestions } from '@/engine/sessions';
import { useI18n } from '@/ui/i18n';
import { logsModel, type LogDay, type LogWeek } from '@/engine/logs';
import type { Session } from '@/engine/types';
import { ChipRow } from '@/components/ChipRow';
import { cardStyle, RADIUS, useTheme } from '@/theme';

/** One virtualized row: a week's summary card, a day header, a session card, or a collapsed week. */
type Row =
  | { kind: 'week'; key: string; week: LogWeek }
  | { kind: 'day'; key: string; day: LogDay }
  | { kind: 'session'; key: string; session: Session }
  | { kind: 'collapsed'; key: string; week: LogWeek };

/** Flattens the grouped model newest-first into FlatList rows; expanded weeks contribute their days and sessions. */
function buildRows(weeks: LogWeek[], isExpanded: (week: LogWeek) => boolean): Row[] {
  const rows: Row[] = [];
  for (const week of weeks) {
    if (!isExpanded(week)) {
      rows.push({ kind: 'collapsed', key: `w-${week.key}`, week });
      continue;
    }
    rows.push({ kind: 'week', key: `w-${week.key}`, week });
    for (const day of week.days) {
      rows.push({ kind: 'day', key: `d-${day.key}`, day });
      for (const session of day.sessions) {
        rows.push({ kind: 'session', key: `s-${session.id}`, session });
      }
    }
  }
  return rows;
}

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
  const rows = buildRows(weeks, isExpanded);

  const renderWeekCard = (week: LogWeek) => (
    <View style={[styles.weekCard, cardStyle(theme)]}>
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
  );

  const renderItem = ({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'week':
        return renderWeekCard(item.week);
      case 'day':
        return (
          <View style={styles.day}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayLabel, { color: theme.text }]}>{item.day.label}</Text>
              <Text style={[styles.dayTotal, { color: theme.muted }]}>{item.day.totalLabel}</Text>
            </View>
          </View>
        );
      case 'session':
        return (
          <Pressable
            android_ripple={{ color: theme.inset, foreground: true }}
            style={({ pressed }) => [styles.rowWrap, pressed && { opacity: 0.8 }]}
            onPress={() => setSelected(item.session)}>
            <SessionRow session={item.session} now={now} accentRunning />
          </Pressable>
        );
      case 'collapsed':
        return (
          <Pressable
            android_ripple={{ color: theme.inset, foreground: true }}
            style={({ pressed }) => [
              styles.collapsed,
              cardStyle(theme),
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => toggleWeek(item.week)}>
            <Text style={[styles.collapsedLabel, { color: theme.text }]}>{item.week.label}</Text>
            <View style={styles.collapsedRight}>
              <Text style={[styles.collapsedTotal, { color: theme.muted }]}>{item.week.totalLabel}</Text>
              {item.week.off ? (
                <View style={[styles.statusPill, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.statusText, { color: theme.accent }]}>{t('offWeek')}</Text>
                </View>
              ) : (
                item.week.overTarget && (
                  <View style={[styles.statusPill, { backgroundColor: theme.stopSoft }]}>
                    <Text style={[styles.statusText, { color: theme.stopOnSoft }]}>
                      {t('overLabel')}{item.week.overByLabel ? ` +${item.week.overByLabel}` : ''}
                    </Text>
                  </View>
                )
              )}
              <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
            </View>
          </Pressable>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <View style={[styles.filterRow, { paddingTop: insets.top + 12 }]}>
        <ChipRow
          accessibilityLabel={t('tabLogs')}
          options={[t('all'), ...suggestions]}
          isSelected={(option) => (categoryFilter === null ? option === t('all') : option === categoryFilter)}
          onSelect={(option) => setCategoryFilter(option === t('all') ? null : option)}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🕘</Text>
            <Text style={[styles.empty, { color: theme.muted }]}>{t('emptyLogs')}</Text>
          </View>
        }
      />

      {selected && (
        <SessionDetailSheet
          session={selected}
          suggestions={suggestions}
          onSave={(patch) => saveSession(selected.id, patch)}
          onDelete={removeSession}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

/** The breakdown dot palette — emerald first, then muted zinc steps. */
function dotColor(theme: ReturnType<typeof useTheme>, index: number): string {
  if (index === 0) return theme.accent;
  return index === 1 ? '#71717A' : theme.inset;
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  weekCard: {
    borderRadius: RADIUS.card,
    padding: 24,
    gap: 24,
    marginBottom: 24,
  },
  weekHeader: {
    gap: 4,
  },
  weekTitleBlock: {
    gap: 2,
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
  day: {
    gap: 16,
    marginTop: 8,
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
