import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { HouseholdMembersSection, MemberSegmentedControl } from '../src/components/household';
import { hasSeenAdminHint, markAdminHintSeen } from '../src/features/household/adminHint';
import { isHouseholdAdminEnvEnabled } from '../src/constants/householdAdmin';
import { Screen } from '../src/components/layout/Screen';
import { Avatar, CustomButton, CustomCard, SectionHeader, StatusPill } from '../src/components/ui';
import { isClerkAuth } from '../src/features/auth/config';
import { useSession } from '../src/features/auth/session';
import { api } from '../src/services/api/client';
import { useHouseholdStore } from '../src/store/household';
import { usePreferences } from '../src/store/preferences';
import { showToast } from '../src/store/toast';
import { useTheme } from '../src/theme';
import { errorMessage } from '../src/utils/format';

export default function ProfileScreen() {
  const { colors, spacing, type, radius } = useTheme();
  const { isSignedIn, claims, signOut } = useSession();
  const { members, loadMembers, setActiveMemberId } = useHouseholdStore();
  const linkedMemberId = usePreferences((s) => s.linkedMemberId);
  const setLinkedMemberId = usePreferences((s) => s.setLinkedMemberId);
  const setPromptDone = usePreferences((s) => s.setLinkedMemberPromptDone);
  const householdAdminMode = usePreferences((s) => s.householdAdminMode);
  const [signingOut, setSigningOut] = useState(false);
  const [showAdminHint, setShowAdminHint] = useState(false);
  const [apiSync, setApiSync] = useState<'idle' | 'ok' | 'error'>('idle');
  const [apiSyncMessage, setApiSyncMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadMembers(true);
    }, [loadMembers]),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isHouseholdAdminEnvEnabled() || householdAdminMode) return;
      const seen = await hasSeenAdminHint();
      if (cancelled || seen) return;
      if (members.length === 3) setShowAdminHint(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [members.length, householdAdminMode]);

  async function dismissAdminHint() {
    setShowAdminHint(false);
    await markAdminHintSeen();
  }

  useEffect(() => {
    if (!isSignedIn) {
      setApiSync('idle');
      setApiSyncMessage(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await api.me();
        if (!cancelled) {
          setApiSync('ok');
          setApiSyncMessage('Synced with GET /api/v1/me.');
        }
      } catch (err) {
        if (!cancelled) {
          setApiSync('error');
          setApiSyncMessage(
            errorMessage(
              err,
              'Could not reach the API account. Check CLERK_SECRET_KEY on the server and Settings URL.',
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const email = claims?.email && claims.email.length > 0 ? claims.email : null;
  const linked = members.find((m) => m.id === linkedMemberId);

  function link(memberId: string) {
    setLinkedMemberId(memberId);
    setActiveMemberId(memberId);
    setPromptDone(true);
    const name = members.find((m) => m.id === memberId)?.name ?? memberId;
    showToast(`You are ${name} in chat and the assistant.`);
  }

  function unlink() {
    setLinkedMemberId(null);
    showToast('Roommate identity cleared.', 'info');
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      showToast('Signed out.', 'info');
      router.back();
    } catch (err) {
      showToast(errorMessage(err, 'Could not sign out.'), 'danger');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <CustomCard elevated>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar label={linked?.name ?? email ?? 'Guest'} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[type.heading, { color: colors.text }]} numberOfLines={1}>
              {linked?.name ?? (isSignedIn ? 'Roommate not linked' : 'Guest')}
            </Text>
            <Text style={[type.body, { color: colors.muted, fontSize: 14 }]} numberOfLines={1}>
              {isSignedIn
                ? (email ?? 'Signed in')
                : 'Sign in from Settings to set your chat identity'}
            </Text>
            {linked?.phone || linked?.email ? (
              <Text style={[type.caption, { color: colors.muted }]} numberOfLines={2}>
                {[linked.phone, linked.email].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
              <StatusPill
                label={isSignedIn ? (isClerkAuth() ? 'Clerk account' : 'JWT account') : 'Guest'}
                tone={isSignedIn ? 'primary' : 'neutral'}
                size="sm"
              />
              {linked ? (
                <StatusPill label={linked.id} tone="success" size="sm" icon="link" />
              ) : null}
            </View>
            {apiSyncMessage ? (
              <Text
                style={[
                  type.caption,
                  {
                    color: apiSync === 'error' ? colors.danger : colors.muted,
                    marginTop: 4,
                  },
                ]}
                numberOfLines={3}
              >
                {apiSyncMessage}
              </Text>
            ) : null}
          </View>
        </View>
      </CustomCard>

      <View>
        <SectionHeader title="Roommate identity" />
        <CustomCard>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
              backgroundColor: colors.primarySoft,
              borderRadius: radius.lg,
              padding: spacing.sm + 4,
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <Text style={[type.body, { color: colors.text, flex: 1, fontSize: 14 }]}>
              This is who you are in chat and the AI assistant. The Home &ldquo;Viewing as&rdquo;
              picker can still be changed anytime.
            </Text>
          </View>
          {members.length > 0 ? (
            <MemberSegmentedControl
              members={members}
              activeMemberId={linkedMemberId}
              onSelect={link}
            />
          ) : (
            <Text style={[type.body, { color: colors.muted }]}>
              Members load from the API. Check the base URL in Settings.
            </Text>
          )}
          {linkedMemberId ? (
            <CustomButton label="Clear identity" variant="ghost" size="sm" onPress={unlink} />
          ) : null}
        </CustomCard>
      </View>

      {showAdminHint ? (
        <CustomCard>
          <Text style={[type.body, { color: colors.text, fontSize: 14 }]}>
            Enable admin mode below to add a 4th roommate (demo operator).
          </Text>
          <CustomButton label="Got it" variant="secondary" size="sm" onPress={() => void dismissAdminHint()} />
        </CustomCard>
      ) : null}

      <HouseholdMembersSection variant="full" showProfileLink={false} showManageInfo />

      <View style={{ gap: spacing.sm }}>
        <CustomButton
          label="Settings"
          icon="settings-outline"
          variant="secondary"
          onPress={() => router.push('/settings')}
        />
        <CustomButton
          label="Finance Assistant"
          icon="sparkles-outline"
          variant="secondary"
          onPress={() => router.push('/assistant')}
        />
        {isSignedIn ? (
          <CustomButton
            label="Sign out"
            icon="log-out-outline"
            variant="danger"
            onPress={() => void handleSignOut()}
            loading={signingOut}
            disabled={signingOut}
          />
        ) : (
          <CustomButton
            label="Sign in"
            icon="log-in-outline"
            onPress={() => router.push('/login')}
          />
        )}
      </View>
    </Screen>
  );
}
