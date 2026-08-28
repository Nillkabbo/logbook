import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { ScheduleEditor } from '@/components/ScheduleEditor';
import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import {
  validateHourlyRate,
  validateReminderThreshold,
  validateWeeklyTarget,
} from '@/engine/validation';
import { RADIUS, useTheme } from '@/theme';
import { useI18n, type LanguageSetting, type StringKey } from '@/ui/i18n';
import type { Weekday } from '@/engine/types';

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { refresh, settings, saveSettings, exportBackup, importCsv, blocks, addBlock, removeBlock } =
    useLogbook();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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
  const rate = useValidatedHours(
    settings.hourlyRate > 0 ? String(settings.hourlyRate) : '',
    validateHourlyRate,
    useCallback((value: number) => saveSettings({ hourlyRate: value }), [saveSettings]),
    0, // empty input commits as unset
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Sync the inputs only when the persisted values change elsewhere. The
  // reset fns are stable — depending on the hook objects instead would fire
  // this effect every render and clobber each keystroke.
  const { reset: resetTarget } = target;
  const { reset: resetThreshold } = threshold;
  const { reset: resetRate } = rate;
  useEffect(() => {
    resetTarget(String(settings.weeklyTargetHours));
    resetThreshold(String(settings.reminderThresholdHours));
    resetRate(settings.hourlyRate > 0 ? String(settings.hourlyRate) : '');
  }, [settings.weeklyTargetHours, settings.reminderThresholdHours, settings.hourlyRate, resetTarget, resetThreshold, resetRate]);

  const importFromCsv = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (picked.canceled || picked.assets.length === 0) return;
      const csv = await new File(picked.assets[0].uri).text();
      const result = await importCsv(csv);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        t('importComplete'),
        `Imported ${result.toImport.length} session${result.toImport.length === 1 ? '' : 's'}.` +
          ` Skipped ${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}` +
          `, ${result.skippedRunning} running` +
          `, ${result.malformed} malformed.`,
      );
    } catch (error) {
      Alert.alert(t('importFailed'), String(error));
    } finally {
      setImporting(false);
    }
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const shared = await exportBackup();
      if (shared) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      if (!shared) {
        Alert.alert(t('exportUnavailable'), t('exportUnavailableBody'));
      }
    } catch (error) {
      Alert.alert(t('exportFailed'), String(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.subtle }}
      contentContainerStyle={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('weekStartsOn')}</Text>
      <WeekdayPicker
        value={settings.weekStartDay}
        onChange={useCallback((day: Weekday | Weekday[]) => saveSettings({ weekStartDay: day as Weekday }), [saveSettings])}
      />

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('weeklyTarget')}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={target.value}
        onChangeText={target.onChangeText}
        onBlur={target.onBlur}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.muted}
      />
      {target.error && <Text style={[styles.error, { color: theme.stop }]}>{t(target.error as StringKey)}</Text>}

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('reminderThreshold')}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={threshold.value}
        onChangeText={threshold.onChangeText}
        onBlur={threshold.onBlur}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.muted}
      />
      {threshold.error && <Text style={[styles.error, { color: theme.stop }]}>{t(threshold.error as StringKey)}</Text>}
      <Text style={[styles.hint, { color: theme.muted }]}>{t('reminderHint')}</Text>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('hourlyRate')}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={rate.value}
        onChangeText={rate.onChangeText}
        onBlur={rate.onBlur}
        keyboardType="decimal-pad"
        placeholder="Not set"
        placeholderTextColor={theme.muted}
      />
      {rate.error && <Text style={[styles.error, { color: theme.stop }]}>{t(rate.error as StringKey)}</Text>}
      <Text style={[styles.hint, { color: theme.muted }]}>
        {t('rateHint')}
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('schedule')}</Text>
      <ScheduleEditor blocks={blocks} onAdd={addBlock} onRemove={removeBlock} />

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('language')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['system', 'en', 'bn'] as LanguageSetting[]).map((option) => {
          const active = settings.language === option;
          const label = option === 'system' ? t('system') : option === 'en' ? 'English' : 'বাংলা';
          return (
            <Pressable
              key={option}
              onPress={() => saveSettings({ language: option })}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 18,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accent : 'transparent',
              }}>
              <Text style={{ fontSize: 14, color: active ? theme.onAccent : theme.text }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('exportSection')}</Text>
      <Pressable
        style={[styles.exportButton, { backgroundColor: theme.accent }, exporting && styles.buttonDisabled]}
        disabled={exporting}
        onPress={exportCsv}>
        <Text style={[styles.exportText, { color: theme.onAccent }]}>{t('exportAll')}</Text>
      </Pressable>
      <Text style={[styles.hint, { color: theme.muted }]}>{t('exportHint')}</Text>
      <Pressable
        style={[styles.exportButton, { borderColor: theme.accent, borderWidth: 1 }, importing && styles.buttonDisabled]}
        disabled={importing}
        onPress={importFromCsv}>
        <Text style={[styles.exportText, { color: theme.accent }]}>{t('importBackup')}</Text>
      </Pressable>
      <Text style={[styles.hint, { color: theme.muted }]}>
        {t('importHint')}
      </Text>
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
    fontSize: 16,
    fontWeight: '600',
  },
});
