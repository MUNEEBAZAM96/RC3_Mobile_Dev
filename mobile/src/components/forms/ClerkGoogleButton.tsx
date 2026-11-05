import { useSSO } from '@clerk/clerk-expo';
import { AntDesign } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { CustomButton } from '../ui';

interface ClerkGoogleButtonProps {
  onSuccess?: () => void;
  mode?: 'signIn' | 'signUp';
}

export function ClerkGoogleButton({ onSuccess, mode = 'signIn' }: ClerkGoogleButtonProps) {
  const label = mode === 'signUp' ? 'Sign up with Google' : 'Sign in with Google';
  const { colors, spacing } = useTheme();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setError(null);
    setLoading(true);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy: 'oauth_google',
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        onSuccess?.();
        return;
      }
      if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') return;
      setError('Google sign-in did not finish. Enable Google in the Clerk Dashboard if you have not already.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in with Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <CustomButton label={label} variant="secondary" loading={loading} onPress={() => void handlePress()} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs }}>
        <AntDesign name="google" size={16} color={colors.muted} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={{ color: colors.muted, fontSize: 13 }}>Uses your Google account via Clerk</Text>
      </View>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}
