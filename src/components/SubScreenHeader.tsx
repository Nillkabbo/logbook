import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * The one header the app allows: pushed sub-screens (Schedule, Data) carry a
 * back chevron and their own title. Tab screens and modals stay headerless.
 */
export function SubScreenHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Pressable hitSlop={12} onPress={() => router.back()} style={styles.back}>
        <Text style={[styles.chevron, { color: theme.muted }]}>‹</Text>
      </Pressable>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  back: {
    width: 32,
    alignItems: 'center',
  },
  chevron: {
    fontSize: 28,
    lineHeight: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
