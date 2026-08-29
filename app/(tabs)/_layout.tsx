import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

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
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarStyle: {
          borderTopWidth: 0,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          shadowColor: '#18181B',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
          elevation: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house', android: 'home' }}
              tintColor={color}
              size={24}
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
              name={{ ios: 'clock', android: 'schedule' }}
              tintColor={color}
              size={24}
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
              name={{ ios: 'gearshape', android: 'settings' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('insights'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.bar', android: 'insights', web: 'insights' }}
              tintColor={color}
              size={24}
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
