-- Add avatar_url column to users table for user profile photos
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;
