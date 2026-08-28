import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WEEKDAY_NAMES, type Weekday } from '@/engine/types';
import { parseHoursInput } from '@/engine/validation';
import { RADIUS, useTheme } from '@/theme';

type HoursValidator = (hours: number) => string | null;

/**
 * The weekday pill row. Single-select for the week-start day, set-select for
 * Work-block days — the value shape picks the mode; styling has one home.
 */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: Weekday | Weekday[];
  onChange: (day: Weekday | Weekday[]) => void;
}) {
  const theme = useTheme();
  const isActive = (index: number) =>
    Array.isArray(value) ? value.includes(index as Weekday) : value === index;
  const press = (index: number) => {
    const day = index as Weekday;
    if (Array.isArray(value)) {
      onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
    } else {
      onChange(day);
    }
  };
  return (
    <View style={styles.pillRow}>
      {WEEKDAY_NAMES.map((name, index) => {
        const active = isActive(index);
        return (
          <Pressable
            key={name}
            style={[
              styles.pill,
              { borderColor: active ? theme.accent : theme.border },
              active && { backgroundColor: theme.accent },
            ]}
            onPress={() => press(index)}>
            <Text
              style={[
                styles.pillText,
                { color: active ? theme.onAccent : theme.text },
                active && styles.pillTextActive,
              ]}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The parse→validate→error→commit flow for an hours input, shared by
 * first-launch setup and Settings. With `onCommit`, commits on blur;
 * `commitNow` validates and commits on demand (setup's Start button),
 * returning the hours or null when invalid.
 */
export function useValidatedHours(
  initial: string,
  validate: HoursValidator,
  onCommit?: (hours: number) => void,
  /** Value an empty input commits as (e.g. 0 = unset for the hourly rate). */
  emptyValue?: number,
) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback((next: string) => {
    setValue(next);
    setError(null);
  }, []);

  const onChangeText = useCallback((text: string) => {
    setValue(text);
    setError(null);
  }, []);

  const commitNow = useCallback((): number | null => {
    const hours = value.trim() === '' ? (emptyValue ?? Number.NaN) : parseHoursInput(value);
    const validationError = validate(hours);
    setError(validationError);
    if (validationError) return null;
    onCommit?.(hours);
    return hours;
  }, [value, validate, onCommit, emptyValue]);

  const onBlur = useCallback(() => {
    if (onCommit) commitNow();
  }, [onCommit, commitNow]);

  return { value, error, reset, onChangeText, onBlur, commitNow };
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    fontSize: 14,
  },
  pillTextActive: {
    fontWeight: '600',
  },
});
