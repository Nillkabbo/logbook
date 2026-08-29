import { StyleSheet, Text, View } from 'react-native';

import type { HeatmapDay } from '@/engine/insights';
import { useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/**
 * A compact yearly heatmap: 12 mini-months in a 3×4 grid, each showing
 * day-level intensity squares. GitHub-contribution-graph style.
 */
export function YearHeatmap({ days, year }: { days: HeatmapDay[]; year: number }) {
  const theme = useTheme();
  const { locale, t } = useI18n();

  // Build a lookup: key → hours
  const hoursByKey = new Map(days.map((d) => [d.key, d.hours]));
  const maxHours = Math.max(...days.map((d) => d.hours), 1);
  const now = new Date();

  const monthGrid = (month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, { month: 'short' });
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    const cells: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, key });
    }

    return (
      <View key={month} style={styles.monthBlock}>
        <Text style={[styles.monthLabel, { color: isCurrentMonth ? theme.accent : theme.muted }]}>
          {monthLabel}
        </Text>
        <View style={styles.dayGrid}>
          {cells.map((cell, i) => {
            if (cell.day === null) return <View key={`e-${i}`} style={styles.dayCell} />;
            const hours = hoursByKey.get(cell.key!) ?? 0;
            const intensity = hours / maxHours;
            const isFuture = year > now.getFullYear() ||
              (year === now.getFullYear() && month > now.getMonth()) ||
              (year === now.getFullYear() && month === now.getMonth() && cell.day > now.getDate());

            return (
              <View
                key={cell.key}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: isFuture
                      ? 'transparent'
                      : hours > 0
                        ? theme.accent
                        : theme.inset,
                    opacity: isFuture ? 0.3 : hours > 0 ? 0.25 + intensity * 0.75 : 0.4,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('yearOverview')}</Text>
        <Text style={[styles.total, { color: theme.accent }]}>
          {Math.round(totalHours)}h
        </Text>
      </View>
      <View style={styles.yearGrid}>
        {Array.from({ length: 12 }, (_, m) => monthGrid(m))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  total: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthBlock: {
    width: '23.5%',
    gap: 2,
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  dayCell: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
  },
});
