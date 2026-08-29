import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/DateTimeField';
import { formatDuration, formatDurationWords } from '@/engine/time';
import type { Session, SessionPatch } from '@/engine/types';
import { validateSessionTimes } from '@/engine/validation';
import { cardStyle, RADIUS, softPill, useTheme } from '@/theme';
import { useHour12 } from '@/ui/clock';
import { useI18n, type StringKey } from '@/ui/i18n';

interface Props {
  session: Session;
  /** Distinct categories already used, for suggestions. */
  suggestions: string[];
  onSave: (patch: SessionPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
  /** Create mode: `session` is a newSessionDraft — no delete row, no running switch. */
  isNew?: boolean;
}

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.88);
const DISMISS_THRESHOLD = 90;

export function SessionDetailSheet({ session, suggestions, onSave, onDelete, onClose, isNew = false }: Props) {
  const theme = useTheme();
  const hour12 = useHour12();
  const { t } = useI18n();
  const [checkIn, setCheckIn] = useState(session.checkIn);
  const [checkOut, setCheckOut] = useState(session.checkOut);
  const [note, setNote] = useState(session.note);
  const [category, setCategory] = useState(session.category);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sheet entrance/drag animation: 0 = closed, SHEET_HEIGHT = open.
  const panY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(panY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
      Animated.timing(scrimOpacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [panY, scrimOpacity]);

  useEffect(() => {
    setCheckIn(session.checkIn);
    setCheckOut(session.checkOut);
    setNote(session.note);
    setCategory(session.category);
    setError(null);
  }, [session]);

  const running = checkOut === null;
  const dirty =
    checkIn !== session.checkIn ||
    checkOut !== session.checkOut ||
    note !== session.note ||
    category !== session.category;

  // Swipe-down or Cancel on an edited form confirms before discarding.
  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert(t('discardChanges'), t('discardChangesBody'), [
      { text: t('keepEditing'), style: 'cancel' },
      { text: t('discard'), style: 'destructive', onPress: onClose },
    ]);
  };

  // Drag-to-dismiss: grabber + title area responds; past the threshold
  // dismisses (with the dirty check), else springs back.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) panY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_THRESHOLD) {
            requestClose();
          } else {
            Animated.spring(panY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 5 }).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dirty, session, panY],
  );

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

  const renderField = (field: 'in' | 'out') => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.muted }, field === 'out' && running && styles.fieldDisabled]}>
        {field === 'in' ? t('checkInLabel') : t('checkOutLabel')}
      </Text>
      <DateTimeField
        label={field === 'in' ? t('checkInLabel') : t('checkOutLabel')}
        value={field === 'in' ? checkIn : checkOut}
        onChange={(date) => (field === 'in' ? setCheckIn(date) : setCheckOut(date))}
        disabled={field === 'out' && running}
      />
    </View>
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={requestClose}>
      <View style={styles.overlay}>
        {/* Scrim: tap to dismiss (dirty-checked) */}
        <AnimatedPressable
          onPress={requestClose}
          style={[styles.scrim, { opacity: scrimOpacity }]}
        />

        {/* The sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, transform: [{ translateY: panY }] },
          ]}>
          {/* Drag handle: grabber → close ✕ + centered title; the whole header drags */}
          <View {...pan.panHandlers}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: theme.inset }]} />
            </View>
            <View style={styles.titleRow}>
              <View style={styles.titleSpacer} />
              <Text style={[styles.title, { color: theme.text }]}>{isNew ? t('newSession') : t('session')}</Text>
              <View style={styles.titleSpacer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('cancel')}
                  android_ripple={{ color: theme.inset, borderless: true, radius: 22 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.closeButton, { backgroundColor: theme.inset }]}
                  onPress={requestClose}>
                  <Text style={[styles.closeIcon, { color: theme.text }]}>✕</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Scrollable form content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
              <ScrollView
                style={{ backgroundColor: theme.surface }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}>
                {renderField('in')}
                {!isNew && (
                  <View style={[styles.runningCard, cardStyle(theme)]}>
                    <Text style={[styles.runningLabel, { color: theme.text }]}>{t('stillRunning')}</Text>
                    {/* Turning it off anchors the checkout at the check-in: the user must
                        pick an explicit time before Save passes validation. */}
                    <Switch value={running} onValueChange={(on) => setCheckOut(on ? null : checkIn)} />
                  </View>
                )}
                {renderField('out')}

                {(checkOut === null || checkOut.getTime() > checkIn.getTime()) && (
                  <Text style={[styles.durationPreview, { color: theme.text }]}>
                    {checkOut === null
                      ? `${formatDurationWords(Math.floor((Date.now() - checkIn.getTime()) / 1000))} ${t('soFar')}`
                      : formatDurationWords(Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000))}
                  </Text>
                )}

                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t('category')}</Text>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: theme.canvas, color: theme.text }]}
                  value={category}
                  onChangeText={setCategory}
                  placeholder={t('categoryPlaceholder')}
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                />
                <View style={styles.suggestions}>
                  {suggestions
                    .filter((s) => s.length > 0 && s !== category)
                    .slice(0, 6)
                    .map((s) => (
                      <Pressable
                        key={s}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        style={softPill(theme)}
                        onPress={() => setCategory(s)}>
                        <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '500' }}>{s}</Text>
                      </Pressable>
                    ))}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t('note')}</Text>
                <TextInput
                  style={[styles.noteInput, styles.noteTall, { backgroundColor: theme.canvas, color: theme.text }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('notePlaceholder')}
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
                {!isNew && (
                  <View style={styles.deleteRow}>
                    <Pressable onPress={confirmDelete}>
                      <Text style={[styles.deleteText, { color: theme.stop }]}>{t('delete')}</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Pressable that accepts an animated style (for the scrim's fade). */
function AnimatedPressable({ onPress, style }: { onPress: () => void; style: Animated.WithAnimatedValue<View['props']['style']> }) {
  return (
    <Pressable onPress={onPress}>
      <Animated.View style={style} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  grabber: {
    width: 40,
    height: 6,
    borderRadius: 999,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  titleSpacer: {
    width: 44,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  container: {
    padding: 20,
    paddingBottom: 24,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
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
    borderRadius: RADIUS.control,
    padding: 16,
    fontSize: 15,
  },
  noteTall: {
    height: 70,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
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
