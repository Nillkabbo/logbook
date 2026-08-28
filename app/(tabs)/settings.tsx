import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { blockRangeLabel } from '@/engine/schedule';
import {
  validateHourlyRate,
  validateReminderThreshold,
  validateWeeklyTarget,
} from '@/engine/validation';
import { RADIUS, useTheme } from '@/theme';
import { useI18n, type LanguageSetting, type StringKey } from '@/ui/i18n';
import type { Weekday } from '@/engine/types';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, weekdayShortName } = useI18n();
  const { refresh, settings, saveSettings, blocks } = useLogbook();

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

  const labeledInput = (label: string, value: string, onChangeText: (next: string) => void, onBlur: () => void) => (
    <View style={styles.fieldStack}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.inset }]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.muted}
      />
    </View>
  );


  // The Schedule row's sub-label: the single block's range, or a count when several exist.
  const blockSummary =
    blocks.length === 0
      ? t('noBlocks')
      : blocks.length === 1
        ? blockRangeLabel(blocks[0], weekdayShortName)
        : t('nBlocks', { n: blocks.length });

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('week')}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('weekStartsOn')}</Text>
        <WeekdayPicker
          value={settings.weekStartDay}
          onChange={useCallback((day: Weekday | Weekday[]) => saveSettings({ weekStartDay: day as Weekday }), [saveSettings])}
        />
        {labeledInput(t('weeklyTarget'), target.value, target.onChangeText, target.onBlur)}
        {target.error && <Text style={[styles.error, { color: theme.stop }]}>{t(target.error as StringKey)}</Text>}
        {labeledInput(t('reminderThreshold'), threshold.value, threshold.onChangeText, threshold.onBlur)}
        {threshold.error && <Text style={[styles.error, { color: theme.stop }]}>{t(threshold.error as StringKey)}</Text>}
        <Text style={[styles.hint, styles.hintTuck, { color: theme.muted }]}>{t('reminderHint')}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('earnings')}</Text>
      <View style={[styles.card, styles.cardTight, { backgroundColor: theme.surface }, theme.cardShadow]}>
        {labeledInput(t('hourlyRate'), rate.value, rate.onChangeText, rate.onBlur)}
        {rate.error && <Text style={[styles.error, { color: theme.stop }]}>{t(rate.error as StringKey)}</Text>}
        <Text style={[styles.hint, styles.hintTuck, { color: theme.muted }]}>{t('rateHint')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }, theme.cardShadow]}>
        <Pressable
          android_ripple={{ color: theme.inset }}
          style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/schedule')}>
          <View style={styles.navText}>
            <Text style={[styles.navTitle, { color: theme.text }]}>{t('schedule')}</Text>
            <Text style={[styles.navSub, { color: theme.muted }]}>{blockSummary}</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>
        <View style={[styles.navDivider, { backgroundColor: theme.canvas }]} />
        <Pressable
          android_ripple={{ color: theme.inset }}
          style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/data')}>
          <View style={styles.navText}>
            <Text style={[styles.navTitle, { color: theme.text }]}>{t('data')}</Text>
            <Text style={[styles.navSub, { color: theme.muted }]}>{t('dataSub')}</Text>
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
                android_ripple={{ color: theme.muted, borderless: false }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.pill, pressed && styles.pressed, { backgroundColor: active ? theme.accent : theme.inset }]}
                onPress={() => saveSettings({ language: option })}>
                <Text style={{ fontSize: 14, color: active ? theme.onAccent : theme.text }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    borderRadius: RADIUS.card,
    padding: 24,
    gap: 24,
  },
  cardTight: {
    gap: 8,
  },
  fieldStack: {
    gap: 8,
  },
  hintTuck: {
    marginTop: -16,
  },
  rowLabel: {
    fontSize: 15,
  },
  input: {
    borderRadius: RADIUS.control,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.7,
  },
  navDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
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
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 20,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: RADIUS.pill,
  },
  pillText: {
    fontSize: 14,
  },
});
