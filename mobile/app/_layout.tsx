import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

import { FontGate } from '../src/components/layout/FontGate';
import { NetworkBanner } from '../src/components/layout/NetworkBanner';
import { LoadingScreen } from '../src/components/ui';
import { ClerkProviderGate } from '../src/features/auth/ClerkProviderGate';
import { SessionProvider, useSession } from '../src/features/auth/session';
import { NetworkProvider } from '../src/store/network';
import { OnboardingProvider, useOnboarding } from '../src/store/onboarding';
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

  if (!isLoaded || !ready) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="light" />
      <NetworkBanner />
      <RootNavigator />
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
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.primaryText,
        headerTitleStyle: { color: colors.primaryText, fontWeight: '700' },
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
      </Stack.Protected>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false, title: 'Create account' }} />
    </Stack>
  );
}
