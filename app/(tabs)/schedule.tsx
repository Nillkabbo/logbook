import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ScheduleEditor } from '@/components/ScheduleEditor';
import { SubScreenHeader } from '@/components/SubScreenHeader';
import { useLogbook } from '@/hooks/useLogbook';
import { useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/** The Schedule sub-screen: the work-block list and add form, split out of Settings. */
export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();
  const { refresh, blocks, addBlock, removeBlock } = useLogbook();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title={t('schedule')} />
      <ScheduleEditor blocks={blocks} onAdd={addBlock} onRemove={removeBlock} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
});
