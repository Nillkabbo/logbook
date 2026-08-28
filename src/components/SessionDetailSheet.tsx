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

interface Props {
  session: Session;
  onSave: (patch: SessionPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

const formatDateTime = (date: Date) => `${formatDayLabel(date)}, ${formatTimeOfDay(date)}`;

export function SessionDetailSheet({ session, onSave, onDelete, onClose }: Props) {
  const [checkIn, setCheckIn] = useState(session.checkIn);
  const [checkOut, setCheckOut] = useState(session.checkOut);
  const [note, setNote] = useState(session.note);
  const [picker, setPicker] = useState<'in' | 'out' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCheckIn(session.checkIn);
    setCheckOut(session.checkOut);
    setNote(session.note);
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
      await onSave({ checkIn, checkOut, note: note.trim() });
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
      <Text style={[styles.fieldLabel, disabled && styles.fieldDisabled]}>{label}</Text>
    );
    const onPick =
      (_event: DateTimePickerEvent, selected?: Date): void => applyPicker(field, selected);

    if (Platform.OS === 'ios') {
      // iOS: the compact picker is the control itself; a running session has no checkout to edit.
      return disabled ? (
        <View style={styles.fieldGroup}>
          {labelRow}
          <Text style={styles.fieldValue}>—</Text>
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
          style={[styles.field, disabled && styles.fieldDisabled]}
          disabled={disabled}
          onPress={() => setPicker(picker === field ? null : field)}>
          <Text style={styles.fieldValue}>{value ? formatDateTime(value) : '—'}</Text>
        </Pressable>
        {picker === field && value && (
          <DateTimePicker value={value} mode="datetime" onChange={onPick} />
        )}
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Session</Text>

        {renderField('in')}
        <View style={styles.runningRow}>
          <Text style={styles.runningLabel}>Still running</Text>
          {/* Turning it off anchors the checkout at the check-in: the user must
              pick an explicit time before Save passes validation. */}
          <Switch value={running} onValueChange={(on) => setCheckOut(on ? null : checkIn)} />
        </View>
        {renderField('out')}

        <Text style={styles.fieldLabel}>Note</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="What was this session for?"
          multiline
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.deleteButton]} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.saveButton, busy && styles.buttonDisabled]}
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
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  fieldDisabled: {
    opacity: 0.4,
  },
  fieldLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
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
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
  },
  error: {
    color: '#c0392b',
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
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
  },
  deleteButton: {
    backgroundColor: 'rgba(192, 57, 43, 0.12)',
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
    color: '#c0392b',
    fontSize: 16,
    fontWeight: '600',
  },
});
