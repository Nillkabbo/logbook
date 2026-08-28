import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLogbook } from '@/hooks/useLogbook';
import { parseHoursInput, validateWeeklyTarget } from '@/engine/validation';
import { WEEKDAY_NAMES, type Weekday } from '@/engine/types';

/**
 * One-time setup shown on first launch: week-start day + weekly target.
 * Skippable — defaults (Sunday, 40h) apply and everything is changeable in Settings.
 */
export function FirstLaunchSetup() {
  const { ready, settings, saveSettings } = useLogbook();
  const [weekStartDay, setWeekStartDay] = useState<number>(0);
  const [target, setTarget] = useState('40');
  const [error, setError] = useState<string | null>(null);
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
    const hours = parseHoursInput(target);
    const validationError = validateWeeklyTarget(hours);
    if (validationError) {
      setError(validationError);
      return;
    }
    await finish({ weekStartDay: weekStartDay as Weekday, weeklyTargetHours: hours });
  };

  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome to LogBook</Text>
        <Text style={styles.intro}>
          Two quick choices — you can change both later in Settings, or skip for now.
        </Text>

        <Text style={styles.label}>When does your week start?</Text>
        <View style={styles.pillRow}>
          {WEEKDAY_NAMES.map((name, index) => (
            <Pressable
              key={name}
              style={[styles.pill, weekStartDay === index && styles.pillActive]}
              onPress={() => setWeekStartDay(index)}>
              <Text style={[styles.pillText, weekStartDay === index && styles.pillTextActive]}>
                {name.slice(0, 3)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Weekly target (hours)</Text>
        <TextInput
          style={styles.input}
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
        />

        {error && <Text style={styles.error}>{error}</Text>}

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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  pillActive: {
    backgroundColor: '#0a7ea4',
  },
  pillText: {
    fontSize: 14,
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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
