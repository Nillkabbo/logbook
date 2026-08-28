import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateTime, formatTimeOfDay } from '@/engine/time';
import { RADIUS, useTheme } from '@/theme';
import { useHour12 } from '@/ui/clock';
import { useI18n } from '@/ui/i18n';

/**
 * A labelled date-time field with the platform branch owned once: iOS renders
 * the compact inline picker; Android opens a dialog from a tappable card.
 * `variant` picks the card treatment — surface (sheet) or inset (Schedule).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  disabled = false,
  mode = 'datetime',
  variant = 'card',
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  disabled?: boolean;
  mode?: 'datetime' | 'time';
  variant?: 'card' | 'inset';
}) {
  const theme = useTheme();
  const hour12 = useHour12();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);

  const display =
    mode === 'time'
      ? formatTimeOfDay(value ?? new Date(), hour12)
      : formatDateTime(value ?? new Date(), locale, hour12);

  const onPick = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) onChange(selected);
    if (Platform.OS === 'android') setOpen(false);
  };

  const labelRow = (
    <Text style={[styles.label, { color: theme.muted }, disabled && styles.disabled]}>
      {label}
    </Text>
  );

  if (Platform.OS === 'ios') {
    // iOS: the compact picker is the control itself; a running session has no checkout to edit.
    return (
      <View style={styles.group}>
        {labelRow}
        {disabled ? (
          <Text style={[styles.value, { color: theme.text }]}>—</Text>
        ) : (
          <DateTimePicker value={value ?? new Date()} mode={mode} onChange={onPick} />
        )}
      </View>
    );
  }

  // Android: the picker is a dialog opened from a tappable field.
  return (
    <View style={[styles.group, variant === 'inset' && styles.groupInset]}>
      {variant === 'inset' && labelRow}
      <Pressable
        style={[
          styles.field,
          variant === 'inset' && styles.fieldInset,
          { backgroundColor: variant === 'inset' ? theme.inset : theme.surface },
          variant === 'card' && theme.cardShadow,
          disabled && styles.disabled,
        ]}
        disabled={disabled}
        onPress={() => setOpen((prev) => !prev)}>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: theme.text }]}>{disabled ? '—' : display}</Text>
          <Text style={[styles.pickerCue, { color: theme.muted }]}>›</Text>
        </View>
      </Pressable>
      {open && value && <DateTimePicker value={value} mode={mode} onChange={onPick} />}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  groupInset: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  field: {
    padding: 16,
    borderRadius: RADIUS.card,
  },
  fieldInset: {
    borderRadius: RADIUS.control,
    padding: 12,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  pickerCue: {
    fontSize: 18,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
