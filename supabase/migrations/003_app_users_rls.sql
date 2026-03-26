-- Run this in Supabase SQL Editor if you cannot create users.
-- The app uses the anon key (custom auth). RLS may block INSERT/UPDATE/DELETE without policies.

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow anon to read app_users (needed for login and user list)
CREATE POLICY "anon_select_app_users"
ON app_users FOR SELECT TO anon
USING (true);

-- Allow anon to insert new users (create user)
CREATE POLICY "anon_insert_app_users"
ON app_users FOR INSERT TO anon
WITH CHECK (true);

-- Allow anon to update users (change permissions)
CREATE POLICY "anon_update_app_users"
ON app_users FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Allow anon to delete users (admin only in app logic)
CREATE POLICY "anon_delete_app_users"
ON app_users FOR DELETE TO anon
USING (true);
