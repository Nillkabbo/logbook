import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLogbook } from '@/hooks/useLogbook';
import { isBackupDue } from '@/engine/backup';
import { blockOccurring } from '@/engine/schedule';
import { useI18n } from '@/ui/i18n';
import { RADIUS, useTheme } from '@/theme';

/** The stale-export nudge; dismissable until the next launch. */
export function BackupBanner() {
  const theme = useTheme();
  const { t } = useI18n();
  const { sessions, settings, now, exportBackup } = useLogbook();
  const [dismissed, setDismissed] = useState(false);
  const [exporting, setExporting] = useState(false);
  if (dismissed || sessions.length === 0 || !isBackupDue(settings.lastExportAt, now)) return null;

  const run = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (await exportBackup()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.banner, { backgroundColor: theme.surface }, theme.cardShadow]}>
      <Text style={[styles.text, { color: theme.text }]}>{t('backupTitle')}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }, exporting && styles.disabled]}
          disabled={exporting}
          onPress={run}>
          <Text style={[styles.buttonText, { color: theme.onAccent }]}>{t('exportNow')}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)}>
          <Text style={[styles.dismiss, { color: theme.muted }]}>{t('dismiss')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** One-tap check-in while a Work block is occurring and no session runs. */
export function BlockBanner({ onCheckIn, busy }: { onCheckIn: () => void; busy: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { running, blocks, now } = useLogbook();
  const occurring = running ? null : blockOccurring(blocks, now);
  if (!occurring) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.surface }, theme.cardShadow]}>
      <Text style={[styles.text, { color: theme.text }]}>{t('blockInProgress')}</Text>
      <Pressable
        style={[styles.button, styles.selfStart, { backgroundColor: theme.accent }, busy && styles.disabled]}
        disabled={busy}
        onPress={onCheckIn}>
        <Text style={[styles.buttonText, { color: theme.onAccent }]}>{t('checkIn')}</Text>
      </Pressable>
    </View>
  );
}

/** Fast path: categorise the running session in one tap. */
export function QuickCategoryRow({
  categories,
  onPick,
  onMore,
}: {
  categories: string[];
  onPick: (category: string) => void;
  onMore: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chipRow}>
      {categories.map((category) => (
        <Pressable
          key={category}
          style={[styles.chip, { backgroundColor: theme.accentSoft }]}
          onPress={() => onPick(category)}>
          <Text style={[styles.chipText, { color: theme.accent }]}>{category}</Text>
        </Pressable>
      ))}
      <Pressable onPress={onMore}>
        <Text style={[styles.more, { color: theme.muted }]}>…</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: RADIUS.card,
    padding: 16,
    gap: 10,
  },
  text: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  dismiss: {
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  more: {
    fontSize: 16,
    paddingHorizontal: 6,
  },
});
