import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { BackupBanner, BlockBanner, QuickCategoryRow } from '@/components/HomeBanners';
import { CheckInToggle } from '@/components/CheckInToggle';
import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { homeModel } from '@/engine/home';
import { formatTimeOfDay } from '@/engine/time';
import { formatDayLabel } from '@/engine/weeks';
import { categorySuggestions } from '@/engine/sessions';
import { nextBlockOccurrence } from '@/engine/schedule';
import type { Session } from '@/engine/types';
import { useHour12 } from '@/ui/clock';
import { useI18n } from '@/ui/i18n';
import { RADIUS, TYPE, useTheme } from '@/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const hour12 = useHour12();
  const { refresh, checkIn, checkOut, sessions, settings, now, saveSession, removeSession, blocks } =
    useLogbook();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Session | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // The store's `now` ticks every second while a session runs, re-driving this model.
  const model = homeModel(sessions, settings, now);
  const nextBlock = nextBlockOccurrence(blocks, now);
  const runningUncategorised = model.running !== null && model.running.category === '';

  const onToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (model.running) {
        await checkOut();
      } else {
        await checkIn();
      }
    } catch (error) {
      Alert.alert(t('somethingWrong'), String(error));
    } finally {
      setBusy(false);
    }
  };

  const setRunningCategory = async (category: string) => {
    if (!model.running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await saveSession(model.running.id, {
      checkIn: model.running.checkIn,
      checkOut: null,
      note: model.running.note,
      category,
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.canvas }]}>
      <View style={styles.header}>
        <Text style={[styles.elapsed, { color: theme.text }]}>
          {model.running && model.elapsedLabel ? model.elapsedLabel : ' '}
        </Text>
        <CheckInToggle running={model.running !== null} disabled={busy} onPress={onToggle} />
      </View>

      {runningUncategorised && (
        <QuickCategoryRow
          categories={categorySuggestions(sessions, 4)}
          onPick={setRunningCategory}
          onMore={() => setSelected(model.running)}
        />
      )}

      <View style={styles.totals}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>{t('today')}</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>{model.todayTotalLabel}</Text>
        </View>
        <View style={[styles.totalItem, styles.weekItem]}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>{t('thisWeek')}</Text>
          {model.off ? (
            <View style={styles.offRow}>
              <Text style={[styles.offTotal, { color: theme.text }]}>{model.weekToDateLabel}</Text>
              <View style={[styles.offBadge, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.offBadgeText, { color: theme.accent }]}>{t('offWeek')}</Text>
              </View>
            </View>
          ) : (
            <WeekProgress
              totalLabel={model.weekToDateLabel}
              targetLabel={model.weeklyTargetLabel}
              progress={model.weekProgress}
              overTarget={model.overTarget}
              overByLabel={model.overByLabel}
              emphasized
            />
          )}
          {model.earningsLabel && (
            <Text style={[styles.earnings, { color: theme.accent }]}>{model.earningsLabel}</Text>
          )}
        </View>
      </View>

      <BlockBanner onCheckIn={onToggle} busy={busy} />
      <BackupBanner />

      {nextBlock && (
        <Text style={[styles.nextBlock, { color: theme.muted }]}>
          {t('nextBlock')}: {formatDayLabel(nextBlock.startsAt, locale)},{' '}
          {formatTimeOfDay(nextBlock.startsAt, hour12)}
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {model.todaySessions.map((session) => (
          <Pressable key={session.id} onPress={() => setSelected(session)}>
            {({ pressed }) => (
              <View style={pressed && styles.rowPressed}>
                <SessionRow session={session} now={now} />
              </View>
            )}
          </Pressable>
        ))}
        {model.todaySessions.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🕘</Text>
            <Text style={[styles.empty, { color: theme.muted }]}>{t('emptyHome')}</Text>
          </View>
        )}
      </ScrollView>

      {selected && (
        <SessionDetailSheet
          session={selected}
          suggestions={categorySuggestions(sessions)}
          onSave={(patch) => saveSession(selected.id, patch)}
          onDelete={removeSession}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  elapsed: {
    ...TYPE.display,
    fontVariant: ['tabular-nums'],
    minHeight: 72,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  totalItem: {
    alignItems: 'center',
    gap: 2,
  },
  weekItem: {
    minWidth: 170,
  },
  totalLabel: {
    ...TYPE.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  earnings: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  offRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  offTotal: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  offBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  offBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nextBlock: {
    fontSize: 13,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyIcon: {
    fontSize: 40,
  },
  empty: {
    textAlign: 'center',
    lineHeight: 22,
  },
  rowPressed: {
    opacity: 0.7,
  },
});
