// Auto-generate this file by running:
// npx supabase gen types typescript --local > src/types/database.types.ts
// This is a placeholder until the Supabase project is initialized.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          onboarding_complete: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
        };
      };
      linked_accounts: {
        Row: {
          id: string;
          user_id: string;
          plaid_item_id: string;
          institution_name: string;
          mask: string;
          account_type: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plaid_item_id: string;
          institution_name: string;
          mask: string;
          account_type: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plaid_item_id?: string;
          institution_name?: string;
          mask?: string;
          account_type?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      donation_preferences: {
        Row: {
          id: string;
          user_id: string;
          threshold_amount: number;
          monthly_cap: number;
          schedule: string;
          is_paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          threshold_amount?: number;
          monthly_cap?: number;
          schedule?: string;
          is_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          threshold_amount?: number;
          monthly_cap?: number;
          schedule?: string;
          is_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      nonprofits: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          mission: string;
          logo_url: string | null;
          website_url: string | null;
          ein: string | null;
          stripe_connect_id: string | null;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          mission: string;
          logo_url?: string | null;
          website_url?: string | null;
          ein?: string | null;
          stripe_connect_id?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string;
          mission?: string;
          logo_url?: string | null;
          website_url?: string | null;
          ein?: string | null;
          stripe_connect_id?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      cause_categories: {
        Row: {
          id: string;
          name: string;
          label: string;
          icon: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          label: string;
          icon: string;
          display_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          label?: string;
          icon?: string;
          display_order?: number;
        };
      };
      user_charity_allocations: {
        Row: {
          id: string;
          user_id: string;
          nonprofit_id: string;
          split_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nonprofit_id: string;
          split_percentage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nonprofit_id?: string;
          split_percentage?: number;
          created_at?: string;
        };
      };
      roundup_transactions: {
        Row: {
          id: string;
          user_id: string;
          linked_account_id: string;
          plaid_transaction_id: string;
          transaction_amount: number;
          roundup_amount: number;
          merchant_name: string | null;
          transacted_at: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          linked_account_id: string;
          plaid_transaction_id: string;
          transaction_amount: number;
          roundup_amount: number;
          merchant_name?: string | null;
          transacted_at: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          linked_account_id?: string;
          plaid_transaction_id?: string;
          transaction_amount?: number;
          roundup_amount?: number;
          merchant_name?: string | null;
          transacted_at?: string;
          status?: string;
          created_at?: string;
        };
      };
      donation_batches: {
        Row: {
          id: string;
          user_id: string;
          total_amount: number;
          stripe_payment_intent_id: string | null;
          status: string;
          trigger_type: string;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_amount: number;
          stripe_payment_intent_id?: string | null;
          status?: string;
          trigger_type: string;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_amount?: number;
          stripe_payment_intent_id?: string | null;
          status?: string;
          trigger_type?: string;
          processed_at?: string | null;
          created_at?: string;
        };
      };
      donations: {
        Row: {
          id: string;
          batch_id: string;
          user_id: string;
          nonprofit_id: string;
          amount: number;
          stripe_transfer_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          user_id: string;
          nonprofit_id: string;
          amount: number;
          stripe_transfer_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          user_id?: string;
          nonprofit_id?: string;
          amount?: number;
          stripe_transfer_id?: string | null;
          status?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
