import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateTimeField } from '@/components/DateTimeField';
import { useValidatedHours } from '@/components/settings-entry';
import type { RateRecord } from '@/engine/money';
import {
  parseHoursInput,
  validateHourlyRate,
  validateRateChange,
} from '@/engine/validation';
import { cardStyle, insetInput, RADIUS, useTheme } from '@/theme';
import { useI18n, type StringKey } from '@/ui/i18n';

/**
 * The Earnings card: the current-rate input (a rate change effective today),
 * the rate history with its Current badge and per-record delete, and the
 * add-rate-change form. Policy stays in the engine (validateRateChange) and
 * the store (setCurrentRate / addRateChange / removeRate); this module owns
 * only the form state and presentation.
 */
export function RateSection({
  currentRate,
  rateHistory,
  onSetCurrentRate,
  onAddRateChange,
  onRemoveRate,
}: {
  /** The settings.hourlyRate mirror of the latest rate record; 0 = unset. */
  currentRate: number;
  rateHistory: RateRecord[];
  onSetCurrentRate: (rate: number) => void;
  onAddRateChange: (rate: number, effectiveFrom: Date) => void;
  onRemoveRate: (id: number) => void;
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRateValue, setNewRateValue] = useState('');
  const [newRateDate, setNewRateDate] = useState(() => new Date());
  const [rateError, setRateError] = useState<StringKey | null>(null);

  const rate = useValidatedHours(
    currentRate > 0 ? String(currentRate) : '',
    validateHourlyRate,
    onSetCurrentRate,
    0, // empty input commits as unset (clears every rate record)
  );

  // Resync the input only when the persisted mirror moves elsewhere.
  const { reset: resetRate } = rate;
  useEffect(() => {
    resetRate(currentRate > 0 ? String(currentRate) : '');
  }, [currentRate, resetRate]);

  return (
    <View style={[styles.card, cardStyle(theme)]}>
      <View style={styles.fieldStack}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('hourlyRate')}</Text>
        <TextInput
          style={[styles.input, insetInput(theme), { color: theme.text }]}
          value={rate.value}
          onChangeText={rate.onChangeText}
          onBlur={rate.onBlur}
          keyboardType="decimal-pad"
          placeholderTextColor={theme.muted}
        />
        <Text style={[styles.hint, { color: theme.muted }]}>{t('rateHint')}</Text>
        {rate.error && <Text style={[styles.error, { color: theme.stop }]}>{t(rate.error as StringKey)}</Text>}
      </View>

      {/* Rate history */}
      {rateHistory.length > 0 && (
        <View style={styles.rateHistoryList}>
          <Text style={[styles.rateHistoryTitle, { color: theme.muted }]}>{t('rateHistory')}</Text>
          {rateHistory.map((record, index) => {
            const isLatest = index === rateHistory.length - 1; // list is oldest-first
            return (
              <View key={record.id} style={styles.rateRow}>
                <View style={styles.rateValueStack}>
                  <View style={styles.rateValueRow}>
                    <Text style={[styles.rateValue, { color: theme.text }]}>
                      ${record.rate.toFixed(2)}
                    </Text>
                    {isLatest && (
                      <View style={[styles.currentBadge, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.currentBadgeText, { color: theme.accent }]}>
                          {t('currentRate')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rateDate, { color: theme.muted }]}>
                    {t('from_date', { date: record.effectiveFrom.toLocaleDateString(locale) })}
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={() => onRemoveRate(record.id)}>
                  <Text style={[styles.rateRemove, { color: theme.stop }]}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Add rate change */}
      {showAddRate ? (
        <View style={styles.addRateForm}>
          <DateTimeField
            label={t('effectiveFrom')}
            value={newRateDate}
            onChange={setNewRateDate}
            mode="date"
            variant="inset"
          />
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('hourlyRate')}</Text>
          <TextInput
            style={[styles.input, insetInput(theme), { color: theme.text }]}
            value={newRateValue}
            onChangeText={(next) => {
              setNewRateValue(next);
              setRateError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.muted}
          />
          {rateError && <Text style={[styles.error, { color: theme.stop }]}>{t(rateError)}</Text>}
          <View style={styles.addRateButtons}>
            <Pressable
              style={[styles.addRateCancel, insetInput(theme)]}
              onPress={() => {
                setShowAddRate(false);
                setRateError(null);
              }}>
              <Text style={{ color: theme.text, fontSize: 14 }}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.addRateConfirm, { backgroundColor: theme.accent }]}
              onPress={async () => {
                const error = validateRateChange(parseHoursInput(newRateValue));
                if (error) {
                  setRateError(error as StringKey);
                  return;
                }
                await onAddRateChange(parseHoursInput(newRateValue), newRateDate);
                setNewRateValue('');
                setRateError(null);
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: 24,
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
  error: {
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    marginTop: -2,
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
  rateValueStack: {
    flex: 1,
    gap: 2,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  currentBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  rateDate: {
    fontSize: 13,
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
});
