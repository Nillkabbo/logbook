import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { validateWeeklyTarget } from '@/engine/validation';
import type { Weekday } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';

/**
 * One-time setup shown on first launch: week-start day + weekly target.
 * Skippable — defaults (Sunday, 40h) apply and everything is changeable in Settings.
 */
export function FirstLaunchSetup() {
  const theme = useTheme();
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
      <ScrollView
        style={{ backgroundColor: theme.subtle }}
        contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Welcome to LogBook</Text>
        <Text style={[styles.intro, { color: theme.muted }]}>
          Two quick choices — you can change both later in Settings, or skip for now.
        </Text>

        <Text style={[styles.label, { color: theme.muted }]}>When does your week start?</Text>
        <WeekdayPicker value={weekStartDay} onChange={(day) => setWeekStartDay(day as Weekday)} />

        <Text style={[styles.label, { color: theme.muted }]}>Weekly target (hours)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          value={target.value}
          onChangeText={target.onChangeText}
          onBlur={target.onBlur}
          keyboardType="decimal-pad"
          placeholderTextColor={theme.muted}
        />
        {target.error && <Text style={[styles.error, { color: theme.stop }]}>{target.error}</Text>}

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.accent }, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={start}>
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>Start tracking</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => finish({})}>
          <Text style={[styles.skipText, { color: theme.accent }]}>
            Skip — use defaults (Sunday, 40h)
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  intro: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.card,
    padding: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: RADIUS.card,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
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
    paddingVertical: 8,
  },
});
