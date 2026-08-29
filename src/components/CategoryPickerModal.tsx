import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { KeyboardSafeSheetBody } from '@/components/KeyboardSafe';
import { cardStyle, insetInput, RADIUS, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/**
 * A compact bottom sheet for entering a category name — the keyboard-safe
 * replacement for inline inputs, which hid behind the keyboard. Input sits at
 * the top; Save returns the caller's verdict (false shows the duplicate error
 * without closing). Shared by the Settings Categories card and first-launch
 * setup.
 */
export function CategoryPickerModal({
  visible,
  title,
  initialValue = '',
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  initialValue?: string;
  /** Persist the name; false keeps the sheet open with the duplicate error. */
  onSave: (name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Re-seed whenever the sheet opens for a fresh entry.
  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(false);
    }
  }, [visible, initialValue]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await onSave(value);
      if (!ok) {
        setError(true);
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: 'rgba(9,9,11,0.5)' }]} onPress={onClose}>
        <KeyboardSafeSheetBody contentContainerStyle={styles.avoid}>
          <Pressable style={[styles.sheet, cardStyle(theme), { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <TextInput
              style={[styles.input, insetInput(theme), { color: theme.text }]}
              value={value}
              onChangeText={(next) => {
                setValue(next);
                setError(false);
              }}
              autoFocus
              autoCapitalize="none"
              placeholder={t('categoryPlaceholderAdd')}
              placeholderTextColor={theme.muted}
              onSubmitEditing={save}
              editable={!busy}
            />
            {error && (
              <Text style={[styles.error, { color: theme.stop }]}>{t('categoryExists')}</Text>
            )}
            <View style={styles.buttons}>
              <Pressable
                style={[styles.button, insetInput(theme)]}
                disabled={busy}
                onPress={onClose}>
                <Text style={{ color: theme.text, fontSize: 14 }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { backgroundColor: theme.accent }, busy && styles.disabled]}
                disabled={busy}
                onPress={save}>
                <Text style={{ color: theme.onAccent, fontSize: 14, fontWeight: '600' }}>
                  {t('save')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardSafeSheetBody>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  avoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderRadius: RADIUS.control,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: {
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.6,
  },
});
