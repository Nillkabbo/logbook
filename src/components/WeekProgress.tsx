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
  emphasized = false,
  fitContent = false,
  earningsLabel = null,
}: {
  totalLabel: string;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
  overByLabel?: string | null;
  emphasized?: boolean;
  /** Hug the fraction's width (Home) instead of stretching to the column (Logs). */
  fitContent?: boolean;
  /** Optional earnings line, centered under the bar. */
  earningsLabel?: string | null;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const valueColor = overTarget ? theme.stop : theme.text;
  return (
    <View style={[styles.container, fitContent && styles.containerFit]}>
      <View style={styles.valueRow}>
        <Text style={[emphasized ? styles.valueLarge : styles.value, { color: valueColor }]}>
          {totalLabel}
        </Text>
        <Text style={[emphasized ? styles.targetLarge : styles.target, { color: theme.muted }]}>
          {' / '}
          {targetLabel}
        </Text>
        {overTarget && (
          <View style={[styles.chip, { backgroundColor: theme.stopSoft }]}>
            <Text style={[styles.chipText, { color: theme.stop }]}>
              {t('overLabel')}{overByLabel ? ` +${overByLabel}` : ''}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: theme.inset }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: overTarget ? theme.stop : theme.accent },
            { width: `${Math.min(1, progress) * 100}%` },
          ]}
        />
      </View>
      {earningsLabel && (
        <Text style={[styles.earnings, { color: theme.accent }]}>{earningsLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: 6,
  },
  containerFit: {
    alignSelf: 'flex-start',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  value: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  valueLarge: {
    ...TYPE.stat,
    fontVariant: ['tabular-nums'],
  },
  targetLarge: {
    fontSize: 20,
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
});
