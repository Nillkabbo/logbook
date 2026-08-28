import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { BackupBanner, BlockBanner, QuickCategoryRow } from '@/components/HomeBanners';
import { CheckInToggle } from '@/components/CheckInToggle';
import { SessionDetailSheet } from '@/components/SessionDetailSheet';
import { SessionRow } from '@/components/SessionRow';
import { WeekProgress } from '@/components/WeekProgress';
import { useLogbook } from '@/hooks/useLogbook';
import { homeModel } from '@/engine/home';
import { formatDurationWords, formatTimeOfDay } from '@/engine/time';
import { formatDayLabel } from '@/engine/weeks';
import { categorySuggestions } from '@/engine/sessions';
import { nextBlockOccurrence } from '@/engine/schedule';
import type { Session } from '@/engine/types';
import { useHour12 } from '@/ui/clock';
import { useI18n } from '@/ui/i18n';
import { RADIUS, TYPE, useTheme } from '@/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, locale } = useI18n();
  const hour12 = useHour12();
  const { refresh, checkIn, checkOut, sessions, settings, now, saveSession, removeSession, blocks } =
    useLogbook();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Session | null>(null);
  // The just-ended session + a timer handle for the undo toast.
  const [undoable, setUndoable] = useState<Session | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

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
        const ended = model.running;
        await checkOut();
        // Q7: a 5s undo bar catches accidental check-outs gracefully.
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndoable(ended);
        undoTimer.current = setTimeout(() => setUndoable(null), 5000);
      } else {
        await checkIn();
      }
    } catch (error) {
      Alert.alert(t('somethingWrong'), String(error));
    } finally {
      setBusy(false);
    }
  };

  // Undo a check-out: set checkOut back to null, making it running again.
  const undoCheckOut = async () => {
    if (!undoable) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoable(null);
    await saveSession(undoable.id, {
      checkIn: undoable.checkIn,
      checkOut: null,
      note: undoable.note,
      category: undoable.category,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    <View style={[styles.screen, { backgroundColor: theme.canvas, paddingTop: Math.max(16, insets.top + 8) }]}>
      <View style={styles.header}>
        {model.running ? (
          <Text style={[styles.sinceCaption, { color: theme.muted }]}>
            {t('since')} {formatTimeOfDay(model.running.checkIn, hour12)}
          </Text>
        ) : null}
        <CheckInToggle
          running={model.running !== null}
          disabled={busy}
          onPress={onToggle}
          elapsedLabel={model.elapsedLabel}
        />
      </View>

      {runningUncategorised && (
        <QuickCategoryRow
          categories={categorySuggestions(sessions, 4)}
          onPick={setRunningCategory}
          onMore={() => setSelected(model.running)}
        />
      )}

      <Text style={[styles.dateCaption, { color: theme.muted }]}>{model.dateLabel}</Text>

      <View style={[styles.weekBars, { borderColor: theme.inset }]}>
        {model.weekDayBars.map((bar) => (
          <View key={bar.key} style={styles.weekBarCol}>
            <View
              style={[
                styles.weekBar,
                {
                  height: 4 + bar.intensity * 20,
                  backgroundColor: bar.isToday ? theme.accent : theme.inset,
                },
              ]}
            />
            {bar.isToday && (
              <View style={[styles.weekBarDot, { backgroundColor: theme.accent }]} />
            )}
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <Pressable
          accessibilityRole="button"
          style={styles.totalItem}
          onPress={() => router.push('/(tabs)/logs')}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>{t('today')}</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>{model.todayTotalLabel}</Text>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.inset }]} />
        <Pressable
          accessibilityRole="button"
          style={styles.totalItem}
          onPress={() => router.push('/(tabs)/logs')}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>{t('thisWeek')}</Text>
          <WeekProgress
            totalLabel={model.weekToDateLabel}
            targetLabel={model.weeklyTargetLabel}
            progress={model.weekProgress}
            overTarget={model.overTarget}
            overByLabel={model.overByLabel}
            off={model.off}
            emphasized
            earningsLabel={model.earningsLabel}
          />
        </Pressable>
      </View>

      <BlockBanner onCheckIn={onToggle} busy={busy} />
      <BackupBanner />

      {nextBlock && (
        <Text style={[styles.nextBlock, { color: theme.muted }]}>
          {t('nextBlock')}: {formatDayLabel(nextBlock.startsAt, locale)},{' '}
          {formatTimeOfDay(nextBlock.startsAt, hour12)}
        </Text>
      )}

      <ScrollView
        contentContainerStyle={
          model.todaySessions.length > 0 ? styles.list : styles.listEmpty
        }>
        {model.todaySessions.map((session) => (
          <Pressable
            key={session.id}
            android_ripple={{ color: theme.inset, foreground: true }}
            onPress={() => setSelected(session)}>
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

      {undoable && (
        <View style={styles.undoWrap} pointerEvents="box-none">
          <View style={[styles.undoBar, { backgroundColor: theme.text }]}>
            <Text style={[styles.undoText, { color: theme.surface }]}>
              {t('sessionEnded')} · {formatDurationWords(
                Math.floor((undoable.checkOut!.getTime() - undoable.checkIn.getTime()) / 1000),
              )}
            </Text>
            <Pressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={undoCheckOut}>
              <Text style={[styles.undoAction, { color: theme.accent }]}>{t('undo')}</Text>
            </Pressable>
          </View>
        </View>
      )}

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
    paddingTop: 40,
    paddingBottom: 32,
    gap: 8,
  },
  sinceCaption: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  dateCaption: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  weekBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  weekBarCol: {
    alignItems: 'center',
    gap: 3,
  },
  weekBar: {
    width: 10,
    borderRadius: 2,
  },
  weekBarDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
    marginBottom: 40,
  },
  totalItem: {
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 48,
  },
  totalLabel: {
    ...TYPE.caption,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  nextBlock: {
    fontSize: 13,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: 32,
  },
  list: {
    gap: 16,
    paddingBottom: 24,
  },
  listEmpty: {
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
  undoWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: RADIUS.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  undoAction: {
    fontSize: 14,
    fontWeight: '700',
  },
});
