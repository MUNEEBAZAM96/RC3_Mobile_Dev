import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '../../src/components/household/motion';
import { Screen } from '../../src/components/layout/Screen';
import { CustomButton, CustomCard } from '../../src/components/ui';
import { useOnboarding } from '../../src/store/onboarding';
import { useTheme } from '../../src/theme';
import { formatPkr } from '../../src/utils/currency';

const ROOMMATES = [
  { id: 'M01', name: 'Ali' },
  { id: 'M02', name: 'Ayesha' },
  { id: 'M03', name: 'Bilal' },
] as const;

const PILLARS = [
  {
    icon: 'cart-outline',
    title: 'One shopping list',
    body: 'Add milk, rice and supplies. Whoever buys them checks out and the bill is split automatically.',
  },
  {
    icon: 'receipt-outline',
    title: 'Fair splits in PKR',
    body: 'Equal or custom shares, exact to the paisa. Internet, electricity, cleaning: nothing gets logged twice.',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Settle in one tap',
    body: 'See who owes whom, record cash payments, and keep the household at PKR 0.00.',
  },
] as const;

export default function WelcomeScreen() {
  const { colors, spacing, type, radius, minTapTarget } = useTheme();
  const insets = useSafeAreaInsets();
  const { complete } = useOnboarding();
  const [entering, setEntering] = useState(false);

  async function enterFlat() {
    if (entering) return;
    setEntering(true);
    try {
      await complete();
      router.replace('/(tabs)');
    } finally {
      setEntering(false);
    }
  }

  async function signIn() {
    await complete();
    router.push('/login');
  }

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      {/* Hero */}
      <Animated.View entering={enterRise(0)}>
        <CustomCard tone="hero" elevated style={{ gap: spacing.md, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="home" size={22} color={colors.heroText} />
            </View>
            <View>
              <Text style={[type.caption, { color: colors.heroText, opacity: 0.8 }]}>
                FLAT LEDGER · LAHORE
              </Text>
              <Text accessibilityRole="header" style={[type.title, { color: colors.heroText }]}>
                GharSplit
              </Text>
            </View>
          </View>
          <Text style={[type.body, { color: colors.heroText, opacity: 0.92 }]}>
            Three roommates, one apartment, one shared budget of {formatPkr(5000)} a month.
            Groceries, bills and settlements in a single dependable place.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {ROOMMATES.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: radius.full,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.heroText,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[type.caption, { color: colors.hero, fontSize: 10 }]}>
                    {m.name[0]}
                  </Text>
                </View>
                <Text style={[type.caption, { color: colors.heroText }]}>
                  {m.name} · {m.id}
                </Text>
              </View>
            ))}
          </View>
        </CustomCard>
      </Animated.View>

      {PILLARS.map((p, index) => (
        <Animated.View key={p.title} entering={enterRise(index + 1)}>
          <CustomCard>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={p.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.heading, { color: colors.text, fontSize: 17 }]}>{p.title}</Text>
                <Text style={[type.body, { color: colors.muted, fontSize: 15 }]}>{p.body}</Text>
              </View>
            </View>
          </CustomCard>
        </Animated.View>
      ))}

      <Animated.View entering={enterRise(4)} style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <CustomButton
          label="Enter the flat"
          icon="arrow-forward"
          onPress={() => void enterFlat()}
          loading={entering}
          disabled={entering}
        />
        <Pressable
          onPress={() => void signIn()}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={{ minHeight: minTapTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={[type.label, { color: colors.primary, fontSize: 15 }]}>Sign in</Text>
        </Pressable>
        <Text style={[type.caption, { color: colors.muted, textAlign: 'center' }]}>
          The ledger is shared. Signing in only sets who you are in chat and the AI assistant.
        </Text>
      </Animated.View>
    </Screen>
  );
}
