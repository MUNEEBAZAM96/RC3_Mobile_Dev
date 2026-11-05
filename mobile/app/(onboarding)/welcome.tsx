import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '../../src/components/layout/Screen';
import { CustomButton, CustomCard } from '../../src/components/ui';
import { useOnboarding } from '../../src/store/onboarding';
import { useTheme } from '../../src/theme';

const STEPS = [
  { title: 'Local first', body: 'Notes in this kit are stored in SQLite, so the demo works without a database server.' },
  { title: 'Auth is swappable', body: 'Sign in with the JWT API today. The Supabase client is a stub you can replace.' },
  { title: 'AI stays on the server', body: 'The app calls your API. Provider keys never ship inside the mobile build.' },
];

export default function WelcomeScreen() {
  const { colors, spacing, type } = useTheme();
  const { complete } = useOnboarding();

  async function start() {
    await complete();
    router.replace('/login');
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
        Hackathon Starter
      </Text>
      <Text style={[type.body, { color: colors.muted }]}>
        A small working shell for a mobile hackathon. Spend the event on the idea, not on setup.
      </Text>
      {STEPS.map((step) => (
        <CustomCard key={step.title}>
          <Text style={[type.heading, { color: colors.text }]}>{step.title}</Text>
          <Text style={[type.body, { color: colors.muted }]}>{step.body}</Text>
        </CustomCard>
      ))}
      <View style={{ marginTop: spacing.sm }}>
        <CustomButton label="Continue" onPress={() => void start()} />
      </View>
    </Screen>
  );
}
