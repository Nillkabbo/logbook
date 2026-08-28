import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { FirstLaunchSetup } from '@/components/FirstLaunchSetup';
import { LogbookProvider } from '@/hooks/useLogbook';
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

// Foreground notifications (the check-in reminder) show as banners, not silence.
initNotificationHandling();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LogbookProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <FirstLaunchSetup />
      </LogbookProvider>
    </ThemeProvider>
  );
}
