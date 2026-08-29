import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { categorySuggestions, sumCompletedSessions } from '@/engine/sessions';
import { useI18n } from '@/ui/i18n';
import { formatWeekShareText, logsModel, monthDayTotals, type LogDay, type LogWeek } from '@/engine/logs';
import type { Session } from '@/engine/types';
import { CalendarView } from '@/components/CalendarView';
import { ChipRow } from '@/components/ChipRow';
import { cardStyle, RADIUS, useTheme } from '@/theme';

/** One virtualized row: a month header, week card, day header, session card, or collapsed week. */
type Row =
  | { kind: 'month'; key: string; label: string; totalLabel: string; earningsLabel: string | null; weekCount: number }
  | { kind: 'week'; key: string; week: LogWeek }
  | { kind: 'day'; key: string; day: LogDay }
  | { kind: 'session'; key: string; session: Session }
  | { kind: 'collapsed'; key: string; week: LogWeek };

/** Groups weeks by calendar month and computes month totals. */
interface MonthGroup {
  key: string;
  label: string;
  totalSeconds: number;
  earnings: number;
  weekCount: number;
}

function groupByMonth(weeks: LogWeek[], locale: string, hourlyRate: number): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const week of weeks) {
    const monthStart = new Date(week.range.start.getFullYear(), week.range.start.getMonth(), 1);
    const key = `${monthStart.getFullYear()}-${monthStart.getMonth()}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        label: monthStart.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        totalSeconds: 0,
        earnings: 0,
        weekCount: 0,
      };
      groups.set(key, g);
    }
    // Parse the total back from the label (H:MM format)
    const [h, m] = week.totalLabel.split(':').map(Number);
    g.totalSeconds += (h || 0) * 3600 + (m || 0) * 60;
    g.weekCount++;
    if (week.earningsLabel) {
      g.earnings += parseFloat(week.earningsLabel.replace(/[$,]/g, ''));
    }
  }
  return [...groups.values()];
}

/** Flattens the grouped model newest-first into FlatList rows with month headers. */
function buildRows(
  weeks: LogWeek[],
  isExpanded: (week: LogWeek) => boolean,
  monthGroups: MonthGroup[],
  isMonthExpanded: (key: string) => boolean,
): Row[] {
  const rows: Row[] = [];
  let lastMonthKey = '';
  for (const week of weeks) {
    const monthStart = new Date(week.range.start.getFullYear(), week.range.start.getMonth(), 1);
    const monthKey = `${monthStart.getFullYear()}-${monthStart.getMonth()}`;

    // Insert a month header when the month changes
    if (monthKey !== lastMonthKey) {
      const group = monthGroups.find((g) => g.key === monthKey);
      if (group) {
        const hours = Math.floor(group.totalSeconds / 3600);
        const mins = Math.floor((group.totalSeconds % 3600) / 60);
        rows.push({
          kind: 'month',
          key: `m-${monthKey}`,
          label: group.label,
          totalLabel: `${hours}:${String(mins).padStart(2, '0')}`,
          earningsLabel: group.earnings > 0 ? `$${group.earnings.toFixed(0)}` : null,
          weekCount: group.weekCount,
        });
      }
      lastMonthKey = monthKey;
    }

    // Skip weeks in collapsed months
    if (!isMonthExpanded(monthKey)) continue;

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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  // Per-visit expansion overrides on top of the model's defaults — never persisted.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Months expanded by default; tap a month header to collapse its weeks
  const [monthsExpanded, setMonthsExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (week: LogWeek) => expanded[week.key] ?? week.defaultExpanded;
  // Toggle from the *effective* state, so a default-expanded week collapses on first tap.
  const toggleWeek = (week: LogWeek) =>
    setExpanded((prev) => ({ ...prev, [week.key]: !(prev[week.key] ?? week.defaultExpanded) }));
  const isMonthExpanded = (key: string) => monthsExpanded[key] ?? true;
  const toggleMonth = (key: string) =>
    setMonthsExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));

  useFocusEffect(
    useCallback(() => {
      refresh();
      setCategoryFilter(null); // filters are per-visit, not sticky
      setDateRange('all');
      setQuery('');
      setSelectedDay(null);
      setCalendarOpen(false);
      setExpanded({}); // expansion overrides are per-visit too
      setMonthsExpanded({});
    }, [refresh]),
  );

  // When a calendar day is selected, filter sessions to that day's check-ins.
  const dayFiltered =
    selectedDay !== null ? sessions.filter((s) => {
      const d = s.checkIn;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === selectedDay;
    }) : sessions;

  const { weeks, summary } = logsModel(dayFiltered, settings, now, {
    category: categoryFilter ?? undefined,
    dateRange: selectedDay !== null ? 'all' : dateRange,
    query: query.trim().length > 0 ? query : undefined,
  }, locale);
  const suggestions = categorySuggestions(sessions);
  const monthGroups = groupByMonth(weeks, locale, settings.hourlyRate);
  const rows = buildRows(weeks, isExpanded, monthGroups, isMonthExpanded);
  const hasActiveFilter =
    categoryFilter !== null || dateRange !== 'all' || query.trim().length > 0 || selectedDay !== null;

  // Calendar data
  const dayTotals = monthDayTotals(sessions, calMonth.getFullYear(), calMonth.getMonth());

  // Category distribution (stacked bar)
  const totalFilteredSeconds = sumCompletedSessions(dayFiltered);
  const categoryShares = new Map<string, number>();
  for (const session of dayFiltered) {
    if (session.checkOut === null) continue;
    const cat = session.category || '__none__';
    const dur = (session.checkOut.getTime() - session.checkIn.getTime()) / 1000;
    categoryShares.set(cat, (categoryShares.get(cat) ?? 0) + dur);
  }

  const shareWeekText = (week: LogWeek) =>
    Share.share({ message: formatWeekShareText(week, locale) }).catch(() => {});

  const renderWeekCard = (week: LogWeek) => (
    <View
      style={[
        styles.weekCard,
        cardStyle(theme),
        week.isCurrent && { borderLeftWidth: 4, borderLeftColor: theme.accent },
      ]}>
      <View style={styles.weekHeader}>
        <Pressable
          style={styles.weekTitleBlock}
          accessibilityRole="button"
          accessibilityLabel={week.label}
          onPress={() => toggleWeek(week)}>
          {week.isCurrent && (
            <Text style={[styles.weekEyebrow, { color: theme.accent }]}>{t('currentWeek')}</Text>
          )}
          <Text style={[styles.weekLabel, { color: week.isCurrent ? theme.text : weekEdgeColor(week, theme) }]}>{week.label}</Text>
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
      case 'month':
        return (
          <Pressable
            style={[styles.monthHeader, { backgroundColor: theme.surface }, theme.cardShadow]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => toggleMonth(item.key.replace('m-', ''))}>
            <View style={styles.monthHeaderText}>
              <Text style={[styles.monthLabel, { color: theme.text }]}>{item.label}</Text>
              <Text style={[styles.monthSub, { color: theme.muted }]}>
                {t('weeksInMonth', { n: item.weekCount })} · {item.totalLabel}
                {item.earningsLabel ? ` · ${item.earningsLabel}` : ''}
              </Text>
            </View>
            <Text style={[styles.monthChevron, { color: theme.muted }]}>
              {isMonthExpanded(item.key.replace('m-', '')) ? '⌄' : '›'}
            </Text>
          </Pressable>
        );
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
      <View style={[styles.filterOuter, { paddingTop: insets.top + 12 }]}>
      <View style={[styles.filterArea, cardStyle(theme)]}>
        <View style={styles.toolbarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar')}
            android_ripple={{ color: theme.muted, borderless: true, radius: 18 }}
            hitSlop={8}
            style={[styles.toolbarButton, { backgroundColor: calendarOpen || selectedDay ? theme.accent : theme.inset }]}
            onPress={() => setCalendarOpen((prev) => !prev)}>
            <Text style={{ fontSize: 16 }}>{selectedDay ? '●' : '📅'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('shareWeek')}
            android_ripple={{ color: theme.muted, borderless: true, radius: 18 }}
            hitSlop={8}
            style={[styles.toolbarButton, { backgroundColor: theme.inset }]}
            onPress={() => setSharePickerOpen(true)}>
            <Text style={{ fontSize: 16 }}>↗</Text>
          </Pressable>
        </View>
        <ChipRow
          accessibilityLabel={t('tabLogs')}
          options={[t('all'), ...suggestions]}
          isSelected={(option) => (categoryFilter === null ? option === t('all') : option === categoryFilter)}
          onSelect={(option) => setCategoryFilter(option === t('all') ? null : option)}
          selectedStyle="dark"
        />
        {calendarOpen && (
          <CalendarView
            year={calMonth.getFullYear()}
            month={calMonth.getMonth()}
            dayTotals={dayTotals}
            hourlyRate={settings.hourlyRate}
            selectedDay={
              selectedDay !== null && selectedDay.startsWith(
                `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}`
              )
                ? parseInt(selectedDay.slice(8), 10)
                : null
            }
            onDayPress={(day) => {
              if (day === null) {
                setSelectedDay(null);
              } else {
                const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                setSelectedDay((prev) => (prev === key ? null : key));
              }
            }}
            onMonthChange={(delta) =>
              setCalMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
            }
          />
        )}
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
        {totalFilteredSeconds > 0 && categoryShares.size > 1 && (
          <View style={styles.categoryBar}>
            {[...categoryShares.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, seconds]) => (
                <View
                  key={cat}
                  style={{
                    flex: seconds / totalFilteredSeconds,
                    height: 6,
                    backgroundColor: cat === '__none__' ? theme.inset : theme.accent,
                    opacity: cat === '__none__' ? 0.4 : 0.5 + 0.5 * (seconds / totalFilteredSeconds),
                  }}
                />
              ))}
          </View>
        )}
      </View>
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

      <Modal visible={sharePickerOpen} transparent animationType="fade" onRequestClose={() => setSharePickerOpen(false)}>
        <Pressable style={styles.shareScrim} onPress={() => setSharePickerOpen(false)}>
          <View style={[styles.shareSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.shareGrabberRow}>
              <View style={[styles.shareGrabber, { backgroundColor: theme.inset }]} />
            </View>
            <Text style={[styles.shareTitle, { color: theme.text }]}>{t('shareWeek')}</Text>
            <View style={styles.shareList}>
              {weeks.map((week) => (
                <Pressable
                  key={week.key}
                  android_ripple={{ color: theme.inset }}
                  style={styles.shareRow}
                  onPress={() => {
                    setSharePickerOpen(false);
                    shareWeekText(week);
                  }}>
                  <View style={styles.shareRowText}>
                    <Text style={[styles.shareRowLabel, { color: theme.text }]}>{week.label}</Text>
                    <Text style={[styles.shareRowSub, { color: theme.muted }]}>
                      {week.totalLabel} / {week.targetLabel}
                      {week.earningsLabel ? ` · ${week.earningsLabel}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.shareRowChevron, { color: theme.muted }]}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

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

/** The week-edge palette — each week gets a distinct color so scrolling
 *  history reads as clearly separated blocks. Current week = accent green;
 *  over-target = red; off = muted; others rotate through a calm palette. */
const WEEK_COLORS = ['#0891B2', '#7C3AED', '#D97706', '#DB2777', '#4F46E5'];

function weekEdgeColor(week: LogWeek, theme: ReturnType<typeof useTheme>): string {
  if (week.isCurrent) return theme.accent;
  if (week.off) return theme.inset;
  // Hash the week key to a stable palette index
  const hash = week.key.split('-').reduce((sum, part) => sum + parseInt(part, 10), 0);
  return WEEK_COLORS[hash % WEEK_COLORS.length];
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
  filterOuter: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterArea: {
    padding: 12,
    gap: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBar: {
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
  },
  shareScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  shareSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  shareGrabberRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  shareGrabber: {
    width: 40,
    height: 6,
    borderRadius: 999,
  },
  shareTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: 12,
  },
  shareList: {
    paddingHorizontal: 16,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  shareRowText: {
    flex: 1,
    gap: 2,
  },
  shareRowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  shareRowSub: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  shareRowChevron: {
    fontSize: 20,
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.card,
    padding: 16,
    marginTop: 8,
  },
  monthHeaderText: {
    flex: 1,
    gap: 2,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  monthSub: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  monthChevron: {
    fontSize: 18,
    fontWeight: '600',
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
