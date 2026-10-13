-- Adds 'admin' as an account role, so admin accounts no longer show up as buyers
-- or shop owners. It is only a label: admin rights still come from is_admin()
-- (an active admin_users row, or a hub staff admin). Sign-up can never choose
-- it, because handle_new_reloop_user() accepts only 'buyer' and 'shop_owner',
-- and users can't change their own role (they may update only full_name and
-- phone). Set it with supabase-fixes/tidy-admin-account.sql or by hand.
alter type public.account_role add value if not exists 'admin';
