import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatTimeOfDay } from '@/engine/time';
import { validateBlockTimes, type WorkBlock } from '@/engine/schedule';
import { WEEKDAY_NAMES, type Weekday } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';

const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();
const atMinutes = (minutes: number) =>
  new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);

/** Settings' Schedule section: the Work-block list plus the add form. */
export function ScheduleEditor({
  blocks,
  onAdd,
  onRemove,
}: {
  blocks: WorkBlock[];
  onAdd: (weekdays: Weekday[], startMinute: number, endMinute: number) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const theme = useTheme();
  const [days, setDays] = useState<Weekday[]>([]);
  const [start, setStart] = useState(() => atMinutes(9 * 60));
  const [end, setEnd] = useState(() => atMinutes(17 * 60));
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleDay = (day: Weekday) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const onPick =
    (field: 'start' | 'end') =>
    (_event: DateTimePickerEvent, selected?: Date): void => {
      if (selected) {
        if (field === 'start') setStart(selected);
        else setEnd(selected);
      }
      setPicker(null);
    };

  const add = async () => {
    if (days.length === 0) {
      Alert.alert('Pick days', 'Choose at least one weekday for the block.');
      return;
    }
    const error = validateBlockTimes(minutesOfDay(start), minutesOfDay(end));
    if (error) {
      Alert.alert('Check the times', error);
      return;
    }
    setBusy(true);
    try {
      await onAdd([...days].sort((a, b) => a - b), minutesOfDay(start), minutesOfDay(end));
      setDays([]);
    } finally {
      setBusy(false);
    }
  };

  const timeField = (field: 'start' | 'end', label: string, value: Date) => (
    <Pressable
      style={[styles.timeField, { borderColor: theme.border, backgroundColor: theme.surface }]}
      onPress={() => setPicker(field)}>
      <Text style={[styles.timeLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.timeValue, { color: theme.text }]}>{formatTimeOfDay(value)}</Text>
      {picker === field && <DateTimePicker value={value} mode="time" onChange={onPick(field)} />}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {blocks.map((block) => (
        <View
          key={block.id}
          style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.rowText, { color: theme.text }]}>
            {block.weekdays.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(', ')} ·{' '}
            {formatTimeOfDay(atMinutes(block.startMinute))}–
            {formatTimeOfDay(atMinutes(block.endMinute))}
          </Text>
          <Pressable onPress={() => onRemove(block.id)}>
            <Text style={[styles.remove, { color: theme.stop }]}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.pillRow}>
        {WEEKDAY_NAMES.map((name, index) => {
          const day = index as Weekday;
          const active = days.includes(day);
          return (
            <Pressable
              key={name}
              style={[
                styles.pill,
                { borderColor: active ? theme.accent : theme.border },
                active && { backgroundColor: theme.accent },
              ]}
              onPress={() => toggleDay(day)}>
              <Text
                style={[
                  styles.pillText,
                  { color: active ? '#ffffff' : theme.text },
                  active && styles.pillTextActive,
                ]}>
                {name.slice(0, 3)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.timeRow}>
        {timeField('start', 'From', start)}
        {timeField('end', 'To', end)}
      </View>
      <Pressable
        style={[styles.addButton, { backgroundColor: theme.accent }, busy && styles.disabled]}
        disabled={busy}
        onPress={add}>
        <Text style={styles.addText}>Add block</Text>
      </Pressable>
      <Text style={[styles.hint, { color: theme.muted }]}>
        Blocks nudge you to check in — they never clock you in automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  rowText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  remove: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    fontSize: 13,
  },
  pillTextActive: {
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: {
    flex: 1,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 2,
  },
  timeLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  addButton: {
    borderRadius: RADIUS.card,
    padding: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
  },
});
