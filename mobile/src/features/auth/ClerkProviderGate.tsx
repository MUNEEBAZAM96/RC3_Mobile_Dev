import { ClerkProvider } from '@clerk/clerk-expo';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { clerkPublishableKey, isClerkAuth } from './config';
import { tokenCache } from './clerkTokenCache';

export function ClerkProviderGate({ children }: { children: ReactNode }) {
  if (!isClerkAuth()) return children;

  const publishableKey = clerkPublishableKey();
  const { colors, spacing, type } = useTheme();

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background }}>
        <Text style={[type.heading, { color: colors.danger }]}>Clerk is not configured</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: spacing.sm }]}>
          Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in mobile/.env, then restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
