import { StyleSheet, Text, View } from 'react-native';

import { RADIUS, TYPE, useTheme } from '@/theme';

/** A week's total against its target with a progress bar; over-target shows an OVER chip. */
export function WeekProgress({
  totalLabel,
  targetLabel,
  progress,
  overTarget,
  overByLabel = null,
  emphasized = false,
}: {
  totalLabel: string;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
  overByLabel?: string | null;
  emphasized?: boolean;
}) {
  const theme = useTheme();
  const valueColor = overTarget ? theme.stop : theme.text;
  return (
    <View style={styles.container}>
      <View style={[styles.valueRow, emphasized && styles.valueRowCentered]}>
        <Text style={[emphasized ? styles.valueLarge : styles.value, { color: valueColor }]}>
          {totalLabel} / {targetLabel}
        </Text>
        {overTarget && (
          <View style={[styles.chip, { borderColor: theme.stop }]}>
            <Text style={[styles.chipText, { color: theme.stop }]}>
              OVER{overByLabel ? ` +${overByLabel}` : ''}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: theme.track }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: overTarget ? theme.stop : theme.accent },
            { width: `${Math.min(1, progress) * 100}%` },
          ]}
        />
      </View>
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
    alignItems: 'center',
    gap: 8,
  },
  valueRowCentered: {
    justifyContent: 'center',
  },
  value: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  valueLarge: {
    ...TYPE.display,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  chip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
});
