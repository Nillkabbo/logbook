import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { SubScreenHeader } from '@/components/SubScreenHeader';
import { useLogbook } from '@/hooks/useLogbook';
import { cardStyle, insetInput, RADIUS, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** The Data sub-screen: CSV export and import, split out of Settings. */
export default function DataScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, locale } = useI18n();
  const { refresh, settings, sessions, exportBackup, importCsv } = useLogbook();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

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
        t('importedNSessions', { n: result.toImport.length }) +
          '\n' +
          t('skippedCounts', {
            duplicates: result.duplicates,
            running: result.skippedRunning,
            malformed: result.malformed,
          }),
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

  // Derived from the persisted last-export timestamp; null reads as never exported.
  const lastExportLabel =
    settings.lastExportAt === null
      ? t('lastExportNever')
      : t('lastExport', {
          date: new Date(settings.lastExportAt).toLocaleDateString(locale),
        });

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas, paddingTop: insets.top + 8 }}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      <SubScreenHeader title={t('data')} />

      <View style={[styles.card, cardStyle(theme)]}>
        <Pressable
          android_ripple={{ color: theme.muted, borderless: false }}
          style={[styles.primary, { backgroundColor: theme.accent }, exporting && styles.disabled]}
          disabled={exporting}
          onPress={exportCsv}>
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>{t('exportAll')}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.muted }]}>{t('exportHint')}</Text>
        <Text style={[styles.hint, styles.numeric, { color: theme.muted }]}>{lastExportLabel}</Text>
      </View>

      <View style={[styles.card, cardStyle(theme)]}>
        <Pressable
          android_ripple={{ color: theme.muted, borderless: false }}
          style={[styles.secondary, insetInput(theme), importing && styles.disabled]}
          disabled={importing}
          onPress={importFromCsv}>
          <Text style={[styles.secondaryText, { color: theme.text }]}>{t('importBackup')}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.muted }]}>{t('importHint')}</Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    borderRadius: RADIUS.card,
    padding: 24,
    gap: 16,
  },
  primary: {
    borderRadius: RADIUS.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    borderRadius: RADIUS.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
  },
  numeric: {
    fontVariant: ['tabular-nums'],
  },
  disabled: {
    opacity: 0.6,
  },
});
