import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { useTheme } from '../../theme';
import { AuthDivider, CustomButton, InputField } from '../ui';
import { ClerkGoogleButton } from './ClerkGoogleButton';

const credentialsSchema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

const codeSchema = z.object({
  code: z.string().min(6, 'Enter the 6-digit code from your email.'),
});

interface ClerkSignInFormProps {
  onSuccess?: () => void;
}

export function ClerkSignInForm({ onSuccess }: ClerkSignInFormProps) {
  const { colors, spacing } = useTheme();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!isLoaded || !signIn) return;
    const parsed = credentialsSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'email' || key === 'password') && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const attempt = await signIn.create({
        identifier: parsed.data.email,
        password: parsed.data.password,
      });
      if (attempt.status === 'complete' && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        onSuccess?.();
        return;
      }
      setErrors({ form: 'Additional verification is required for this account in the Clerk Dashboard.' });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not sign in.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <ClerkGoogleButton mode="signIn" onSuccess={onSuccess} />
      <AuthDivider label="or sign in with email" />
      <InputField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholder="you@example.com"
        error={errors.email}
      />
      <InputField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="At least 8 characters"
        error={errors.password}
      />
      {errors.form ? <Text style={{ color: colors.danger }}>{errors.form}</Text> : null}
      <CustomButton label="Sign in" onPress={() => void handleSubmit()} loading={loading} disabled={!isLoaded} />
    </View>
  );
}

interface ClerkSignUpFormProps {
  onSuccess?: () => void;
}

export function ClerkSignUpForm({ onSuccess }: ClerkSignUpFormProps) {
  const { colors, spacing } = useTheme();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; code?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!isLoaded || !signUp) return;
    const parsed = credentialsSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'email' || key === 'password') && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: parsed.data.email,
        password: parsed.data.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setAwaitingCode(true);
      setErrors({ form: 'We sent a verification code to your email.' });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not create the account.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded || !signUp) return;
    const parsed = codeSchema.safeParse({ code: code.trim() });
    if (!parsed.success) {
      setErrors({ code: parsed.error.issues[0]?.message ?? 'Invalid code.' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: parsed.data.code });
      if (attempt.status === 'complete' && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        onSuccess?.();
        return;
      }
      setErrors({ form: 'Verification did not complete. Try again or request a new code in Clerk.' });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not verify the code.' });
    } finally {
      setLoading(false);
    }
  }

  if (awaitingCode) {
    return (
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.muted }}>Enter the code sent to {email.trim()}.</Text>
        <InputField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoCapitalize="none"
          placeholder="123456"
          error={errors.code}
        />
        {errors.form ? <Text style={{ color: colors.muted }}>{errors.form}</Text> : null}
        <CustomButton label="Verify email" onPress={() => void handleVerify()} loading={loading} disabled={!isLoaded} />
        <CustomButton
          label="Use a different email"
          variant="secondary"
          onPress={() => {
            setAwaitingCode(false);
            setCode('');
            setErrors({});
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <ClerkGoogleButton mode="signUp" onSuccess={onSuccess} />
      <AuthDivider label="or create with email" />
      <InputField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholder="you@example.com"
        error={errors.email}
      />
      <InputField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="At least 8 characters"
        error={errors.password}
      />
      {errors.form ? <Text style={{ color: colors.muted }}>{errors.form}</Text> : null}
      <CustomButton label="Create account" onPress={() => void handleCreate()} loading={loading} disabled={!isLoaded} />
    </View>
  );
}
