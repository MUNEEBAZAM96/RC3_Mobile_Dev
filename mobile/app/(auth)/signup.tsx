import { Link, router } from 'expo-router';
import { Text } from 'react-native';

import { AuthForm } from '../../src/components/forms/AuthForm';
import { ClerkSignUpForm } from '../../src/components/forms/ClerkAuthForm';
import { AuthShell } from '../../src/components/layout/AuthShell';
import { isClerkAuth } from '../../src/features/auth/config';
import { useSession } from '../../src/features/auth/session';
import { useTheme } from '../../src/theme';

export default function SignupScreen() {
  const { colors, type } = useTheme();
  const { signUp } = useSession();
  const clerk = isClerkAuth();

  return (
    <AuthShell
      title="Create account"
      subtitle={clerk ? 'Clerk stores credentials. Postgres stores your app profile after the first API call.' : 'Passwords are hashed on the API. This phone only stores the JWT.'}
      footer={
        <Link href="/login" style={{ color: colors.primary, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
          I already have an account
        </Link>
      }
    >
      {clerk ? (
        <ClerkSignUpForm onSuccess={() => router.replace('/(tabs)')} />
      ) : (
        <>
          <Text style={[type.body, { color: colors.muted }]}>Use at least 8 characters.</Text>
          <AuthForm submitLabel="Create account" onSubmit={signUp} />
        </>
      )}
    </AuthShell>
  );
}
