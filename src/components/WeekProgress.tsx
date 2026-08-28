import { StyleSheet, Text, View } from 'react-native';

import { RADIUS, TYPE, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** A week's total against its target with a progress bar; over-target shows an OVER chip. */
export function WeekProgress({
  totalLabel,
  targetLabel,
  progress,
  overTarget,
  overByLabel = null,
  off = false,
  emphasized = false,
  row = false,
  earningsLabel = null,
}: {
  totalLabel: string;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
  overByLabel?: string | null;
  /** Off weeks show the total with an Off week pill instead of the target bar. */
  off?: boolean;
  emphasized?: boolean;
  /** Row mode (Logs): 24px value, inline earnings, full-width bar. */
  row?: boolean;
  /** Optional earnings line, centered under the bar. */
  earningsLabel?: string | null;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const valueColor = overTarget && !off ? theme.stop : theme.text;
  if (off) {
    return (
      <View style={[styles.offRow, emphasized && styles.offRowCentered]}>
        <Text style={[styles.offTotal, { color: theme.text }]}>{totalLabel}</Text>
        <View style={[styles.offPill, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.offPillText, { color: theme.accent }]}>{t('offWeek')}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={[styles.valueRow, emphasized && styles.valueRowCentered]}>
        <Text style={[emphasized ? styles.valueLarge : row ? styles.valueRow24 : styles.value, { color: valueColor }]}>
          {totalLabel}
        </Text>
        <Text style={[emphasized ? styles.targetLarge : row ? styles.targetRow : styles.target, { color: theme.muted }]}>
          {' / '}
          {targetLabel}
        </Text>
        {row && earningsLabel && (
          <Text style={[styles.earningsInline, { color: theme.accent }]}>{earningsLabel}</Text>
        )}
        {overTarget && (
          <View style={[styles.chip, { backgroundColor: theme.stopSoft }]}>
            <Text style={[styles.chipText, { color: theme.stopOnSoft }]}>
              {t('overLabel')}{overByLabel ? ` +${overByLabel}` : ''}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.track, emphasized && styles.trackWide, { backgroundColor: theme.inset }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: overTarget ? theme.stop : theme.accent },
            { width: `${Math.min(1, progress) * 100}%` },
          ]}
        />
      </View>
      {earningsLabel && emphasized && (
        <Text style={[styles.earnings, { color: theme.accent }]}>
          {t('earnedLabel')} · {earningsLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  valueRowCentered: {
    justifyContent: 'center',
  },
  value: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  valueRow24: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  targetRow: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  earningsInline: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
  valueLarge: {
    ...TYPE.stat,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
  },
  targetLarge: {
    fontSize: 20,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  target: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  chip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginLeft: 6,
    alignSelf: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: RADIUS.bar,
    borderRadius: RADIUS.bar / 2,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  trackWide: {
    width: 128,
    alignSelf: 'center',
  },
  fill: {
    height: RADIUS.bar,
    borderRadius: RADIUS.bar / 2,
  },
  earnings: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  offRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offRowCentered: {
    justifyContent: 'center',
  },
  offTotal: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  offPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  offPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
