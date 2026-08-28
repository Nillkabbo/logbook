import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { validateWeeklyTarget } from '@/engine/validation';
import type { Weekday } from '@/engine/types';

/**
 * One-time setup shown on first launch: week-start day + weekly target.
 * Skippable — defaults (Sunday, 40h) apply and everything is changeable in Settings.
 */
export function FirstLaunchSetup() {
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome to LogBook</Text>
        <Text style={styles.intro}>
          Two quick choices — you can change both later in Settings, or skip for now.
        </Text>

        <Text style={styles.label}>When does your week start?</Text>
        <WeekdayPicker value={weekStartDay} onChange={setWeekStartDay} />

        <Text style={styles.label}>Weekly target (hours)</Text>
        <TextInput
          style={styles.input}
          value={target.value}
          onChangeText={target.onChangeText}
          onBlur={target.onBlur}
          keyboardType="decimal-pad"
        />
        {target.error && <Text style={styles.error}>{target.error}</Text>}

        <Pressable
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={start}>
          <Text style={styles.primaryText}>Start tracking</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => finish({})}>
          <Text style={styles.skipText}>Skip — use defaults (Sunday, 40h)</Text>
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
    opacity: 0.6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    textAlign: 'center',
    color: '#0a7ea4',
    fontSize: 14,
    paddingVertical: 8,
  },
});
