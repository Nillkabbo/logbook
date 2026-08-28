import { StyleSheet, Text, View } from 'react-native';

/** A week's total against its target with a progress bar; over-target weeks render distinctly. */
export function WeekProgress({
  totalLabel,
  targetLabel,
  progress,
  overTarget,
  emphasized = false,
}: {
  totalLabel: string;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
  emphasized?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={[emphasized ? styles.totalLarge : styles.total, overTarget && styles.overTarget]}>
        {totalLabel} / {targetLabel}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            overTarget && styles.fillOver,
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
    gap: 4,
  },
  total: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  totalLarge: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  overTarget: {
    color: '#c0392b',
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: '#0a7ea4',
  },
  fillOver: {
    backgroundColor: '#c0392b',
  },
});
