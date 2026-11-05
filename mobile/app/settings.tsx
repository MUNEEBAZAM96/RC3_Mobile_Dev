import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '../src/components/layout/Screen';
import {
  CustomButton,
  CustomCard,
  InputField,
  ListRow,
  QuickChipRow,
  SectionHeader,
  SegmentedControl,
  StatusPill,
} from '../src/components/ui';
import { getLastLanApiUrl, setLastLanApiUrl } from '../src/services/storage/lastLanApi';
import { useSession } from '../src/features/auth/session';
import { HouseholdMembersSection } from '../src/components/household/HouseholdMembersSection';
import { householdApi } from '../src/services/api/household';
import { getBaseUrl, setBaseUrl } from '../src/services/storage/baseUrl';
import { useActivityFeed } from '../src/store/activityFeed';
import { useHouseholdStore } from '../src/store/household';
import { usePreferences, type ColorModePreference } from '../src/store/preferences';
import { showToast } from '../src/store/toast';
import { useTheme } from '../src/theme';
import type { BudgetSummary } from '../src/types/household';
import { formatPkr } from '../src/utils/currency';
import { errorMessage } from '../src/utils/format';

const COLOR_MODES = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
] as const satisfies readonly {
  value: ColorModePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[];

const FLAT_NAME = 'GharSplit — Gulberg flat';

export default function SettingsScreen() {
  const { colors, type, spacing, radius, mode } = useTheme();
  const { isSignedIn, claims, signOut } = useSession();
  const colorMode = usePreferences((s) => s.colorMode);
  const setColorMode = usePreferences((s) => s.setColorMode);
  const linkedMemberId = usePreferences((s) => s.linkedMemberId);
  const resetAppearance = usePreferences((s) => s.resetAppearance);
  const clearFeed = useActivityFeed((s) => s.clear);
  const { members, loadMembers } = useHouseholdStore();

  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getBaseUrl()
      .then(setUrl)
      .catch(() => undefined);
    getLastLanApiUrl()
      .then((saved) => {
        if (saved) setUrl((current) => (current ? current : saved));
      })
      .catch(() => undefined);
    householdApi
      .getBudgetSummary()
      .then((summary) => {
        setBudget(summary);
        setBudgetError(null);
      })
      .catch((err: unknown) => setBudgetError(errorMessage(err, 'Budget unavailable.')));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMembers(true);
    }, [loadMembers]),
  );

  const flatMemberSubtitle = useMemo(() => {
    if (members.length === 0) return 'Open Profile to manage members';
    const names = members.map((m) => m.name).join(' · ');
    if (names.length > 48) {
      return `${members.length} members · ${names.slice(0, 45)}…`;
    }
    return names;
  }, [members]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await setBaseUrl(url);
      await setLastLanApiUrl(url);
      const healthy = await householdApi.pingHealth();
      if (healthy) {
        setNotice('Saved. The API answered /health.');
      } else {
        await householdApi.getMembers();
        setNotice('Saved. Household API is reachable.');
      }
      const summary = await householdApi.getBudgetSummary();
      setBudget(summary);
      setBudgetError(null);
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Could not reach that address. Use http://127.0.0.1:8080 on the simulator, or your Mac LAN IP on a physical device (same Wi‑Fi, port 8080).',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      showToast('Signed out.', 'info');
    } catch (err) {
      showToast(errorMessage(err, 'Could not sign out.'), 'danger');
    } finally {
      setSigningOut(false);
    }
  }

  const version = Constants.expoConfig?.version ?? '0.1.0';
  const email = claims?.email && claims.email.length > 0 ? claims.email : 'Signed in';

  return (
    <Screen>
      {/* Connection */}
      <View>
        <SectionHeader title="Connection" />
        <CustomCard>
          <Text style={[type.body, { color: colors.muted, fontSize: 14 }]}>
            Use your computer&apos;s LAN IP when the phone is not on the simulator, for example
            http://192.168.1.20:8080.
          </Text>
          <InputField
            label="API base URL"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="http://127.0.0.1:8080"
          />
          <QuickChipRow
            label="Quick connect"
            options={[
              { id: 'sim', label: 'Simulator', icon: 'phone-portrait-outline', sublabel: ':8080' },
              { id: 'lan', label: 'Last LAN', icon: 'wifi-outline', sublabel: 'physical device' },
            ]}
            onSelect={(id) => {
              if (id === 'sim') setUrl('http://127.0.0.1:8080');
              else {
                void getLastLanApiUrl().then((saved) => {
                  if (saved) setUrl(saved);
                  else showToast('Save a LAN URL once — we’ll remember it here.', 'info');
                });
              }
            }}
          />
          <CustomButton
            label="Save and test"
            icon="pulse-outline"
            onPress={() => void save()}
            loading={saving}
            disabled={saving}
          />
          {notice ? <Text style={[type.caption, { color: colors.success }]}>{notice}</Text> : null}
          {error ? <Text style={[type.caption, { color: colors.danger }]}>{error}</Text> : null}
        </CustomCard>
      </View>

      {/* Appearance */}
      <View>
        <SectionHeader title="Appearance" />
        <CustomCard>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={[type.label, { color: colors.text, fontSize: 15 }]}>Theme</Text>
            <StatusPill
              label={mode === 'dark' ? 'Dark now' : 'Light now'}
              tone="neutral"
              size="sm"
              icon={mode === 'dark' ? 'moon' : 'sunny'}
            />
          </View>
          <SegmentedControl
            options={COLOR_MODES}
            value={colorMode}
            onChange={setColorMode}
            accessibilityLabel="Theme"
          />
          <ListRow
            title="Colour style"
            subtitle="GharSplit · teal and slate"
            leading={<Swatch color={colors.primary} />}
            trailing={<Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
          />
          <Text style={[type.caption, { color: colors.muted }]}>
            Saved on this phone and restored on the next launch.
          </Text>
        </CustomCard>
      </View>

      {/* Household */}
      <View>
        <SectionHeader title="Household" />
        <CustomCard>
          <ListRow
            title={FLAT_NAME}
            subtitle={flatMemberSubtitle}
            leading={<IconBubble name="home-outline" />}
          />
          <ListRow
            title="Monthly budget"
            subtitle={
              budgetError ??
              (budget
                ? `${formatPkr(budget.total_spending)} spent · ${formatPkr(budget.remaining)} left`
                : 'Loading…')
            }
            leading={<IconBubble name="wallet-outline" />}
            trailing={
              <Text style={[type.label, { color: colors.text }]}>
                {formatPkr(budget?.monthly_budget ?? 5000)}
              </Text>
            }
          />
          {budget ? (
            <StatusPill
              label={budget.status}
              tone={
                /near/i.test(budget.status)
                  ? 'warning'
                  : budget.percent_used > 100
                    ? 'danger'
                    : 'success'
              }
              size="sm"
            />
          ) : null}
        </CustomCard>
      </View>

      <HouseholdMembersSection variant="compact" />

      {/* Account */}
      <View>
        <SectionHeader title="Account" />
        <CustomCard>
          {isSignedIn ? (
            <>
              <ListRow
                title={email}
                subtitle={
                  linkedMemberId
                    ? `Roommate identity: ${linkedMemberId}`
                    : 'Roommate identity not linked yet'
                }
                leading={<IconBubble name="person-circle-outline" />}
                trailing={<Ionicons name="chevron-forward" size={20} color={colors.muted} />}
                onPress={() => router.push('/profile')}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <CustomButton
                    label="Profile"
                    icon="person-outline"
                    variant="secondary"
                    onPress={() => router.push('/profile')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomButton
                    label="Sign out"
                    icon="log-out-outline"
                    variant="ghost"
                    onPress={() => void handleSignOut()}
                    loading={signingOut}
                    disabled={signingOut}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <ListRow
                title="Guest"
                subtitle="You can use the whole ledger without an account."
                leading={<IconBubble name="person-outline" />}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <CustomButton
                    label="Sign in"
                    icon="log-in-outline"
                    onPress={() => router.push('/login')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomButton
                    label="Create account"
                    variant="secondary"
                    onPress={() => router.push('/signup')}
                  />
                </View>
              </View>
            </>
          )}
          <Text style={[type.caption, { color: colors.muted }]}>
            Ledger is shared; signing in is for your identity in chat and the AI assistant.
          </Text>
        </CustomCard>
      </View>

      {/* About */}
      <View>
        <SectionHeader title="About" />
        <CustomCard>
          <ListRow
            title="GharSplit"
            subtitle="Flat ledger — Lahore"
            leading={<IconBubble name="information-circle-outline" />}
            trailing={<Text style={[type.caption, { color: colors.muted }]}>v{version}</Text>}
          />
          <ListRow
            title="Team"
            subtitle="RC3 Mobile App Development · Riphah 2026"
            leading={<IconBubble name="people-outline" />}
          />
          <ListRow
            title="Stack"
            subtitle="Expo Router · Fastify REST API · PKR paisa-exact splits"
            leading={<IconBubble name="code-slash-outline" />}
          />
        </CustomCard>
      </View>

      {/* Developer */}
      <View>
        <SectionHeader title="Developer" />
        <CustomCard>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <CustomButton
                label="Reset appearance"
                variant="secondary"
                size="sm"
                onPress={() => {
                  resetAppearance();
                  showToast('Appearance reset to system.', 'info');
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                label="Clear flat feed"
                variant="secondary"
                size="sm"
                onPress={() => {
                  clearFeed();
                  showToast('Local activity cleared.', 'info');
                }}
              />
            </View>
          </View>
          <Text style={[type.caption, { color: colors.muted }]}>
            Only touches this phone. Nothing on the API changes.
          </Text>
        </CustomCard>
      </View>

      <View style={{ height: radius.xl }} />
    </Screen>
  );
}

function IconBubble({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={18} color={colors.primary} />
    </View>
  );
}

function Swatch({ color }: { color: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: colors.border,
      }}
    />
  );
}
