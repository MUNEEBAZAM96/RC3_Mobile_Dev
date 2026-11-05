import { create } from 'zustand';

import { householdApi } from '../services/api/household';
import type { Member } from '../types/household';

interface HouseholdState {
  members: Member[];
  membersLoaded: boolean;
  membersLoading: boolean;
  membersError: string | null;
  activeMemberId: string | null;
  setActiveMemberId: (id: string) => void;
  loadMembers: (force?: boolean) => Promise<void>;
}

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  members: [],
  membersLoaded: false,
  membersLoading: false,
  membersError: null,
  activeMemberId: null,
  setActiveMemberId: (id) => set({ activeMemberId: id }),
  loadMembers: async (force = false) => {
    if (get().membersLoading) return;
    if (get().membersLoaded && !force) return;
    set({ membersLoading: true, membersError: null });
    try {
      const members = await householdApi.getMembers();
      const activeMemberId = get().activeMemberId ?? members.find((m) => m.id === 'M01')?.id ?? members[0]?.id ?? null;
      set({ members, membersLoaded: true, membersLoading: false, activeMemberId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load members.';
      set({ membersLoading: false, membersError: message });
    }
  },
}));
