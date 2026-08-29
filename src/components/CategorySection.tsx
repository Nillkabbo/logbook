import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cardStyle, insetInput, RADIUS, useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/**
 * The Categories card: the user's managed list. Add pins a label; rename
 * rewrites it across every Session; remove makes its Sessions uncategorised
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
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [addError, setAddError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const submitAdd = async () => {
    const ok = await onAdd(newValue);
    if (!ok) {
      setAddError(true);
      return;
    }
    setNewValue('');
    setAddError(false);
    setAdding(false);
  };

  const submitRename = async () => {
    if (editing === null) return;
    const ok = await onRename(editing, editValue);
    if (!ok) {
      setEditValue(editing); // revert — clash or empty
      setEditing(null);
      return;
    }
    setEditing(null);
  };

  const confirmRemove = (name: string) =>
    Alert.alert(
      t('removeCategoryConfirm'),
      t('removeCategoryBody', { name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            onRemove(name);
            setEditing(null);
          },
        },
      ],
    );

  return (
    <View style={[styles.card, cardStyle(theme)]}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{t('categories')}</Text>

      {categories.length === 0 && !adding && (
        <Text style={[styles.hint, { color: theme.muted }]}>{t('noCategories')}</Text>
      )}

      {categories.map((name) =>
        editing === name ? (
          <View key={name} style={styles.editRow}>
            <TextInput
              style={[styles.input, insetInput(theme), styles.editInput, { color: theme.text }]}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              autoCapitalize="none"
              onSubmitEditing={submitRename}
            />
            <Pressable hitSlop={8} onPress={submitRename}>
              <Text style={[styles.action, { color: theme.accent }]}>{t('save')}</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setEditing(null)}>
              <Text style={[styles.action, { color: theme.muted }]}>{t('cancel')}</Text>
            </Pressable>
          </View>
        ) : (
          <View key={name} style={styles.row}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setEditing(name);
                setEditValue(name);
              }}>
              <Text style={[styles.action, { color: theme.muted }]}>{t('rename')}</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => confirmRemove(name)}>
              <Text style={[styles.remove, { color: theme.stop }]}>×</Text>
            </Pressable>
          </View>
        ),
      )}

      {adding ? (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, insetInput(theme), styles.editInput, { color: theme.text }]}
            value={newValue}
            onChangeText={(next) => {
              setNewValue(next);
              setAddError(false);
            }}
            autoFocus
            autoCapitalize="none"
            placeholder={t('categoryPlaceholderAdd')}
            placeholderTextColor={theme.muted}
            onSubmitEditing={submitAdd}
          />
          <Pressable hitSlop={8} onPress={submitAdd}>
            <Text style={[styles.action, { color: theme.accent }]}>{t('save')}</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setAdding(false);
              setAddError(false);
            }}>
            <Text style={[styles.action, { color: theme.muted }]}>{t('cancel')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          android_ripple={{ color: theme.inset }}
          style={styles.addButton}
          onPress={() => setAdding(true)}>
          <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '500' }}>
            + {t('addCategory')}
          </Text>
        </Pressable>
      )}
      {addError && <Text style={[styles.error, { color: theme.stop }]}>{t('categoryExists')}</Text>}
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
  },
  input: {
    borderRadius: RADIUS.control,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
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
  error: {
    fontSize: 14,
  },
});
