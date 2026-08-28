import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatDayLabel } from '@/engine/weeks';
import { formatTimeOfDay } from '@/engine/time';
import type { Session, SessionPatch } from '@/engine/types';
import { validateSessionTimes } from '@/engine/validation';
import { RADIUS, useTheme } from '@/theme';

interface Props {
  session: Session;
  /** Distinct categories already used, for suggestions. */
  suggestions: string[];
  onSave: (patch: SessionPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

const formatDateTime = (date: Date) => `${formatDayLabel(date)}, ${formatTimeOfDay(date)}`;

export function SessionDetailSheet({ session, suggestions, onSave, onDelete, onClose }: Props) {
  const theme = useTheme();
  const [checkIn, setCheckIn] = useState(session.checkIn);
  const [checkOut, setCheckOut] = useState(session.checkOut);
  const [note, setNote] = useState(session.note);
  const [category, setCategory] = useState(session.category);
  const [picker, setPicker] = useState<'in' | 'out' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCheckIn(session.checkIn);
    setCheckOut(session.checkOut);
    setNote(session.note);
    setCategory(session.category);
    setError(null);
    setPicker(null);
  }, [session]);

  const running = checkOut === null;

  const applyPicker = (field: 'in' | 'out', selected?: Date) => {
    if (selected) {
      if (field === 'in') setCheckIn(selected);
      else setCheckOut(selected);
    }
    if (Platform.OS === 'android') setPicker(null);
  };

  const save = async () => {
    const validationError = validateSessionTimes(checkIn, checkOut, new Date());
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      await onSave({ checkIn, checkOut, note: note.trim(), category: category.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete session?', 'This session will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await onDelete(session.id);
          onClose();
        },
      },
    ]);
  };

  const renderField = (field: 'in' | 'out') => {
    const value = field === 'in' ? checkIn : checkOut;
    const disabled = field === 'out' && running;
    const label = field === 'in' ? 'Check-in' : 'Check-out';

    const labelRow = (
      <Text style={[styles.fieldLabel, { color: theme.muted }, disabled && styles.fieldDisabled]}>
        {label}
      </Text>
    );
    const onPick =
      (_event: DateTimePickerEvent, selected?: Date): void => applyPicker(field, selected);

    if (Platform.OS === 'ios') {
      // iOS: the compact picker is the control itself; a running session has no checkout to edit.
      return disabled ? (
        <View style={styles.fieldGroup}>
          {labelRow}
          <Text style={[styles.fieldValue, { color: theme.text }]}>—</Text>
        </View>
      ) : (
        <View style={styles.fieldGroup}>
          {labelRow}
          <DateTimePicker value={value ?? checkIn} mode="datetime" onChange={onPick} />
        </View>
      );
    }

    // Android: the picker is a dialog opened from a tappable field.
    return (
      <View style={styles.fieldGroup}>
        {labelRow}
        <Pressable
          style={[
            styles.field,
            { backgroundColor: theme.surface, borderColor: theme.border },
            disabled && styles.fieldDisabled,
          ]}
          disabled={disabled}
          onPress={() => setPicker(picker === field ? null : field)}>
          <Text style={[styles.fieldValue, { color: theme.text }]}>
            {value ? formatDateTime(value) : '—'}
          </Text>
        </Pressable>
        {picker === field && value && (
          <DateTimePicker value={value} mode="datetime" onChange={onPick} />
        )}
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView
        style={{ backgroundColor: theme.subtle }}
        contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Session</Text>

        {renderField('in')}
        <View style={styles.runningRow}>
          <Text style={[styles.runningLabel, { color: theme.text }]}>Still running</Text>
          {/* Turning it off anchors the checkout at the check-in: the user must
              pick an explicit time before Save passes validation. */}
          <Switch value={running} onValueChange={(on) => setCheckOut(on ? null : checkIn)} />
        </View>
        {renderField('out')}

        <Text style={[styles.fieldLabel, { color: theme.muted }]}>Category</Text>
        <TextInput
          style={[
            styles.noteInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          value={category}
          onChangeText={setCategory}
          placeholder="What kind of work?"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
        />
        {suggestions
          .filter((s) => s.length > 0 && s !== category)
          .slice(0, 6)
          .map((s) => (
            <Pressable key={s} onPress={() => setCategory(s)}>
              <Text style={{ color: theme.accent, fontSize: 13, paddingVertical: 2 }}>{s}</Text>
            </Pressable>
          ))}

        <Text style={[styles.fieldLabel, { color: theme.muted }]}>Note</Text>
        <TextInput
          style={[
            styles.noteInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder="What was this session for?"
          placeholderTextColor={theme.muted}
          multiline
        />

        {error && <Text style={[styles.error, { color: theme.stop }]}>{error}</Text>}

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, { borderColor: theme.stop }]}
            onPress={confirmDelete}>
            <Text style={[styles.deleteText, { color: theme.stop }]}>Delete</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={save}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 8,
  },
  field: {
    padding: 14,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldDisabled: {
    opacity: 0.4,
  },
  fieldLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  runningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runningLabel: {
    fontSize: 15,
  },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.card,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
  },
  error: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
