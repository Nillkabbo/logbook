import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** One month of the calendar grid — intensity dots + tap-to-filter. */
export function CalendarView({
  year,
  month,
  dayTotals,
  selectedDay,
  onDayPress,
  onMonthChange,
}: {
  year: number;
  month: number;
  /** Day-of-month → completed seconds. */
  dayTotals: Map<number, number>;
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

  const monthName = new Date(year, month, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const weekdayHeader = (index: number) => {
    const d = new Date(2026, 0, 4 + index); // a Sunday
    return d.toLocaleDateString(locale, { weekday: 'narrow' });
  };

  const dayCell = (day: number | null) => {
    if (day === null) return <View key="empty" style={styles.cell} />;
    const seconds = dayTotals.get(day) ?? 0;
    const intensity = busiest === 0 ? 0 : seconds / busiest;
    const isSelected = selectedDay === day;
    const isToday = isCurrentMonth && day === today;

    return (
      <Pressable
        key={day}
        style={[
          styles.cell,
          isSelected && { backgroundColor: theme.accent, borderRadius: 999 },
        ]}
        onPress={() => onDayPress(isSelected ? null : day)}>
        <Text
          style={[
            styles.dayText,
            { color: isSelected ? theme.onAccent : isToday ? theme.accent : theme.text },
            isToday && styles.dayToday,
          ]}>
          {day}
        </Text>
        {seconds > 0 && !isSelected && (
          <View
            style={[
              styles.dayDot,
              {
                backgroundColor: theme.accent,
                opacity: 0.3 + intensity * 0.7,
              },
            ]}
          />
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
        <Text style={[styles.monthName, { color: theme.text }]}>{monthName}</Text>
        <Pressable hitSlop={12} onPress={() => onMonthChange(1)}>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text key={i} style={[styles.weekdayText, { color: theme.muted }]}>
            {weekdayHeader(i)}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day) => dayCell(day))}
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
  monthName: {
    fontSize: 15,
    fontWeight: '600',
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
  cell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 14,
  },
  dayToday: {
    fontWeight: '700',
  },
  dayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 999,
  },
});
