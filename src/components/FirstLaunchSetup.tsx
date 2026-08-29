import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { WeekdayPicker, useValidatedHours } from '@/components/settings-entry';
import { useLogbook } from '@/hooks/useLogbook';
import { validateHourlyRate, validateWeeklyTarget } from '@/engine/validation';
import type { Weekday } from '@/engine/types';
import { RADIUS, useTheme } from '@/theme';
import { useI18n, type StringKey } from '@/ui/i18n';

/**
 * One-time setup shown on first launch: week-start day + weekly target +
 * optional hourly rate + optional starter categories. Skippable — defaults
 * (Sunday, 40h, no rate, no categories) apply; everything is changeable in Settings.
 */
export function FirstLaunchSetup() {
  const theme = useTheme();
  const { t } = useI18n();
  const { ready, settings, saveSettings, setCurrentRate, addCategory } = useLogbook();
  const [weekStartDay, setWeekStartDay] = useState<Weekday>(0);
  const target = useValidatedHours('40', validateWeeklyTarget);
  // Empty commits as 0 = unset; a value becomes a rate record effective today.
  const rate = useValidatedHours('', validateHourlyRate, undefined, 0);
  const [busy, setBusy] = useState(false);
  // Optional starter categories — chips added via the picker modal, saved on Start.
  const [chips, setChips] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    const rateValue = rate.commitNow();
    if (rateValue === null) return;
    await finish({ weekStartDay, weeklyTargetHours: hours });
    if (rateValue > 0) await setCurrentRate(rateValue);
    for (const chip of chips) await addCategory(chip);
  };

  const addChip = (raw: string): Promise<boolean> => {
    const trimmed = raw.trim();
    const dup = trimmed.length === 0 || chips.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!dup) setChips((prev) => [...prev, trimmed]);
    return Promise.resolve(!dup);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} edges={['top', 'bottom']}>
      <ScrollView
        style={{ backgroundColor: theme.canvas }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { paddingBottom: 48 }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('welcome')}</Text>
        <Text style={[styles.intro, { color: theme.muted }]}>
          {t('welcomeIntro')}
        </Text>

        <Text style={[styles.label, { color: theme.muted }]}>{t('weekStartQ')}</Text>
        <WeekdayPicker variant="setup" value={weekStartDay} onChange={(day) => setWeekStartDay(day as Weekday)} />

        <Text style={[styles.label, { color: theme.muted }]}>{t('weeklyTarget')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.inset }]}
          value={target.value}
          onChangeText={target.onChangeText}
          onBlur={target.onBlur}
          keyboardType="decimal-pad"
          placeholderTextColor={theme.muted}
        />
        {target.error && <Text style={[styles.error, { color: theme.stop }]}>{t(target.error as StringKey)}</Text>}

        <Text style={[styles.label, { color: theme.muted }]}>{t('hourlyRate')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.inset }]}
          value={rate.value}
          onChangeText={rate.onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={theme.muted}
        />
        {rate.error && <Text style={[styles.error, { color: theme.stop }]}>{t(rate.error as StringKey)}</Text>}

        <Text style={[styles.label, { color: theme.muted }]}>{t('workCategoriesQ')}</Text>
        {chips.length > 0 && (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <Pressable
                key={chip}
                style={[styles.chip, { backgroundColor: theme.inset }]}
                onPress={() => setChips((prev) => prev.filter((c) => c !== chip))}>
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  {chip} <Text style={{ color: theme.muted }}>×</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          style={[styles.chipAdd, { backgroundColor: theme.inset }]}
          onPress={() => setPickerOpen(true)}>
          <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '500' }}>
            + {t('addCategory')}
          </Text>
        </Pressable>
        <CategoryPickerModal
          visible={pickerOpen}
          title={t('addCategory')}
          onSave={addChip}
          onClose={() => setPickerOpen(false)}
        />

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.accent }, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={start}>
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>{t('startTracking')}</Text>
        </Pressable>
        <Pressable disabled={busy} hitSlop={{ top: 12, bottom: 12 }} onPress={() => finish({})}>
          <Text style={[styles.skipText, { color: theme.muted }]}>
            {t('skipSetup')}
          </Text>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  intro: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginHorizontal: 8,
    marginBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  input: {
    borderRadius: RADIUS.control,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAdd: {
    borderRadius: RADIUS.control,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: RADIUS.card,
    paddingVertical: 16,
    alignItems: 'center',
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
    fontWeight: '500',
    paddingVertical: 8,
  },
});
