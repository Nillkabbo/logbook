import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        // Headerless by design: tab screens start directly with content;
        // pushed sub-screens carry their own SubScreenHeader.
        headerShown: false,
        // Web has no safe-area inset, so the bar needs explicit bottom padding
        // or the labels clip at the viewport edge.
        tabBarStyle: Platform.select({ web: { paddingBottom: 6, height: 54 } }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house', android: 'home', web: 'home' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: t('tabLogs'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'clock', android: 'schedule', web: 'history' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      {/* Pushed sub-screens: hidden from the tab bar, but inside the group so the bar stays. */}
      <Tabs.Screen name="schedule" options={{ href: null, title: t('schedule') }} />
      <Tabs.Screen name="data" options={{ href: null, title: t('data') }} />
    </Tabs>
  );
}
