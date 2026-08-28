import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RADIUS, useTheme } from '@/theme';

/**
 * One row of selectable chips. Empty options renders nothing — call sites never
 * guard. `multi` toggles set-select; the selection shape picks the mode, so a
 * single `selected` accessor keeps the interface small.
 */
export function ChipRow({
  options,
  isSelected,
  onSelect,
  labelOf,
  size = 'md',
  selectedStyle = 'accent',
  accessibilityLabel,
}: {
  options: readonly string[];
  /** Opaque predicate per option — callers own the selection shape. */
  isSelected: (option: string) => boolean;
  /** Toggle semantics belong to the caller; ChipRow just reports the tap. */
  onSelect: (option: string) => void;
  /** Display text per option; defaults to the option itself. */
  labelOf?: (option: string) => string;
  size?: 'md' | 'lg';
  /** dark = text-color fill (reserved for non-category selections like filters). */
  selectedStyle?: 'accent' | 'dark';
  /** Optional row label for screen readers. */
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  if (options.length === 0) return null;
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const active = isSelected(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            android_ripple={{ color: theme.muted, borderless: false }}
            style={[
              styles.chip,
              size === 'lg' && styles.chipLg,
              {
                backgroundColor: active
                  ? selectedStyle === 'dark'
                    ? theme.text
                    : theme.accent
                  : theme.inset,
              },
            ]}
            onPress={() => onSelect(option)}>
            <Text style={[styles.text, size === 'lg' && styles.textLg, { color: active ? (selectedStyle === 'dark' ? theme.surface : theme.onAccent) : theme.text }]}>
              {labelOf ? labelOf(option) : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
  },
  chipLg: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 14,
  },
});
