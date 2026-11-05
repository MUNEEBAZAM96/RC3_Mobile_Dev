import { useCallback, useState } from 'react';

import { isHouseholdAdminEnvEnabled } from '../../constants/householdAdmin';
import { memberCreateSchema, memberUpdateSchema } from './schemas';
import { householdApi } from '../../services/api/household';
import { useHouseholdStore } from '../../store/household';
import { usePreferences } from '../../store/preferences';
import { showToast } from '../../store/toast';
import type { Member } from '../../types/household';
import { errorMessage } from '../../utils/format';

export function useHouseholdMembersAdmin() {
  const envAdmin = isHouseholdAdminEnvEnabled();
  const adminMode = usePreferences((s) => s.householdAdminMode);
  const setAdminMode = usePreferences((s) => s.setHouseholdAdminMode);
  const setLinkedMemberId = usePreferences((s) => s.setLinkedMemberId);
  const setLinkedMemberPromptDone = usePreferences((s) => s.setLinkedMemberPromptDone);
  const { members, loadMembers, setActiveMemberId } = useHouseholdStore();

  const showManage = envAdmin || adminMode;

  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastAdded, setLastAdded] = useState<Member | null>(null);

  const [renameTarget, setRenameTarget] = useState<Member | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renamePhone, setRenamePhone] = useState('');
  const [renameEmail, setRenameEmail] = useState('');
  const [renameNotes, setRenameNotes] = useState('');
  const [renaming, setRenaming] = useState(false);

  const memberSubtitle = useCallback((member: Member) => {
    const parts = [member.id];
    if (member.phone) parts.push(member.phone);
    if (member.email) parts.push(member.email);
    return parts.join(' · ');
  }, []);

  const refreshMembers = useCallback(async () => {
    await loadMembers(true);
  }, [loadMembers]);

  async function handleAdd() {
    if (saving) return;
    const parsed = memberCreateSchema.safeParse({
      name,
      id: customId.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? 'Check the form.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const member = await householdApi.createMember(parsed.data);
      await loadMembers(true);
      setLastAdded(member);
      setName('');
      setCustomId('');
      setPhone('');
      setEmail('');
      setNotes('');
      showToast(`${member.name} (${member.id}) added`, 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not add member.'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  function openRename(member: Member) {
    setRenameTarget(member);
    setRenameName(member.name);
    setRenamePhone(member.phone ?? '');
    setRenameEmail(member.email ?? '');
    setRenameNotes(member.notes ?? '');
  }

  async function handleRenameSave() {
    if (!renameTarget || renaming) return;
    const parsed = memberUpdateSchema.safeParse({
      name: renameName,
      phone: renamePhone.trim() || null,
      email: renameEmail.trim() || null,
      notes: renameNotes.trim() || null,
    });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? 'Check the form.', 'danger');
      return;
    }
    setRenaming(true);
    try {
      await householdApi.updateMember(renameTarget.id, parsed.data);
      await loadMembers(true);
      showToast('Member updated.', 'success');
      setRenameTarget(null);
    } catch (err) {
      showToast(errorMessage(err, 'Could not update member.'), 'danger');
    } finally {
      setRenaming(false);
    }
  }

  function setViewingAs(member: Member) {
    setActiveMemberId(member.id);
    showToast(`Viewing as ${member.name}.`, 'info');
  }

  function linkAsMe(member: Member) {
    setLinkedMemberId(member.id);
    setActiveMemberId(member.id);
    setLinkedMemberPromptDone(true);
    showToast(`You are ${member.name} in chat and the assistant.`);
  }

  return {
    envAdmin,
    adminMode,
    setAdminMode,
    members,
    showManage,
    memberSubtitle,
    refreshMembers,
    name,
    setName,
    customId,
    setCustomId,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    saving,
    lastAdded,
    handleAdd,
    openRename,
    renameTarget,
    setRenameTarget,
    renameName,
    setRenameName,
    renamePhone,
    setRenamePhone,
    renameEmail,
    setRenameEmail,
    renameNotes,
    setRenameNotes,
    renaming,
    handleRenameSave,
    setViewingAs,
    linkAsMe,
  };
}
