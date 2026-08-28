import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { validateWeeklyTarget } from '@/engine/validation';
import type { Weekday } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';
import { useI18n, type StringKey } from '@/ui/i18n';

/**
 * One-time setup shown on first launch: week-start day + weekly target.
 * Skippable — defaults (Sunday, 40h) apply and everything is changeable in Settings.
 */
export function FirstLaunchSetup() {
  const theme = useTheme();
  const { t } = useI18n();
  const { ready, settings, saveSettings } = useLogbook();
  const [weekStartDay, setWeekStartDay] = useState<Weekday>(0);
  const target = useValidatedHours('40', validateWeeklyTarget);
  const [busy, setBusy] = useState(false);

  // Don't flash the modal before settings have loaded.
  if (!ready || settings.setupCompleted) return null;

  const finish = async (patch: Parameters<typeof saveSettings>[0]) => {
    setBusy(true);
    try {
      await saveSettings({ setupCompleted: true, ...patch });
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const hours = target.commitNow();
    if (hours === null) return;
    await finish({ weekStartDay, weeklyTargetHours: hours });
  };

  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} edges={['top', 'bottom']}>
      <ScrollView
        style={{ backgroundColor: theme.canvas }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { paddingBottom: 48 }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('welcome')}</Text>
        <Text style={[styles.intro, { color: theme.muted }]}>
          {t('welcomeIntro')}
        </Text>

        <Text style={[styles.label, { color: theme.muted }]}>{t('weekStartQ')}</Text>
        <WeekdayPicker variant="setup" value={weekStartDay} onChange={(day) => setWeekStartDay(day as Weekday)} />

        <Text style={[styles.label, { color: theme.muted }]}>{t('weeklyTarget')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.inset }]}
          value={target.value}
          onChangeText={target.onChangeText}
          onBlur={target.onBlur}
          keyboardType="decimal-pad"
          placeholderTextColor={theme.muted}
        />
        {target.error && <Text style={[styles.error, { color: theme.stop }]}>{t(target.error as StringKey)}</Text>}

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.accent }, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={start}>
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>{t('startTracking')}</Text>
        </Pressable>
        <Pressable disabled={busy} hitSlop={{ top: 12, bottom: 12 }} onPress={() => finish({})}>
          <Text style={[styles.skipText, { color: theme.muted }]}>
            {t('skipSetup')}
          </Text>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  intro: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginHorizontal: 8,
    marginBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  input: {
    borderRadius: RADIUS.control,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: RADIUS.card,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 8,
  },
});
