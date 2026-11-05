import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHouseholdMembersAdmin } from '../../features/household/useHouseholdMembersAdmin';
import { useTheme } from '../../theme';
import { CustomButton, CustomCard, InputField, ListRow, SectionHeader } from '../ui';

export type HouseholdMembersSectionProps = {
  variant?: 'full' | 'compact';
  /** When false, hides the link to Profile (use on Profile screen). */
  showProfileLink?: boolean;
  sectionTitle?: string;
  /** Info line about flat-wide updates (shown on Profile). */
  showManageInfo?: boolean;
};

export function HouseholdMembersSection({
  variant = 'full',
  showProfileLink = true,
  sectionTitle = 'Manage household',
  showManageInfo = false,
}: HouseholdMembersSectionProps) {
  const { colors, type, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const admin = useHouseholdMembersAdmin();
  const [showAdvancedId, setShowAdvancedId] = useState(false);

  if (variant === 'compact') {
    const names =
      admin.members.length > 0
        ? admin.members.map((m) => m.name).join(' · ')
        : 'Members load from the API';
    return (
      <View>
        <SectionHeader title="Household members" />
        <CustomCard>
          <ListRow
            title="Manage household members"
            subtitle={`${admin.members.length} in flat · ${names}`}
            leading={
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
                <Ionicons name="people-outline" size={18} color={colors.primary} />
              </View>
            }
            trailing={<Ionicons name="chevron-forward" size={20} color={colors.muted} />}
            onPress={() => router.push('/profile')}
          />
          <Text style={[type.caption, { color: colors.muted }]}>
            Add or rename roommates on Profile → Manage household.
          </Text>
        </CustomCard>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title={sectionTitle} />
      <CustomCard>
        {showManageInfo ? (
          <Text style={[type.body, { color: colors.muted, fontSize: 14, marginBottom: spacing.sm }]}>
            Adding people updates splits and balances for the whole flat. No separate login per roommate.
          </Text>
        ) : null}

        {!admin.envAdmin ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 48,
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[type.label, { color: colors.text }]}>Household admin mode</Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                Turn on to add or rename roommates on this device.
              </Text>
            </View>
            <Switch
              value={admin.adminMode}
              onValueChange={admin.setAdminMode}
              accessibilityLabel="Household admin mode"
            />
          </View>
        ) : (
          <Text style={[type.caption, { color: colors.muted }]}>
            Admin tools enabled via EXPO_PUBLIC_HOUSEHOLD_ADMIN.
          </Text>
        )}

        {!admin.showManage ? (
          <Text style={[type.caption, { color: colors.primary, marginTop: spacing.sm }]}>
            Enable admin mode above to see the Add roommate form.
          </Text>
        ) : null}

        {admin.members.length > 0 ? (
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            {admin.members.map((member) => (
              <ListRow
                key={member.id}
                title={member.name}
                subtitle={admin.memberSubtitle(member)}
                leading={
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
                    <Text style={[type.label, { color: colors.primary }]}>
                      {member.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                }
                trailing={
                  admin.showManage ? (
                    <Pressable
                      onPress={() => admin.openRename(member)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${member.name}`}
                      hitSlop={8}
                      style={{
                        minWidth: 48,
                        minHeight: 48,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="create-outline" size={22} color={colors.primary} />
                    </Pressable>
                  ) : null
                }
              />
            ))}
          </View>
        ) : (
          <Text style={[type.body, { color: colors.muted, marginTop: spacing.sm }]}>No members yet.</Text>
        )}

        {admin.lastAdded ? (
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            <CustomButton
              label={`Set viewing as ${admin.lastAdded.name}`}
              variant="secondary"
              size="sm"
              onPress={() => admin.setViewingAs(admin.lastAdded!)}
            />
            <CustomButton
              label={`Link as me (${admin.lastAdded.name})`}
              variant="ghost"
              size="sm"
              onPress={() => admin.linkAsMe(admin.lastAdded!)}
            />
          </View>
        ) : null}

        {showProfileLink ? (
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="link"
            style={{ marginTop: spacing.sm, minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={[type.label, { color: colors.primary }]}>
              Link your profile to a roommate → Profile
            </Text>
          </Pressable>
        ) : null}
      </CustomCard>

      {admin.showManage ? (
        <CustomCard>
          <Text style={[type.label, { color: colors.text, marginBottom: spacing.sm }]}>Add roommate</Text>
          <InputField label="Name" value={admin.name} onChangeText={admin.setName} placeholder="Sara" />
          <Pressable
            onPress={() => setShowAdvancedId((v) => !v)}
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={[type.caption, { color: colors.primary }]}>
              {showAdvancedId ? 'Hide advanced id' : 'Advanced id (optional)'}
            </Text>
          </Pressable>
          {showAdvancedId ? (
            <InputField
              label="Member id"
              value={admin.customId}
              onChangeText={admin.setCustomId}
              placeholder="M04 — auto if blank"
              autoCapitalize="none"
            />
          ) : null}
          <InputField
            label="Phone (optional)"
            value={admin.phone}
            onChangeText={admin.setPhone}
            keyboardType="phone-pad"
          />
          <InputField
            label="Email (optional)"
            value={admin.email}
            onChangeText={admin.setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField label="Notes (optional)" value={admin.notes} onChangeText={admin.setNotes} />
          <CustomButton
            label="Add roommate"
            icon="person-add-outline"
            onPress={() => void admin.handleAdd()}
            loading={admin.saving}
          />
        </CustomCard>
      ) : null}

      <Modal
        visible={admin.renameTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={() => admin.setRenameTarget(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing.lg,
              paddingBottom: spacing.lg + insets.bottom,
              gap: spacing.sm,
            }}
          >
            <Text style={[type.heading, { color: colors.text }]}>
              Edit {admin.renameTarget?.name} ({admin.renameTarget?.id})
            </Text>
            <InputField label="Name" value={admin.renameName} onChangeText={admin.setRenameName} />
            <InputField
              label="Phone"
              value={admin.renamePhone}
              onChangeText={admin.setRenamePhone}
              keyboardType="phone-pad"
            />
            <InputField
              label="Email"
              value={admin.renameEmail}
              onChangeText={admin.setRenameEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField label="Notes" value={admin.renameNotes} onChangeText={admin.setRenameNotes} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <CustomButton label="Cancel" variant="ghost" onPress={() => admin.setRenameTarget(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomButton
                  label="Save"
                  onPress={() => void admin.handleRenameSave()}
                  loading={admin.renaming}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
