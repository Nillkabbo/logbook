import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLogbook } from '@/hooks/useLogbook';
import { sessionsToCsv } from '@/engine/csv';
import { validateReminderThreshold, validateWeeklyTarget } from '@/engine/validation';
import { exportCsvViaShareSheet } from '@/export/csvExport';
import type { Weekday } from '@/engine/types';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export default function SettingsScreen() {
  const logbook = useLogbook();
  const [target, setTarget] = useState(String(logbook.settings.weeklyTargetHours));
  const [threshold, setThreshold] = useState(String(logbook.settings.reminderThresholdHours));
  const [errors, setErrors] = useState<{ target?: string; threshold?: string }>({});
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      logbook.refresh();
    }, [logbook]),
  );

  // Sync the inputs whenever the persisted settings change elsewhere.
  useEffect(() => {
    setTarget(String(logbook.settings.weeklyTargetHours));
    setThreshold(String(logbook.settings.reminderThresholdHours));
  }, [logbook.settings.weeklyTargetHours, logbook.settings.reminderThresholdHours]);

  const pickWeekStart = (day: number) => logbook.saveSettings({ weekStartDay: day as Weekday });

  const commitTarget = () => {
    const hours = Number(target.replace(',', '.'));
    const error = validateWeeklyTarget(hours);
    setErrors((prev) => ({ ...prev, target: error ?? undefined }));
    if (error) return;
    logbook.saveSettings({ weeklyTargetHours: hours });
  };

  const commitThreshold = () => {
    const hours = Number(threshold.replace(',', '.'));
    const error = validateReminderThreshold(hours);
    setErrors((prev) => ({ ...prev, threshold: error ?? undefined }));
    if (error) return;
    logbook.saveSettings({ reminderThresholdHours: hours });
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const shared = await exportCsvViaShareSheet(sessionsToCsv(logbook.sessions));
      if (!shared) {
        Alert.alert('Export unavailable', 'Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Export failed', String(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Week starts on</Text>
      <View style={styles.pillRow}>
        {WEEKDAY_NAMES.map((name, index) => (
          <Pressable
            key={name}
            style={[
              styles.pill,
              logbook.settings.weekStartDay === index && styles.pillActive,
            ]}
            onPress={() => pickWeekStart(index)}>
            <Text
              style={[
                styles.pillText,
                logbook.settings.weekStartDay === index && styles.pillTextActive,
              ]}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Weekly target (hours)</Text>
      <TextInput
        style={styles.input}
        value={target}
        onChangeText={setTarget}
        onBlur={commitTarget}
        keyboardType="decimal-pad"
      />
      {errors.target && <Text style={styles.error}>{errors.target}</Text>}

      <Text style={styles.sectionTitle}>Reminder after (hours, 1–16)</Text>
      <TextInput
        style={styles.input}
        value={threshold}
        onChangeText={setThreshold}
        onBlur={commitThreshold}
        keyboardType="decimal-pad"
      />
      {errors.threshold && <Text style={styles.error}>{errors.threshold}</Text>}
      <Text style={styles.hint}>Applies to your next check-in.</Text>

      <Text style={styles.sectionTitle}>Export</Text>
      <Pressable
        style={[styles.exportButton, exporting && styles.buttonDisabled]}
        disabled={exporting}
        onPress={exportCsv}>
        <Text style={styles.exportText}>Export all sessions (CSV)</Text>
      </Pressable>
      <Text style={styles.hint}>One row per session via the share sheet.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  sectionTitle: {
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
    paddingHorizontal: 14,
    borderRadius: 18,
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
  hint: {
    fontSize: 13,
    opacity: 0.6,
  },
  exportButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  exportText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
