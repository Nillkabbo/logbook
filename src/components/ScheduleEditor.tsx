import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { WeekdayPicker } from '@/components/settings-entry';
import { formatTimeOfDay } from '@/engine/time';
import { blockRangeLabel, validateBlockTimes, type WorkBlock } from '@/engine/schedule';
import type { Weekday } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';
import { useI18n, type StringKey } from '@/ui/i18n';
import { useHour12 } from '@/ui/clock';

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
  const { t, weekdayShortName } = useI18n();
  const hour12 = useHour12();
  const [days, setDays] = useState<Weekday[]>([]);
  const [start, setStart] = useState(() => atMinutes(9 * 60));
  const [end, setEnd] = useState(() => atMinutes(17 * 60));
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);

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
      Alert.alert(t('pickDays'), t('pickDaysBody'));
      return;
    }
    const error = validateBlockTimes(minutesOfDay(start), minutesOfDay(end));
    if (error) {
      Alert.alert(t('checkTimes'), t(error as StringKey));
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
      style={[styles.timeField, { backgroundColor: theme.inset }]}
      onPress={() => setPicker(field)}>
      <Text style={[styles.timeLabel, { color: theme.muted }]}>{field === 'start' ? t('from') : t('to')}</Text>
      <Text style={[styles.timeValue, { color: theme.text }]}>{formatTimeOfDay(value, hour12)}</Text>
      {picker === field && <DateTimePicker value={value} mode="time" onChange={onPick(field)} />}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {blocks.map((block) => (
        <View
          key={block.id}
          style={[styles.row, { backgroundColor: theme.surface }, theme.cardShadow]}>
          <Text style={[styles.rowText, { color: theme.text }]}>
            {blockRangeLabel(block, weekdayShortName, hour12)}
          </Text>
          <Pressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" onPress={() => onRemove(block.id)}>
            <Text style={[styles.remove, { color: theme.stop }]}>{t('remove')}</Text>
          </Pressable>
        </View>
      ))}

      <View style={[styles.formCard, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <WeekdayPicker variant="segmented" value={days} onChange={(next) => setDays(next as Weekday[])} />
        <View style={styles.timeRow}>
          {timeField('start', 'From', start)}
          {timeField('end', 'To', end)}
        </View>
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.accent }, busy && styles.disabled]}
          disabled={busy}
          onPress={add}>
          <Text style={[styles.addText, { color: theme.onAccent }]}>{t('addBlock')}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.muted }]}>
          {t('blockHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  formCard: {
    borderRadius: 16,
    padding: 24,
    gap: 24,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  },
  rowText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  remove: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeField: {
    flex: 1,
    borderRadius: RADIUS.control,
    padding: 12,
    gap: 4,
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
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
