-- Fix PUBLIC_DATA_EXPOSURE: Restrict profiles table access to own profile + coordenacao role
-- Drop the overly permissive policy that allows all users to see all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Coordenacao can view all profiles (needed for admin/management functions)
CREATE POLICY "Coordenacao can view all profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'coordenacao'::app_role));