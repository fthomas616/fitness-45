-- ══════════════════════════════════════════
-- 45 DAYS FITNESS CHALLENGE — Database Setup
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════

-- Invites table (tracks who admin has invited)
CREATE TABLE IF NOT EXISTS invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  invited_by  UUID REFERENCES auth.users(id),
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (one per user, publicly readable)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  goal          TEXT NOT NULL,
  approach      TEXT DEFAULT '',
  avatar_color  TEXT DEFAULT '#7b61ff',
  start_weight  NUMERIC(6,2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day           INTEGER NOT NULL CHECK (day >= 1),
  description   TEXT NOT NULL,
  duration_min  INTEGER DEFAULT 0,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Weights table (one entry per user per day)
CREATE TABLE IF NOT EXISTS weights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day        INTEGER NOT NULL CHECK (day >= 1),
  value      NUMERIC(6,2) NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day)
);

-- ══ Row Level Security (RLS) ══
-- Profiles: everyone authenticated can read, only owner can write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Workouts: everyone can read, only owner can insert/delete
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts_read"   ON workouts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "workouts_insert" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_delete" ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Weights: everyone can read, only owner can write
ALTER TABLE weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weights_read"   ON weights FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "weights_upsert" ON weights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weights_update" ON weights FOR UPDATE USING (auth.uid() = user_id);

-- Invites: only service role can access (admin API handles this)
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
