-- Fix ReLoop signup failures caused by profiles_phone_check.
-- Apply this file in Supabase SQL Editor (or via Supabase migrations).
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
  supplied_shop_name text;
  supplied_address text;
  supplied_gstin text;
BEGIN
  raw_role := COALESCE(new.raw_user_meta_data ->> 'account_type', 'buyer');
  IF raw_role NOT IN ('buyer', 'shop_owner') THEN
    raw_role := 'buyer';
  END IF;
  chosen_role := raw_role::public.account_role;

  supplied_name := NULLIF(trim(COALESCE(new.raw_user_meta_data ->> 'full_name', '')), '');
  supplied_phone := NULLIF(trim(COALESCE(new.raw_user_meta_data ->> 'phone', '')), '');

  IF supplied_name IS NULL OR char_length(supplied_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'ReLoop signup: full name must contain 2 to 100 characters';
  END IF;
  IF supplied_phone IS NULL OR char_length(supplied_phone) NOT BETWEEN 6 AND 20 THEN
    RAISE EXCEPTION 'ReLoop signup: phone number must contain 6 to 20 characters (received %)',
      COALESCE(char_length(supplied_phone), 0);
  END IF;

  INSERT INTO public.profiles(user_id, full_name, phone, role)
  VALUES (new.id, supplied_name, supplied_phone, chosen_role);

  IF chosen_role = 'shop_owner' THEN
    supplied_shop_name := NULLIF(trim(COALESCE(new.raw_user_meta_data ->> 'shop_name', '')), '');
    supplied_address := NULLIF(trim(COALESCE(new.raw_user_meta_data ->> 'business_address', '')), '');
    supplied_gstin := NULLIF(upper(trim(COALESCE(new.raw_user_meta_data ->> 'gstin', ''))), '');

    IF supplied_shop_name IS NULL THEN
      RAISE EXCEPTION 'ReLoop signup: shop name is required for shop-owner accounts';
    END IF;
    IF supplied_address IS NULL THEN
      RAISE EXCEPTION 'ReLoop signup: business address is required for shop-owner accounts';
    END IF;
    IF supplied_gstin IS NULL OR supplied_gstin !~ '^[0-9A-Z]{15}$' THEN
      RAISE EXCEPTION 'ReLoop signup: GSTIN must contain exactly 15 letters/numbers';
    END IF;

    INSERT INTO public.shop_owners(
      id, shop_name, owner_name, email, phone, address, city,
      is_active, gstin, verification_status, business_address
    ) VALUES (
      new.id, supplied_shop_name, supplied_name, new.email, supplied_phone,
      supplied_address, 'Jammu', true, supplied_gstin, 'pending', supplied_address
    );
  END IF;

  RETURN new;
END;
$$;
