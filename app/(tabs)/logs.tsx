import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  const { t, locale, weekdayShortName } = useI18n();
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
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [query, setQuery] = useState('');
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
      setDateRange('all');
      setQuery('');
      setExpanded({}); // expansion overrides are per-visit too
    }, [refresh]),
  );

  const { weeks, summary } = logsModel(sessions, settings, now, {
    category: categoryFilter ?? undefined,
    dateRange,
    query: query.trim().length > 0 ? query : undefined,
  }, locale);
  const suggestions = categorySuggestions(sessions);
  const rows = buildRows(weeks, isExpanded);
  const hasActiveFilter =
    categoryFilter !== null || dateRange !== 'all' || query.trim().length > 0;

  const renderWeekCard = (week: LogWeek) => (
    <View style={[styles.weekCard, cardStyle(theme)]}>
      <View style={styles.weekHeader}>
        <Pressable
          style={styles.weekTitleBlock}
          accessibilityRole="button"
          accessibilityLabel={week.label}
          onPress={() => toggleWeek(week)}>
          {week.isCurrent && (
            <Text style={[styles.weekEyebrow, { color: theme.muted }]}>{t('currentWeek')}</Text>
          )}
          <Text style={[styles.weekLabel, { color: theme.text }]}>{week.label}</Text>
        </Pressable>
        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={week.off ? t('markOn') : t('markOff')}
          onPress={() => toggleOff(week.key)}>
          <Text style={[styles.offToggle, { color: theme.muted }]}>
            {week.off ? t('markOn') : t('markOff')}
          </Text>
        </Pressable>
      </View>
      <WeekProgress
        totalLabel={week.totalLabel}
        targetLabel={week.targetLabel}
        progress={week.progress}
        overTarget={week.overTarget}
        overByLabel={week.overByLabel}
        off={week.off}
        row
        earningsLabel={week.earningsLabel}
      />
      <View>
        <View style={styles.bars}>
          {week.dayBars.map((bar) => (
            <View key={bar.key} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: 3 + bar.intensity * 28,
                    backgroundColor: bar.isToday ? theme.text : theme.inset,
                  },
                ]}
              />
              <View style={[styles.todayDot, { backgroundColor: bar.isToday ? theme.accent : 'transparent' }]} />
            </View>
          ))}
        </View>
        <View style={styles.barLabels}>
          {week.dayBars.map((bar, i) => (
            <Text key={bar.key} style={styles.barLabel}>
              {Array.from(weekdayShortName((week.range.start.getDay() + i) % 7))[0]}
            </Text>
          ))}
        </View>
      </View>
      {week.categoryBreakdown.length > 0 && (
        <View style={[styles.breakdown, { borderTopColor: theme.canvas }]}>
          {week.categoryBreakdown.map((entry, index) => (
            <View key={entry.label || '__none__'} style={styles.breakdownRow}>
              <View style={[styles.breakdownDot, { backgroundColor: dotColor(index) }]} />
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
            <SessionRow session={item.session} now={now} accentRunning hourlyRate={settings.hourlyRate} />
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
      <View style={[styles.filterArea, { paddingTop: insets.top + 12 }]}>
        <ChipRow
          accessibilityLabel={t('tabLogs')}
          options={[t('all'), ...suggestions]}
          isSelected={(option) => (categoryFilter === null ? option === t('all') : option === categoryFilter)}
          onSelect={(option) => setCategoryFilter(option === t('all') ? null : option)}
          selectedStyle="dark"
        />
        <View style={styles.dateRangeRow}>
          {(['week', 'month', 'all'] as const).map((range) => (
            <Pressable
              key={range}
              accessibilityRole="button"
              accessibilityState={{ selected: dateRange === range }}
              android_ripple={{ color: theme.muted, borderless: false }}
              style={[
                styles.dateRangeChip,
                { backgroundColor: dateRange === range ? theme.text : theme.inset },
              ]}
              onPress={() => setDateRange(range)}>
              <Text
                style={[
                  styles.dateRangeText,
                  { color: dateRange === range ? theme.surface : theme.text },
                ]}>
                {range === 'week' ? t('thisWeek') : range === 'month' ? t('month') : t('all')}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.searchInput, { color: theme.text, backgroundColor: theme.inset }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchHint')}
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {hasActiveFilter && summary && (
          <View style={[styles.summaryStrip, { backgroundColor: theme.inset }]}>
            <Text style={[styles.summaryText, { color: theme.muted }]}>
              {t('nSessions', { n: summary.sessionCount })} · {summary.totalLabel}
              {summary.earningsLabel ? ` · ${summary.earningsLabel}` : ''}
            </Text>
          </View>
        )}
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

/** The breakdown dot palette — neutral zinc steps. Green is reserved for the
 *  working state (progress, earnings, today), never a category. */
function dotColor(index: number): string {
  const steps = ['#52525B', '#71717A', '#A1A1AA'];
  return steps[index % steps.length];
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
  filterArea: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 999,
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  summaryStrip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
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
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 32,
    marginTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  barLabels: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  barLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    opacity: 0.5,
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
