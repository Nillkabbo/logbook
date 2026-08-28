import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { formatTimeOfDay } from '@/engine/time';
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
  const { t, weekdayName } = useI18n();
  const { refresh, settings, saveSettings, exportBackup, importCsv, blocks } = useLogbook();
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
        t('importedNSessions').replace('{n}', String(result.toImport.length)) +
          '\n' +
          t('skippedCounts')
            .replace('{duplicates}', String(result.duplicates))
            .replace('{running}', String(result.skippedRunning))
            .replace('{malformed}', String(result.malformed)),
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

  const insetInput = (value: string, onChangeText: (next: string) => void, onBlur: () => void) => (
    <TextInput
      style={[styles.input, { color: theme.text, backgroundColor: theme.inset }]}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      keyboardType="decimal-pad"
      placeholderTextColor={theme.muted}
    />
  );

  // The first work block summarised, as the Schedule row's sub-label.
  const atMinutes = (minutes: number) =>
    new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
  const blockSummary =
    blocks.length === 0
      ? t('noBlocks')
      : `${blocks[0].weekdays.map((d) => weekdayName(d)).join(', ')} · ${formatTimeOfDay(
          atMinutes(blocks[0].startMinute),
          false,
        )}–${formatTimeOfDay(atMinutes(blocks[0].endMinute), false)}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('week')}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('weekStartsOn')}</Text>
        <WeekdayPicker
          value={settings.weekStartDay}
          onChange={useCallback((day: Weekday | Weekday[]) => saveSettings({ weekStartDay: day as Weekday }), [saveSettings])}
        />
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('weeklyTarget')}</Text>
        {insetInput(target.value, target.onChangeText, target.onBlur)}
        {target.error && <Text style={[styles.error, { color: theme.stop }]}>{t(target.error as StringKey)}</Text>}
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('reminderThreshold')}</Text>
        {insetInput(threshold.value, threshold.onChangeText, threshold.onBlur)}
        {threshold.error && <Text style={[styles.error, { color: theme.stop }]}>{t(threshold.error as StringKey)}</Text>}
        <Text style={[styles.hint, { color: theme.muted }]}>{t('reminderHint')}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('earnings')}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('hourlyRate')}</Text>
        {insetInput(rate.value, rate.onChangeText, rate.onBlur)}
        {rate.error && <Text style={[styles.error, { color: theme.stop }]}>{t(rate.error as StringKey)}</Text>}
        <Text style={[styles.hint, { color: theme.muted }]}>{t('rateHint')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <Pressable style={styles.navRow} onPress={() => router.push('/(tabs)/schedule')}>
          <View style={styles.navText}>
            <Text style={[styles.navTitle, { color: theme.text }]}>{t('schedule')}</Text>
            <Text style={[styles.navSub, { color: theme.muted }]}>{blockSummary}</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('language')}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['system', 'en', 'bn'] as LanguageSetting[]).map((option) => {
            const active = settings.language === option;
            const label = option === 'system' ? t('system') : option === 'en' ? 'English' : 'বাংলা';
            return (
              <Pressable
                key={option}
                onPress={() => saveSettings({ language: option })}
                style={[
                  styles.pill,
                  { backgroundColor: active ? theme.accent : theme.inset },
                ]}>
                <Text style={{ fontSize: 14, color: active ? theme.onAccent : theme.text }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('exportSection')}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.accent }, exporting && styles.buttonDisabled]}
          disabled={exporting}
          onPress={exportCsv}>
          <Text style={[styles.actionText, { color: theme.onAccent }]}>{t('exportAll')}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.muted }]}>{t('exportHint')}</Text>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.inset }, importing && styles.buttonDisabled]}
          disabled={importing}
          onPress={importFromCsv}>
          <Text style={[styles.actionText, { color: theme.text }]}>{t('importBackup')}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.muted }]}>{t('importHint')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  card: {
    borderRadius: RADIUS.card,
    padding: 16,
    gap: 10,
  },
  rowLabel: {
    fontSize: 15,
  },
  input: {
    borderRadius: RADIUS.control,
    padding: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  navText: {
    gap: 2,
    flexShrink: 1,
  },
  navTitle: {
    fontSize: 16,
  },
  navSub: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 20,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
  },
  actionButton: {
    borderRadius: RADIUS.control,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
