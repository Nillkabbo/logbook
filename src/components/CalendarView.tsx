import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/engine/time';
import { formatMoney } from '@/engine/money';
import { useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** One month of the calendar grid — intensity cells, per-day earnings, tap-to-filter. */
export function CalendarView({
  year,
  month,
  dayTotals,
  dayEarnings,
  selectedDay,
  onDayPress,
  onMonthChange,
}: {
  year: number;
  month: number;
  /** Day-of-month → completed seconds. */
  dayTotals: Map<number, number>;
  /** Day-of-month → earnings at each session's own rate; empty hides all money. */
  dayEarnings: Map<number, number>;
  selectedDay: number | null;
  onDayPress: (day: number | null) => void;
  onMonthChange: (delta: number) => void;
}) {
  const theme = useTheme();
  const { locale } = useI18n();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const today = now.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const busiest = Math.max(0, ...dayTotals.values());

  const monthSeconds = [...dayTotals.values()].reduce((sum, s) => sum + s, 0);
  const monthEarned = [...dayEarnings.values()].reduce((sum, e) => sum + e, 0);
  const monthName = new Date(year, month, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const weekdayHeader = (index: number) => {
    const d = new Date(2026, 0, 4 + index); // a Sunday
    return d.toLocaleDateString(locale, { weekday: 'narrow' });
  };

  const dayCell = (day: number | null, index: number) => {
    if (day === null) {
      return <View key={`empty-${index}`} style={styles.emptyCell} />;
    }
    const seconds = dayTotals.get(day) ?? 0;
    const intensity = busiest === 0 ? 0 : seconds / busiest;
    const isSelected = selectedDay === day;
    const isToday = isCurrentMonth && day === today;
    const earned = dayEarnings.get(day) ?? 0;
    const earnings = earned > 0 ? formatMoney(earned) : null;

    const bg = isSelected
      ? theme.accent
      : isToday
        ? theme.accentSoft
        : intensity > 0
          ? theme.inset
          : 'transparent';
    const fg = isSelected
      ? theme.onAccent
      : isToday
        ? theme.accent
        : theme.text;

    return (
      <Pressable
        key={`day-${day}`}
        style={[
          styles.dayCell,
          { backgroundColor: bg },
          intensity > 0 && !isSelected && { opacity: 0.4 + intensity * 0.6 },
        ]}
        onPress={() => onDayPress(isSelected ? null : day)}>
        <Text style={[styles.dayText, { color: fg }, isToday && !isSelected && styles.dayBold]}>
          {day}
        </Text>
        {earnings && (
          <Text style={[styles.dayEarnings, { color: isSelected ? theme.onAccent : theme.accent }]} numberOfLines={1}>
            {earnings}
          </Text>
        )}
      </Pressable>
    );
  };

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => onMonthChange(-1)}>
          <Text style={[styles.chevron, { color: theme.muted }]}>‹</Text>
        </Pressable>
        <View style={styles.monthInfo}>
          <Text style={[styles.monthName, { color: theme.text }]}>{monthName}</Text>
          {monthSeconds > 0 && (
            <Text style={[styles.monthTotal, { color: theme.muted }]}>
              {formatDuration(monthSeconds)}
              {monthEarned > 0 ? ` · ${formatMoney(monthEarned)}` : ''}
            </Text>
          )}
        </View>
        <Pressable hitSlop={12} onPress={() => onMonthChange(1)}>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text key={`wd-${i}`} style={[styles.weekdayText, { color: theme.muted }]}>
            {weekdayHeader(i)}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => dayCell(day, i))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthInfo: {
    alignItems: 'center',
    gap: 2,
  },
  monthName: {
    fontSize: 15,
    fontWeight: '600',
  },
  monthTotal: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 22,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.2857%',
    height: 44,
  },
  dayCell: {
    width: '14.2857%',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  dayBold: {
    fontWeight: '700',
  },
  dayEarnings: {
    fontSize: 8,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
