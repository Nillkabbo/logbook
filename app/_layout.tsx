import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { FirstLaunchSetup } from '@/components/FirstLaunchSetup';
import { LogbookProvider, useLogbook } from '@/hooks/useLogbook';
import { I18nProvider } from '@/ui/i18n';
import { initNotificationHandling } from '@/notifications/reminders';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before the first render.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
    // Foreground reminders show as banners, not silence. Lazy: on Android
    // Expo Go the notifications module is unavailable and this no-ops.
    initNotificationHandling();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LogbookProvider>
        <LocalizedApp>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <FirstLaunchSetup />
        </LocalizedApp>
      </LogbookProvider>
    </ThemeProvider>
  );
}

function LocalizedApp({ children }: { children: React.ReactNode }) {
  const { settings } = useLogbook();
  return <I18nProvider languageSetting={settings.language}>{children}</I18nProvider>;
}
