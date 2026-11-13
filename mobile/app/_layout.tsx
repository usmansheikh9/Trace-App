import { useEffect } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/theme';

// Keep the splash screen up until the fonts are ready.
void SplashScreen.preventAutoHideAsync();

// Native root view (behind every screen, and behind the transparent
// edge-to-edge status/navigation bars) paints the page colour, never white.
void SystemUI.setBackgroundColorAsync(colors.background);

// React Navigation's default theme paints containers white (card) / #F2F2F2
// (background); both become the page colour so no layer can show a seam.
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, card: colors.background },
};

function AuthGate() {
  const { state } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuth = segments[0] === '(auth)';

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status === 'signedOut' && !inAuth) router.replace('/login');
    else if (state.status === 'signedIn' && inAuth) router.replace('/');
  }, [state.status, inAuth, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError; // on error, fall back to the system font

  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null; // splash stays up

  return (
    <ThemeProvider value={navTheme}>
      <ErrorBoundary>
        <KeyboardProvider>
          <AuthProvider>
            {/* Dark icons. Android is edge-to-edge, so the bar is transparent and the page shows through. */}
            <StatusBar style="dark" />
            <AuthGate />
            <Stack
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              {/* Entering the app after sign-in / approval settles in rather than pushes. */}
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
            </Stack>
          </AuthProvider>
        </KeyboardProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
