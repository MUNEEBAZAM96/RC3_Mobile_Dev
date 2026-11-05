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

  function done() {
    router.replace('/(tabs)');
  }

  return (
    <AuthShell
      eyebrow="GharSplit"
      title="Join GharSplit"
      subtitle="Create your account, then link yourself to Ali, Ayesha or Bilal so the assistant knows whose balance it is explaining."
      footer={
        <>
          <Link
            href="/login"
            style={[type.label, { color: colors.primary, fontSize: 16, textAlign: 'center' }]}
          >
            I already have an account
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
        <ClerkSignUpForm onSuccess={done} />
      ) : (
        <>
          <Text style={[type.body, { color: colors.muted }]}>Use at least 8 characters.</Text>
          <AuthForm
            submitLabel="Create account"
            onSubmit={async (email, password) => {
              await signUp(email, password);
              done();
            }}
          />
        </>
      )}
    </AuthShell>
  );
}
