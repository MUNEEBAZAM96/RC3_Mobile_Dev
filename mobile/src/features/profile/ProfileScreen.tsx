import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppHeader, Avatar, CustomButton, CustomCard, StatusBadge } from '../../components/ui';
import type { AuthUser } from '../auth/types';
import { isClerkAuth } from '../auth/config';
import { useSession } from '../auth/session';
import { api } from '../../services/api/client';
import { useTheme } from '../../theme';

export function ProfileScreen() {
  const { colors, spacing, type } = useTheme();
  const { claims, isSignedIn, signOut } = useSession();
  const [appUser, setAppUser] = useState<AuthUser | null>(null);
  const email = appUser?.email ?? claims?.email ?? 'Signed in';
  const role = appUser?.role ?? claims?.role ?? 'user';
  const clerk = isClerkAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setAppUser(null);
      return;
    }
    void api.me().then((response) => setAppUser(response.user)).catch(() => setAppUser(null));
  }, [isSignedIn, claims?.sub]);

  return (
    <Screen>
      <AppHeader
        title="Profile"
        subtitle={clerk ? 'Signed in with Clerk. App profile syncs on GET /api/v1/me.' : 'Account stored as a JWT on this device'}
      />
      <CustomCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar label={email} size={56} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={[type.heading, { color: colors.text }]}>{email}</Text>
            <StatusBadge label={role} tone="neutral" />
          </View>
        </View>
      </CustomCard>
      <CustomButton label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
      <CustomButton label="MobiKit Playground" variant="secondary" onPress={() => router.push('/playground')} />
      <CustomButton label="Sign out" variant="danger" onPress={() => void signOut()} />
    </Screen>
  );
}
