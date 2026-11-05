import { useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { CustomButton, InputField } from '../ui';
import { useTheme } from '../../theme';

const credentialsSchema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

interface AuthFormProps {
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function AuthForm({ submitLabel, onSubmit }: AuthFormProps) {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
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
      await onSubmit(parsed.data.email, parsed.data.password);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not sign in.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
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
      <CustomButton label={submitLabel} onPress={() => void handleSubmit()} loading={loading} />
    </View>
  );
}
