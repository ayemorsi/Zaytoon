export type AuthProvider = 'google' | 'apple' | 'phone' | 'email';

export type DonationSchedule = 'threshold' | 'weekly_friday';

export type ThresholdAmount = 5 | 10 | 25;

export type CauseCategory =
  | 'food'
  | 'medical'
  | 'education'
  | 'disaster_relief'
  | 'masjids'
  | 'orphans'
  | 'clean_water'
  | 'refugees';

export interface CauseCategoryOption {
  id: CauseCategory;
  label: string;
  icon: string; // SF Symbol name
  emoji: string;
}

export const CAUSE_CATEGORIES: CauseCategoryOption[] = [
  { id: 'food', label: 'Food Security', icon: 'fork.knife', emoji: '🍽️' },
  { id: 'medical', label: 'Medical Aid', icon: 'cross.case', emoji: '🏥' },
  { id: 'education', label: 'Education', icon: 'book', emoji: '📚' },
  { id: 'disaster_relief', label: 'Disaster Relief', icon: 'heart', emoji: '🆘' },
  { id: 'masjids', label: 'Masjids', icon: 'building.2', emoji: '🕌' },
  { id: 'orphans', label: 'Orphan Support', icon: 'person.2', emoji: '👶' },
  { id: 'clean_water', label: 'Clean Water', icon: 'drop', emoji: '💧' },
  { id: 'refugees', label: 'Refugees', icon: 'house', emoji: '🏠' },
];

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Nonprofit {
  id: string;
  name: string;
  slug: string;
  description: string;
  mission: string;
  logo_url: string | null;
  website_url: string | null;
  ein: string | null;
  is_verified: boolean;
  is_active: boolean;
  cause_categories?: CauseCategory[];
}

export interface DonationPreferences {
  id: string;
  user_id: string;
  threshold_amount: number;
  monthly_cap: number;
  schedule: DonationSchedule;
  is_paused: boolean;
}

export interface RoundupTransaction {
  id: string;
  user_id: string;
  plaid_transaction_id: string;
  transaction_amount: number;
  roundup_amount: number;
  merchant_name: string | null;
  transacted_at: string;
  status: 'pending' | 'included_in_batch' | 'excluded';
}

export interface DonationBatch {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  trigger_type: 'threshold' | 'scheduled_friday' | 'manual';
  processed_at: string | null;
  created_at: string;
}

export interface LinkedAccount {
  id: string;
  user_id: string;
  institution_name: string;
  mask: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
}
