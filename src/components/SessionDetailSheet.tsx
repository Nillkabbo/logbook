import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDayLabel } from '@/engine/weeks';
import { formatDuration, formatTimeOfDay } from '@/engine/time';
import type { Session, SessionPatch } from '@/engine/types';
import { validateSessionTimes } from '@/engine/validation';
import { RADIUS, useTheme } from '@/theme';
import { useHour12 } from '@/ui/clock';
import { useI18n, type StringKey } from '@/ui/i18n';

interface Props {
  session: Session;
  /** Distinct categories already used, for suggestions. */
  suggestions: string[];
  onSave: (patch: SessionPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

const formatDateTime = (date: Date, hour12: boolean) =>
  `${formatDayLabel(date)}, ${formatTimeOfDay(date, hour12)}`;

export function SessionDetailSheet({ session, suggestions, onSave, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const hour12 = useHour12();
  const { t } = useI18n();
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('deleteSession'), t('deleteSessionBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await onDelete(session.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onClose();
        },
      },
    ]);
  };

  const renderField = (field: 'in' | 'out') => {
    const value = field === 'in' ? checkIn : checkOut;
    const disabled = field === 'out' && running;
    const label = field === 'in' ? t('checkInLabel') : t('checkOutLabel');

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
            { backgroundColor: theme.surface },
            theme.cardShadow,
            disabled && styles.fieldDisabled,
          ]}
          disabled={disabled}
          onPress={() => setPicker(picker === field ? null : field)}>
          <Text style={[styles.fieldValue, { color: theme.text }]}>
            {value ? formatDateTime(value, hour12) : '—'}
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
      <View style={{ backgroundColor: theme.canvas, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
      <View style={styles.grabberRow}>
        <View style={[styles.grabber, { backgroundColor: '#D4D4D8' }]} />
      </View>
      <ScrollView
        style={{ backgroundColor: theme.canvas }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingBottom: 48 + insets.bottom }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('session')}</Text>

        {renderField('in')}
        <View style={[styles.runningCard, { backgroundColor: theme.surface }, theme.cardShadow]}>
          <Text style={[styles.runningLabel, { color: theme.text }]}>{t('stillRunning')}</Text>
          {/* Turning it off anchors the checkout at the check-in: the user must
              pick an explicit time before Save passes validation. */}
          <Switch value={running} onValueChange={(on) => setCheckOut(on ? null : checkIn)} />
        </View>
        {renderField('out')}

        {(checkOut === null || checkOut.getTime() > checkIn.getTime()) && (
          <Text style={[styles.durationPreview, { color: theme.muted }]}>
            {checkOut === null
              ? `${formatDuration(Math.floor((Date.now() - checkIn.getTime()) / 1000))} ${t('soFar')}`
              : formatDuration(Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000))}
          </Text>
        )}

        <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t('category')}</Text>
        <TextInput
          style={[
            styles.noteInput,
            { color: theme.text, backgroundColor: theme.surface },
            theme.cardShadow,
          ]}
          value={category}
          onChangeText={setCategory}
          placeholder={t("categoryPlaceholder")}
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
        />
        <View style={styles.suggestions}>
          {suggestions
            .filter((s) => s.length > 0 && s !== category)
            .slice(0, 6)
            .map((s) => (
              <Pressable key={s} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} onPress={() => setCategory(s)}>
                <Text style={{ color: theme.accent, fontSize: 13, paddingVertical: 2 }}>{s}</Text>
              </Pressable>
            ))}
        </View>

        <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t('note')}</Text>
        <TextInput
          style={[
            styles.noteInput,
            styles.noteTall,
            { color: theme.text, backgroundColor: theme.surface },
            theme.cardShadow,
          ]}
          value={note}
          onChangeText={setNote}
          placeholder={t("notePlaceholder")}
          placeholderTextColor={theme.muted}
          multiline
        />

        {error && <Text style={[styles.error, { color: theme.stop }]}>{t(error as StringKey)}</Text>}

        <Pressable
          android_ripple={{ color: theme.muted, borderless: false }}
          style={[styles.button, { backgroundColor: theme.accent }, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={save}>
          <Text style={[styles.saveText, { color: theme.onAccent }]}>{t('save')}</Text>
        </Pressable>
        <View style={styles.deleteRow}>
          <Pressable onPress={confirmDelete}>
            <Text style={[styles.deleteText, { color: theme.stop }]}>{t('delete')}</Text>
          </Pressable>
        </View>
      </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  grabber: {
    width: 40,
    height: 6,
    borderRadius: 999,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  field: {
    padding: 16,
    borderRadius: RADIUS.card,
  },
  fieldDisabled: {
    opacity: 0.4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  fieldValue: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  runningCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 16,
  },
  runningLabel: {
    fontSize: 15,
  },
  noteInput: {
    borderRadius: RADIUS.card,
    padding: 16,
    fontSize: 15,
  },
  noteTall: {
    height: 70,
  },
  suggestions: {
    gap: 16,
    marginHorizontal: 8,
  },
  error: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 16,
    borderRadius: RADIUS.control,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  durationPreview: {
    fontSize: 14,
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
