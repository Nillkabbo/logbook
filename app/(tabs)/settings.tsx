import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChipRow } from '@/components/ChipRow';
import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { blockRangeLabel } from '@/engine/schedule';
import {
  validateHourlyRate,
  validateReminderThreshold,
  validateWeeklyTarget,
} from '@/engine/validation';
import { cardStyle, insetInput, RADIUS, useTheme } from '@/theme';
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

  const labeledInput = (
    label: string,
    value: string,
    onChangeText: (next: string) => void,
    onBlur: () => void,
    hint?: string,
  ) => (
    <View style={styles.fieldStack}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[styles.input, insetInput(theme), { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.muted}
      />
      {hint && <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text>}
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
      <View style={[styles.card, cardStyle(theme)]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('weekStartsOn')}</Text>
        <WeekdayPicker
          value={settings.weekStartDay}
          onChange={useCallback((day: Weekday | Weekday[]) => saveSettings({ weekStartDay: day as Weekday }), [saveSettings])}
        />
        {labeledInput(t('weeklyTarget'), target.value, target.onChangeText, target.onBlur)}
        {target.error && <Text style={[styles.error, { color: theme.stop }]}>{t(target.error as StringKey)}</Text>}
        {labeledInput(t('reminderThreshold'), threshold.value, threshold.onChangeText, threshold.onBlur, t('reminderHint'))}
        {threshold.error && <Text style={[styles.error, { color: theme.stop }]}>{t(threshold.error as StringKey)}</Text>}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('earnings')}</Text>
      <View style={[styles.card, styles.cardTight, cardStyle(theme)]}>
        {labeledInput(t('hourlyRate'), rate.value, rate.onChangeText, rate.onBlur, t('rateHint'))}
        {rate.error && <Text style={[styles.error, { color: theme.stop }]}>{t(rate.error as StringKey)}</Text>}
      </View>

      <View style={[styles.card, cardStyle(theme)]}>
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
      <View style={[styles.card, cardStyle(theme)]}>
        <ChipRow
          size="lg"
          accessibilityLabel={t('language')}
          options={['system', 'en', 'bn']}
          isSelected={(option) => settings.language === option}
          onSelect={(option) => saveSettings({ language: option as LanguageSetting })}
          labelOf={(option) => (option === 'system' ? t('system') : option === 'en' ? 'English' : 'বাংলা')}
        />
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
    marginTop: -2,
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
