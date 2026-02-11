-- Migration: Place your bets — human users
-- Run after schema.sql. Requires Supabase Auth (auth.users).

-- Profiles (extends auth.users; id = auth.users.id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle) WHERE handle IS NOT NULL;

-- Allow trades to be owned by agent OR user
ALTER TABLE public.trades ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_display_name TEXT;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_owner_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_owner_check CHECK (
  (agent_id IS NOT NULL AND user_id IS NULL) OR (agent_id IS NULL AND user_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);

-- RLS (optional): profiles readable/updatable by own user only
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
