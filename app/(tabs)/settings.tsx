import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
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
import { useHour12 } from '@/ui/clock';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useI18n, type LanguageSetting, type StringKey, type ThemeSetting } from '@/ui/i18n';
import type { Weekday } from '@/engine/types';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const hour12 = useHour12();
  const { t, locale, weekdayShortName } = useI18n();
  const { refresh, settings, saveSettings, blocks, rateHistory, addRateChange, removeRate, setCurrentRate } = useLogbook();
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRateValue, setNewRateValue] = useState('');
  const [newRateDate, setNewRateDate] = useState(() => new Date());

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
    // The "current rate" input is a rate change effective today — it writes to
    // the history, not the flat field, so earnings follow immediately.
    useCallback((value: number) => setCurrentRate(value), [setCurrentRate]),
    0, // empty input commits as unset (clears every rate record)
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
        ? blockRangeLabel(blocks[0], weekdayShortName, hour12)
        : t('nBlocks', { n: blocks.length });

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas, paddingTop: insets.top + 12 }}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}>
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

        {/* Rate history */}
        {rateHistory.length > 0 && (
          <View style={styles.rateHistoryList}>
            <Text style={[styles.rateHistoryTitle, { color: theme.muted }]}>{t('rateHistory')}</Text>
            {rateHistory.map((record) => (
              <View key={record.id} style={styles.rateRow}>
                <Text style={[styles.rateValue, { color: theme.text }]}>
                  ${record.rate.toFixed(2)}
                </Text>
                <Text style={[styles.rateDate, { color: theme.muted }]}>
                  {t('from_date', { date: record.effectiveFrom.toLocaleDateString(locale) })}
                </Text>
                <Pressable hitSlop={8} onPress={() => removeRate(record.id)}>
                  <Text style={[styles.rateRemove, { color: theme.stop }]}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add rate change */}
        {showAddRate ? (
          <View style={styles.addRateForm}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('effectiveFrom')}</Text>
            <DateTimePicker
              value={newRateDate}
              mode="date"
              onChange={(_e, selected) => selected && setNewRateDate(selected)}
            />
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('hourlyRate')}</Text>
            <TextInput
              style={[styles.input, insetInput(theme), { color: theme.text }]}
              value={newRateValue}
              onChangeText={setNewRateValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.muted}
            />
            <View style={styles.addRateButtons}>
              <Pressable
                style={[styles.addRateCancel, insetInput(theme)]}
                onPress={() => setShowAddRate(false)}>
                <Text style={{ color: theme.text, fontSize: 14 }}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.addRateConfirm, { backgroundColor: theme.accent }]}
                onPress={async () => {
                  const value = parseFloat(newRateValue);
                  if (isNaN(value) || value <= 0) return;
                  await addRateChange(value, newRateDate);
                  setNewRateValue('');
                  setShowAddRate(false);
                }}>
                <Text style={{ color: theme.onAccent, fontSize: 14, fontWeight: '600' }}>{t('save')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            android_ripple={{ color: theme.inset }}
            style={styles.addRateButton}
            onPress={() => setShowAddRate(true)}>
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '500' }}>+ {t('addRateChange')}</Text>
          </Pressable>
        )}
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

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>{t('theme')}</Text>
      <View style={[styles.card, cardStyle(theme)]}>
        <ChipRow
          size="lg"
          accessibilityLabel={t('theme')}
          options={['system', 'light', 'dark']}
          isSelected={(option) => settings.themePreference === option}
          onSelect={(option) => saveSettings({ themePreference: option as ThemeSetting })}
          labelOf={(option) => (option === 'system' ? t('system') : option === 'light' ? t('light') : t('dark'))}
        />
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
    </View>
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
  rateHistoryList: {
    gap: 8,
    marginTop: 16,
  },
  rateHistoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rateDate: {
    fontSize: 13,
    flex: 1,
  },
  rateRemove: {
    fontSize: 18,
    fontWeight: '600',
  },
  addRateButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  addRateForm: {
    gap: 8,
    marginTop: 16,
  },
  addRateButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addRateCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  addRateConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
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
});
