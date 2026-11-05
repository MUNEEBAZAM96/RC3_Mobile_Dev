import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useHouseholdStore } from '../../store/household';
import { usePreferences } from '../../store/preferences';
import { showToast } from '../../store/toast';
import { useTheme } from '../../theme';
import type { Member } from '../../types/household';
import { MemberSegmentedControl } from '../household/MemberSegmentedControl';
import { BottomSheet, CustomButton } from '../ui';

interface LinkRoommateModalProps {
  visible: boolean;
  members: Member[];
  onClose: () => void;
}

/**
 * One-time prompt after the first sign-in: "which roommate are you?"
 * Saves the choice to preferences (chat / AI identity) and syncs Home's "Viewing as".
 */
export function LinkRoommateModal({ visible, members, onClose }: LinkRoommateModalProps) {
  return (
    <BottomSheet visible={visible} title="Which roommate are you?" onClose={onClose}>
      {visible ? <LinkRoommateForm members={members} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function LinkRoommateForm({ members, onClose }: Omit<LinkRoommateModalProps, 'visible'>) {
  const { colors, spacing, type, radius } = useTheme();
  const activeMemberId = useHouseholdStore((s) => s.activeMemberId);
  const setActiveMemberId = useHouseholdStore((s) => s.setActiveMemberId);
  const setLinkedMemberId = usePreferences((s) => s.setLinkedMemberId);
  const setPromptDone = usePreferences((s) => s.setLinkedMemberPromptDone);
  const [choice, setChoice] = useState<string | null>(activeMemberId ?? members[0]?.id ?? null);

  function confirm() {
    if (!choice) return;
    setLinkedMemberId(choice);
    setActiveMemberId(choice);
    setPromptDone(true);
    const name = members.find((m) => m.id === choice)?.name ?? choice;
    showToast(`Linked to ${name}. The assistant will speak to you as ${name}.`);
    onClose();
  }

  function skip() {
    setPromptDone(true);
    onClose();
  }

  return (
    <View style={{ gap: spacing.md }}>
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
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[type.body, { color: colors.text, flex: 1, fontSize: 14 }]}>
          This sets who you are in chat and the AI assistant. The Home &ldquo;Viewing as&rdquo;
          picker can still be changed anytime.
        </Text>
      </View>
      <MemberSegmentedControl members={members} activeMemberId={choice} onSelect={setChoice} />
      <CustomButton
        label="Link my identity"
        icon="link-outline"
        onPress={confirm}
        disabled={!choice}
      />
      <CustomButton label="Not now" variant="ghost" onPress={skip} />
    </View>
  );
}
