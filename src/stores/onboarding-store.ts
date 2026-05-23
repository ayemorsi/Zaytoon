import { create } from 'zustand';

import type { CauseCategory, ThresholdAmount, DonationSchedule } from '@/types/app.types';

interface OnboardingState {
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  linkedAccountMask: string | null;
  threshold: ThresholdAmount;
  monthlyCap: number;
  schedule: DonationSchedule;
  selectedCauseIds: CauseCategory[];
  selectedCharityIds: string[];

  setLinkedAccount: (id: string, name: string, mask: string) => void;
  setPreferences: (prefs: {
    threshold: ThresholdAmount;
    monthlyCap: number;
    schedule: DonationSchedule;
  }) => void;
  setSelectedCauses: (ids: CauseCategory[]) => void;
  setSelectedCharities: (ids: string[]) => void;
  reset: () => void;
}

const defaultState = {
  linkedAccountId: null,
  linkedAccountName: null,
  linkedAccountMask: null,
  threshold: 5 as ThresholdAmount,
  monthlyCap: 50,
  schedule: 'threshold' as DonationSchedule,
  selectedCauseIds: [] as CauseCategory[],
  selectedCharityIds: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...defaultState,

  setLinkedAccount: (id, name, mask) =>
    set({ linkedAccountId: id, linkedAccountName: name, linkedAccountMask: mask }),

  setPreferences: (prefs) => set(prefs),

  setSelectedCauses: (ids) => set({ selectedCauseIds: ids }),

  setSelectedCharities: (ids) => set({ selectedCharityIds: ids }),

  reset: () => set(defaultState),
}));
