import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { cardStyle, RADIUS, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/**
 * The Categories card: the user's managed list. Add and rename open the
 * keyboard-safe CategoryPickerModal; remove makes its Sessions uncategorised
 * (hours and earnings untouched — confirmed first). The chip lists everywhere
 * feed from this list plus usage history (engine's categoryList).
 */
export function CategorySection({
  categories,
  onAdd,
  onRename,
  onRemove,
}: {
  categories: string[];
  onAdd: (name: string) => Promise<boolean>;
  onRename: (oldName: string, newName: string) => Promise<boolean>;
  onRemove: (name: string) => Promise<void>;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  // null = closed; { mode: 'add' } | { mode: 'rename', name } drives the picker.
  const [picker, setPicker] = useState<
    { mode: 'add' } | { mode: 'rename'; name: string } | null
  >(null);

  const confirmRemove = (name: string) =>
    Alert.alert(
      t('removeCategoryConfirm'),
      t('removeCategoryBody', { name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => onRemove(name),
        },
      ],
    );

  return (
    <View style={[styles.card, cardStyle(theme)]}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{t('categories')}</Text>

      {categories.length === 0 && (
        <Text style={[styles.hint, { color: theme.muted }]}>{t('noCategories')}</Text>
      )}

      {categories.map((name) => (
        <View key={name} style={styles.row}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Pressable hitSlop={8} onPress={() => setPicker({ mode: 'rename', name })}>
            <Text style={[styles.action, { color: theme.muted }]}>{t('rename')}</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => confirmRemove(name)}>
            <Text style={[styles.remove, { color: theme.stop }]}>×</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        android_ripple={{ color: theme.inset }}
        style={styles.addButton}
        onPress={() => setPicker({ mode: 'add' })}>
        <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '500' }}>
          + {t('addCategory')}
        </Text>
      </Pressable>

      <CategoryPickerModal
        visible={picker !== null}
        title={picker?.mode === 'rename' ? t('rename') : t('addCategory')}
        initialValue={picker?.mode === 'rename' ? picker.name : ''}
        onSave={(value) =>
          picker?.mode === 'rename' ? onRename(picker.name, value) : onAdd(value)
        }
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: 24,
    gap: 8,
  },
  rowLabel: {
    fontSize: 15,
  },
  hint: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  action: {
    fontSize: 13,
    fontWeight: '500',
  },
  remove: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
});
