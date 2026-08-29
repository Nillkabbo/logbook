import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLogbook } from '@/hooks/useLogbook';
import { formatMoney } from '@/engine/money';
import { categoryTrends, insightsModel, yearlyHeatmap } from '@/engine/insights';
import { YearHeatmap } from '@/components/YearHeatmap';
import { cardStyle, RADIUS, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** The Insights sub-screen: averages, best day, category shares, streaks, comparisons. */
export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, locale } = useI18n();
  const { refresh, sessions, settings, now, rateHistory } = useLogbook();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const m = insightsModel(sessions, settings, now, locale, rateHistory);
  const heatmapDays = yearlyHeatmap(sessions, now);
  const catTrends = categoryTrends(sessions, now, locale);
  const weekdayName = (day: number) =>
    new Date(2026, 0, 4 + day).toLocaleDateString(locale, { weekday: 'short' });
  const maxWeekdayHours = Math.max(...m.weekdayHours.map((w) => w.hours), 0.1);
  const fmtHours = (h: number) => (h >= 10 ? h.toFixed(0) : h.toFixed(1));
  const fmtDelta = (d: number) => (d >= 0 ? `+${fmtHours(d)}` : fmtHours(d));
  const fmtPct = (p: number) => `${p.toFixed(0)}%`;

  const statCard = (label: string, value: string, sub?: string) => (
    <View style={[styles.statCard, cardStyle(theme)]}>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      {sub && <Text style={[styles.statSub, { color: theme.accent }]}>{sub}</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas, paddingTop: insets.top + 8 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}>

        {/* Period summary strip */}
        <View style={[styles.periodStrip, { backgroundColor: theme.inset }]}>
          <Text style={[styles.periodText, { color: theme.muted }]}>
            {m.totalSessions} {t('sessions')} · {m.totalHoursLabel}
            {m.totalEarnings !== null ? ` · ${formatMoney(m.totalEarnings)}` : ''}
          </Text>
        </View>

        {/* Hero: average week + delta */}
        <View style={[styles.heroCard, cardStyle(theme)]}>
          <Text style={[styles.heroLabel, { color: theme.muted }]}>{t('avgWeek')}</Text>
          <Text style={[styles.heroValue, { color: theme.text }]}>{m.averageWeekLabel}</Text>
          <Text style={[styles.heroDelta, { color: m.weekDeltaHours >= 0 ? theme.accent : theme.stop }]}>
            {fmtDelta(m.weekDeltaHours)} {t('hours')} · {t('thisVsLastWeek').toLowerCase()}
          </Text>
        </View>

        {/* Week vs last week */}
        <View style={styles.compareRow}>
          <View style={[styles.compareCard, cardStyle(theme)]}>
            <Text style={[styles.statLabel, { color: theme.muted }]}>{t('thisVsLastWeek')}</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{fmtHours(m.thisWeekHours)}</Text>
            <Text style={[styles.statSub, { color: theme.muted }]}>
              {t('vs')} {fmtHours(m.lastWeekHours)}
            </Text>
          </View>
          <View style={[styles.compareCard, cardStyle(theme)]}>
            <Text style={[styles.statLabel, { color: theme.muted }]}>{t('thisVsLastMonth')}</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{fmtHours(m.thisMonthHours)}</Text>
            <Text style={[styles.statSub, { color: theme.muted }]}>
              {t('vs')} {fmtHours(m.lastMonthHours)}
            </Text>
          </View>
        </View>

        {/* Weekday distribution */}
        <View style={[styles.card, cardStyle(theme)]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('bestDay')}</Text>
          <Text style={[styles.bestDay, { color: theme.accent }]}>
            {weekdayName(m.bestWeekday.day)} · {fmtHours(m.bestWeekday.hours)}h
          </Text>
          <View style={styles.weekdayBars}>
            {m.weekdayHours.map((w) => (
              <View key={w.day} style={styles.weekdayCol}>
                <View
                  style={[
                    styles.weekdayBar,
                    {
                      height: Math.max(4, (w.hours / maxWeekdayHours) * 48),
                      backgroundColor: w.day === m.bestWeekday.day ? theme.accent : theme.inset,
                    },
                  ]}
                />
                <Text style={[styles.weekdayLabel, { color: theme.muted }]}>
                  {weekdayName(w.day).slice(0, 2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category shares */}
        {m.categoryShares.length > 0 && (
          <View style={[styles.card, cardStyle(theme)]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('category')} · {t('allTime')}
            </Text>
            <View style={styles.shareBar}>
              {m.categoryShares.map((c, i) => (
                <View
                  key={c.label || '__none__'}
                  style={{
                    flex: c.percentage / 100,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.label === '' ? theme.inset : WEEK_COLORS[i % WEEK_COLORS.length],
                  }}
                />
              ))}
            </View>
            {m.categoryShares.slice(0, 5).map((c, i) => (
              <View key={c.label || '__none__'} style={styles.shareRow}>
                <View
                  style={[
                    styles.shareDot,
                    { backgroundColor: c.label === '' ? theme.inset : WEEK_COLORS[i % WEEK_COLORS.length] },
                  ]}
                />
                <Text style={[styles.shareLabel, { color: theme.text }]} numberOfLines={1}>
                  {c.label || t('uncategorised')}
                </Text>
                <Text style={[styles.shareValue, { color: theme.muted }]}>
                  {fmtPct(c.percentage)} · {fmtHours(c.hours)}h
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Earnings by category — the money view of the slice above */}
        {m.categoryEarnings.length > 0 && (
          <View style={[styles.card, cardStyle(theme)]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('earningsByCategory')} · {t('allTime')}
            </Text>
            <View style={styles.shareBar}>
              {m.categoryEarnings.map((c, i) => (
                <View
                  key={c.label || '__none__'}
                  style={{
                    flex: c.percentage / 100,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.label === '' ? theme.inset : WEEK_COLORS[i % WEEK_COLORS.length],
                  }}
                />
              ))}
            </View>
            {m.categoryEarnings.slice(0, 5).map((c, i) => (
              <View key={c.label || '__none__'} style={styles.shareRow}>
                <View
                  style={[
                    styles.shareDot,
                    { backgroundColor: c.label === '' ? theme.inset : WEEK_COLORS[i % WEEK_COLORS.length] },
                  ]}
                />
                <Text style={[styles.shareLabel, { color: theme.text }]} numberOfLines={1}>
                  {c.label || t('uncategorised')}
                </Text>
                <Text style={[styles.shareValue, { color: theme.muted }]}>
                  {fmtPct(c.percentage)} · {formatMoney(c.earnings)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Earnings by pay period — the paycheck view */}
        {m.payPeriods && m.payPeriods.some((p) => p.earnings > 0 || p.totalSeconds > 0) && (
          <View style={[styles.card, cardStyle(theme)]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('earningsByPeriod')}</Text>
            {m.payPeriods.map((p) => (
              <View key={p.key} style={styles.shareRow}>
                <View
                  style={[styles.shareDot, { backgroundColor: p.isCurrent ? theme.accent : theme.inset }]}
                />
                <Text
                  style={[styles.shareLabel, { color: p.isCurrent ? theme.text : theme.muted }]}
                  numberOfLines={1}>
                  {p.label}
                </Text>
                <Text style={[styles.shareValue, { color: theme.text }]}>
                  {p.earningsLabel ?? '—'} · {fmtHours(p.totalSeconds / 3600)}h
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Monthly trends */}
        <View style={[styles.card, cardStyle(theme)]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('monthlyTrends')}</Text>
          <View style={styles.trendChart}>
            {m.monthlyTrends.map((mo) => {
              const maxHours = Math.max(...m.monthlyTrends.map((x) => x.hours), 1);
              const h = Math.max(4, (mo.hours / maxHours) * 64);
              const isCurrent = mo.key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              return (
                <View key={mo.key} style={styles.trendCol}>
                  <Text style={[styles.trendValue, { color: theme.muted }]}>
                    {mo.hours > 0 ? Math.round(mo.hours) : ''}
                  </Text>
                  <View
                    style={[
                      styles.trendBar,
                      {
                        height: h,
                        backgroundColor: isCurrent ? theme.accent : mo.hours > 0 ? theme.inset : 'transparent',
                        borderWidth: mo.hours === 0 ? StyleSheet.hairlineWidth : 0,
                        borderColor: theme.inset,
                        opacity: mo.hours > 0 && !isCurrent ? 0.6 : 1,
                      },
                    ]}
                  />
                  <Text style={[styles.trendLabel, { color: isCurrent ? theme.accent : theme.muted }]}>
                    {mo.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Yearly heatmap */}
        <View style={[styles.card, cardStyle(theme)]}>
          <YearHeatmap days={heatmapDays} year={now.getFullYear()} />
        </View>

        {/* Category trends */}
        {catTrends.some((ct) => ct.totalHours > 0) && (
          <View style={[styles.card, cardStyle(theme)]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('categoryTrends')}</Text>
            <View style={styles.catTrendChart}>
              {catTrends.map((ct) => {
                const maxTotal = Math.max(...catTrends.map((x) => x.totalHours), 1);
                const barHeight = Math.max(4, (ct.totalHours / maxTotal) * 56);
                const isCurrent = ct.key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                return (
                  <View key={ct.key} style={styles.trendCol}>
                    <View style={[styles.catTrendBar, { height: barHeight }]}>
                      {ct.categories.map((c, ci) => {
                        const segHeight = ct.totalHours > 0
                          ? (c.hours / ct.totalHours) * barHeight
                          : 0;
                        return (
                          <View
                            key={c.label || '__none__'}
                            style={{
                              height: Math.max(segHeight, c.hours > 0 ? 2 : 0),
                              backgroundColor: c.label === ''
                                ? theme.inset
                                : WEEK_COLORS[ci % WEEK_COLORS.length],
                            }}
                          />
                        );
                      })}
                    </View>
                    <Text style={[styles.trendLabel, { color: isCurrent ? theme.accent : theme.muted }]}>
                      {ct.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Streaks */}
        <View style={styles.compareRow}>
          {statCard(t('streak'), `${m.currentStreak}`, `${m.currentStreak === 1 ? '1 day' : `${m.currentStreak} ${t('days')}`}`)}
          {statCard(t('longestStreak'), `${m.longestStreak}`, `${m.longestStreak === 1 ? '1 day' : `${m.longestStreak} ${t('days')}`}`)}
        </View>

        {/* Averages */}
        <View style={styles.compareRow}>
          {statCard(t('avgSession'), m.averageSessionLabel)}
          {statCard(t('allTime'), m.totalHoursLabel, `${m.totalSessions} ${t('sessions')}`)}
        </View>
      </ScrollView>
    </View>
  );
}

const WEEK_COLORS = ['#0891B2', '#7C3AED', '#D97706', '#DB2777', '#4F46E5'];

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  periodStrip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  heroCard: {
    borderRadius: RADIUS.card,
    padding: 24,
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroDelta: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  compareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compareCard: {
    flex: 1,
    borderRadius: RADIUS.card,
    padding: 16,
    gap: 4,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.card,
    padding: 16,
    gap: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statSub: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  card: {
    borderRadius: RADIUS.card,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  bestDay: {
    fontSize: 20,
    fontWeight: '700',
  },
  weekdayBars: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    height: 72,
    marginTop: 4,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekdayBar: {
    width: '100%',
    borderRadius: 4,
  },
  weekdayLabel: {
    fontSize: 11,
  },
  shareBar: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  shareLabel: {
    fontSize: 14,
    flex: 1,
  },
  shareValue: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  trendChart: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    height: 100,
    marginTop: 8,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  trendValue: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  trendBar: {
    width: '100%',
    borderRadius: 3,
  },
  trendLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  catTrendChart: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    height: 80,
    marginTop: 8,
  },
  catTrendBar: {
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'column-reverse',
  },
});
