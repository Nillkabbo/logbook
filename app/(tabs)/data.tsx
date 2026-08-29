import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { SubScreenHeader } from '@/components/SubScreenHeader';
import { loadSampleData } from '@/dev/sampleData';
import { useLogbook } from '@/hooks/useLogbook';
import { cardStyle, insetInput, RADIUS, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** The Data sub-screen: CSV export and import, split out of Settings. */
export default function DataScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, locale } = useI18n();
  const { refresh, settings, sessions, exportBackup, importCsv, clearAllData } = useLogbook();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

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
        {/* Dev-only: sample data lives in Expo Go / dev builds (__DEV__), never in release. */}
        {__DEV__ && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            android_ripple={{ color: theme.muted, borderless: false }}
            style={[styles.secondary, insetInput(theme), styles.halfWidth, loading && styles.disabled]}
            disabled={loading}
            onPress={async () => {
              if (loading) return;
              setLoading(true);
              try {
                const count = await loadSampleData(8);
                await refresh();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                Alert.alert(t('data'), t('sampleLoaded', { n: count }));
              } finally {
                setLoading(false);
              }
            }}>
            <Text style={[styles.secondaryText, { color: theme.accent }]}>{t('loadSampleShort')}</Text>
          </Pressable>
          <Pressable
            android_ripple={{ color: theme.muted, borderless: false }}
            style={[styles.secondary, insetInput(theme), styles.halfWidth, loading && styles.disabled]}
            disabled={loading}
            onPress={async () => {
              if (loading) return;
              setLoading(true);
              try {
                const count = await loadSampleData(52);
                await refresh();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                Alert.alert(t('data'), t('sampleLoaded', { n: count }));
              } finally {
                setLoading(false);
              }
            }}>
            <Text style={[styles.secondaryText, { color: theme.accent }]}>{t('loadSampleLong')}</Text>
          </Pressable>
        </View>
        )}
        <Pressable
          android_ripple={{ color: theme.muted, borderless: false }}
          style={[styles.secondary, insetInput(theme), clearing && styles.disabled]}
          disabled={clearing}
          onPress={() =>
            Alert.alert(t('clearDataConfirm'), t('clearDataBody'), [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('clearDataAction'),
                style: 'destructive',
                onPress: async () => {
                  if (clearing) return;
                  setClearing(true);
                  try {
                    await clearAllData();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    Alert.alert(t('data'), t('dataCleared'));
                  } finally {
                    setClearing(false);
                  }
                },
              },
            ])
          }>
          <Text style={[styles.secondaryText, { color: theme.stop }]}>{t('clearData')}</Text>
        </Pressable>
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
  halfWidth: {
    flex: 1,
  },
});
