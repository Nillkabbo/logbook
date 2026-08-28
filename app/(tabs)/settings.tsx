import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { sessionsToCsv } from '@/engine/csv';
import { validateReminderThreshold, validateWeeklyTarget } from '@/engine/validation';
import { exportCsvViaShareSheet } from '@/export/csvExport';
import { RADIUS, useTheme } from '@/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { refresh, sessions, settings, saveSettings } = useLogbook();
  const [exporting, setExporting] = useState(false);

  const target = useValidatedHours(
    String(settings.weeklyTargetHours),
    validateWeeklyTarget,
    useCallback((hours: number) => saveSettings({ weeklyTargetHours: hours }), [saveSettings]),
  );
  const threshold = useValidatedHours(
    String(settings.reminderThresholdHours),
    validateReminderThreshold,
    useCallback((hours: number) => saveSettings({ reminderThresholdHours: hours }), [saveSettings]),
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Sync the inputs whenever the persisted settings change elsewhere.
  useEffect(() => {
    target.reset(String(settings.weeklyTargetHours));
    threshold.reset(String(settings.reminderThresholdHours));
  }, [settings.weeklyTargetHours, settings.reminderThresholdHours, target, threshold]);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const shared = await exportCsvViaShareSheet(sessionsToCsv(sessions));
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
    <ScrollView
      style={{ backgroundColor: theme.subtle }}
      contentContainerStyle={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>Week starts on</Text>
      <WeekdayPicker
        value={settings.weekStartDay}
        onChange={useCallback((day: Parameters<typeof saveSettings>[0]['weekStartDay']) => saveSettings({ weekStartDay: day }), [saveSettings])}
      />

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>Weekly target (hours)</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={target.value}
        onChangeText={target.onChangeText}
        onBlur={target.onBlur}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.muted}
      />
      {target.error && <Text style={[styles.error, { color: theme.stop }]}>{target.error}</Text>}

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>Reminder threshold (hours, 1–16)</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={threshold.value}
        onChangeText={threshold.onChangeText}
        onBlur={threshold.onBlur}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.muted}
      />
      {threshold.error && <Text style={[styles.error, { color: theme.stop }]}>{threshold.error}</Text>}
      <Text style={[styles.hint, { color: theme.muted }]}>Applies to your next check-in.</Text>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>Export</Text>
      <Pressable
        style={[styles.exportButton, { backgroundColor: theme.accent }, exporting && styles.buttonDisabled]}
        disabled={exporting}
        onPress={exportCsv}>
        <Text style={styles.exportText}>Export all sessions (CSV)</Text>
      </Pressable>
      <Text style={[styles.hint, { color: theme.muted }]}>One row per session via the share sheet.</Text>
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
  hint: {
    fontSize: 13,
  },
  exportButton: {
    borderRadius: RADIUS.card,
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
