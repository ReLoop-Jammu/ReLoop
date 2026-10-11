
-- ReLoop account roles and shop-owner verification.
-- Intended for the existing ReLoop Supabase project.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'account_role'
  ) THEN
    CREATE TYPE public.account_role AS ENUM ('buyer', 'shop_owner');
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 20),
  role public.account_role NOT NULL DEFAULT 'buyer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Preserve the existing shop_owners foreign key to auth.users.
ALTER TABLE public.shop_owners
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shop_owners'::regclass
      AND conname = 'shop_owners_verification_status_check'
  ) THEN
    ALTER TABLE public.shop_owners
      ADD CONSTRAINT shop_owners_verification_status_check
      CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shop_owners'::regclass
      AND conname = 'shop_owners_gstin_format_check'
  ) THEN
    ALTER TABLE public.shop_owners
      ADD CONSTRAINT shop_owners_gstin_format_check
      CHECK (gstin IS NULL OR gstin ~ '^[0-9A-Z]{15}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS shop_owners_gstin_unique_idx
  ON public.shop_owners(gstin) WHERE gstin IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users read own profile'
  ) THEN
    CREATE POLICY "Users read own profile"
      ON public.profiles FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users update own basic profile'
  ) THEN
    CREATE POLICY "Users update own basic profile"
      ON public.profiles FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shop_owners'
      AND policyname = 'Owners read own shop profile'
  ) THEN
    CREATE POLICY "Owners read own shop profile"
      ON public.shop_owners FOR SELECT TO authenticated
      USING (id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shop_submissions'
      AND policyname = 'Shop owners read own submissions'
  ) THEN
    CREATE POLICY "Shop owners read own submissions"
      ON public.shop_submissions FOR SELECT TO authenticated
      USING (shop_owner_id = (SELECT auth.uid()));
  END IF;
END $$;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.shop_owners TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_reloop_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_role text;
  chosen_role public.account_role;
  supplied_name text;
  supplied_phone text;
BEGIN
  raw_role := COALESCE(new.raw_user_meta_data ->> 'account_type', 'buyer');
  IF raw_role NOT IN ('buyer', 'shop_owner') THEN
    raw_role := 'buyer';
  END IF;
  chosen_role := raw_role::public.account_role;

  supplied_name := COALESCE(
    NULLIF(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'ReLoop user'
  );
  supplied_phone := COALESCE(
    NULLIF(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'not-provided'
  );

  INSERT INTO public.profiles(user_id, full_name, phone, role)
  VALUES (new.id, supplied_name, supplied_phone, chosen_role);

  IF chosen_role = 'shop_owner' THEN
    INSERT INTO public.shop_owners(
      id, shop_name, owner_name, email, phone, address, city,
      is_active, gstin, verification_status, business_address
    )
    VALUES (
      new.id,
      COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'shop_name'), ''), 'Pending shop details'),
      supplied_name,
      new.email,
      supplied_phone,
      COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'business_address'), ''), ''),
      COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'city'), ''), 'Jammu'),
      true,
      NULLIF(upper(trim(new.raw_user_meta_data ->> 'gstin')), ''),
      'pending',
      COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'business_address'), ''), 'Pending address')
    );
  END IF;

  RETURN new;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_reloop_profile'
      AND tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created_reloop_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_reloop_user();
  END IF;
END $$;
