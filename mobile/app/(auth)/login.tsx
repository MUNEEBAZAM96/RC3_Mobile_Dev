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

  function done() {
    router.replace('/(tabs)');
  }

  return (
    <AuthShell
      eyebrow="GharSplit"
      title="Sign in to your flat"
      subtitle="The ledger is shared with Ali, Ayesha and Bilal. Signing in sets who you are in chat and the AI assistant."
      footer={
        <>
          <Link
            href="/signup"
            style={[type.label, { color: colors.primary, fontSize: 16, textAlign: 'center' }]}
          >
            New here? Join GharSplit
          </Link>
          <Link
            href="/(tabs)"
            replace
            style={[type.label, { color: colors.muted, fontSize: 15, textAlign: 'center' }]}
          >
            Continue as guest
          </Link>
        </>
      }
    >
      {clerk ? (
        <ClerkSignInForm onSuccess={done} />
      ) : (
        <>
          <Text style={[type.body, { color: colors.muted }]}>
            Demo account {DEMO_EMAIL} / {DEMO_PASSWORD}
          </Text>
          <AuthForm
            submitLabel="Sign in"
            onSubmit={async (email, password) => {
              await signIn(email, password);
              done();
            }}
          />
        </>
      )}
    </AuthShell>
  );
}
