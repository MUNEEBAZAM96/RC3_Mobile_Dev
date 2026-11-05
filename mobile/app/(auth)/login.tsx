import { Link, router } from 'expo-router';
import { Text } from 'react-native';

import { AuthForm } from '../../src/components/forms/AuthForm';
import { ClerkSignInForm } from '../../src/components/forms/ClerkAuthForm';
import { AuthShell } from '../../src/components/layout/AuthShell';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../src/constants/config';
import { isClerkAuth } from '../../src/features/auth/config';
import { useSession } from '../../src/features/auth/session';
import { useTheme } from '../../src/theme';

export default function LoginScreen() {
  const { colors, type } = useTheme();
  const { signIn } = useSession();
  const clerk = isClerkAuth();

  return (
    <AuthShell
      title="Welcome back"
      subtitle={clerk ? 'Sign in with Clerk. Passwords stay off your API.' : 'Sign in to sync with the hackathon API.'}
      footer={
        <Link href="/signup" style={{ color: colors.primary, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
          Create an account
        </Link>
      }
    >
      {clerk ? (
        <ClerkSignInForm onSuccess={() => router.replace('/(tabs)')} />
      ) : (
        <>
          <Text style={[type.body, { color: colors.muted }]}>
            Demo account {DEMO_EMAIL} / {DEMO_PASSWORD}
          </Text>
          <AuthForm submitLabel="Sign in" onSubmit={signIn} />
        </>
      )}
    </AuthShell>
  );
}
