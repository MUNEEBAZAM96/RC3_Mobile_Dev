import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

import { FontGate } from '../src/components/layout/FontGate';
import { NetworkBanner } from '../src/components/layout/NetworkBanner';
import { LoadingScreen, Toast } from '../src/components/ui';
import { ClerkProviderGate } from '../src/features/auth/ClerkProviderGate';
import { SessionProvider, useSession } from '../src/features/auth/session';
import { NetworkProvider } from '../src/store/network';
import { OnboardingProvider, useOnboarding } from '../src/store/onboarding';
import { hydratePreferences, usePreferences } from '../src/store/preferences';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FontGate>
        <ClerkProviderGate>
          <SessionProvider>
            <OnboardingProvider>
              <NetworkProvider>
                <RootShell />
              </NetworkProvider>
            </OnboardingProvider>
          </SessionProvider>
        </ClerkProviderGate>
      </FontGate>
    </SafeAreaProvider>
  );
}

function RootShell() {
  const { isLoaded } = useSession();
  const { ready } = useOnboarding();
  const hydrated = usePreferences((state) => state.hydrated);
  const { mode } = useTheme();

  useEffect(() => {
    void hydratePreferences();
  }, []);

  if (!isLoaded || !ready || !hydrated) {
    return <LoadingScreen label="Opening the flat" />;
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NetworkBanner />
      <RootNavigator />
      <Toast />
    </>
  );
}

function RootNavigator() {
  const { onboarded } = useOnboarding();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
      <Stack.Protected guard={!onboarded} redirectTo="/(tabs)">
        <Stack.Screen name="(onboarding)/welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="assistant" options={{ title: 'Finance Assistant' }} />
        <Stack.Screen name="household-feed" options={{ title: 'Flat feed' }} />
      </Stack.Protected>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen
        name="(auth)/signup"
        options={{ headerShown: false, title: 'Create account' }}
      />
    </Stack>
  );
}
