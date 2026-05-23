-- Zaytoon Initial Schema
-- Run: npx supabase db push

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  onboarding_complete bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- LINKED BANK ACCOUNTS (Plaid)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL,
  plaid_access_token text NOT NULL, -- store encrypted via Supabase Vault in production
  institution_name text NOT NULL,
  mask text NOT NULL,
  account_type text NOT NULL DEFAULT 'checking',
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts"
  ON public.linked_accounts FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- DONATION PREFERENCES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  threshold_amount numeric NOT NULL DEFAULT 5.00,
  monthly_cap numeric NOT NULL DEFAULT 50.00,
  schedule text NOT NULL DEFAULT 'threshold' CHECK (schedule IN ('threshold', 'weekly_friday')),
  is_paused bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.donation_preferences FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CAUSE CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cause_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'heart',
  display_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.cause_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.cause_categories FOR SELECT TO authenticated USING (true);

-- Seed cause categories
INSERT INTO public.cause_categories (name, label, icon, display_order) VALUES
  ('food', 'Food Security', 'fork.knife', 1),
  ('medical', 'Medical Aid', 'cross.case', 2),
  ('education', 'Education', 'book', 3),
  ('disaster_relief', 'Disaster Relief', 'heart', 4),
  ('masjids', 'Masjids', 'building.2', 5),
  ('orphans', 'Orphan Support', 'person.2', 6),
  ('clean_water', 'Clean Water', 'drop', 7),
  ('refugees', 'Refugees', 'house', 8)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────
-- NONPROFITS (admin-managed)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nonprofits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  mission text NOT NULL DEFAULT '',
  logo_url text,
  website_url text,
  ein text,
  country text NOT NULL DEFAULT 'US',
  stripe_connect_id text,
  is_verified bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nonprofits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active nonprofits"
  ON public.nonprofits FOR SELECT TO authenticated
  USING (is_active = true AND is_verified = true);

-- Nonprofit ↔ cause category mapping
CREATE TABLE IF NOT EXISTS public.nonprofit_categories (
  nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.cause_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (nonprofit_id, category_id)
);

ALTER TABLE public.nonprofit_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nonprofit categories"
  ON public.nonprofit_categories FOR SELECT TO authenticated USING (true);

-- Seed nonprofits
INSERT INTO public.nonprofits (name, slug, description, mission, ein, is_verified, is_active) VALUES
  ('Islamic Relief USA', 'islamic-relief-usa', 'Providing emergency relief and sustainable development to communities in need globally.', 'To create a world where hope and dignity flourish.', '95-4453134', true, true),
  ('Helping Hand for Relief & Development', 'hhrd', 'Providing humanitarian aid and development programs to vulnerable communities worldwide.', 'To serve the most vulnerable communities globally.', '36-4422146', true, true),
  ('Zakat Foundation of America', 'zakat-foundation', 'Serving the poor and marginalized through zakat and sadaqah.', 'Transforming lives through the power of giving.', '36-4476204', true, true),
  ('Penny Appeal USA', 'penny-appeal-usa', 'Tackling poverty and disease with a focus on water, food, and education.', 'Big impact from small change.', '82-1751907', true, true),
  ('Masjid Al-Nour Foundation', 'masjid-al-nour', 'Supporting mosque-based community programs and Islamic education.', 'Building stronger Muslim communities through faith and service.', '84-3625910', true, true)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- USER CHARITY ALLOCATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_charity_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nonprofit_id uuid NOT NULL REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  split_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nonprofit_id)
);

ALTER TABLE public.user_charity_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own allocations"
  ON public.user_charity_allocations FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- ROUND-UP TRANSACTIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roundup_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_account_id uuid NOT NULL REFERENCES public.linked_accounts(id),
  plaid_transaction_id text UNIQUE NOT NULL,
  transaction_amount numeric NOT NULL,
  roundup_amount numeric NOT NULL CHECK (roundup_amount > 0 AND roundup_amount <= 1),
  merchant_name text,
  transacted_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'included_in_batch', 'excluded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roundup_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own round-ups"
  ON public.roundup_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_roundup_user_status ON public.roundup_transactions (user_id, status);

-- ─────────────────────────────────────────────
-- DONATION BATCHES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('threshold', 'scheduled_friday', 'manual')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches"
  ON public.donation_batches FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- DONATIONS (individual per charity per batch)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.donation_batches(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nonprofit_id uuid NOT NULL REFERENCES public.nonprofits(id),
  amount numeric NOT NULL,
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own donations"
  ON public.donations FOR SELECT USING (auth.uid() = user_id);
