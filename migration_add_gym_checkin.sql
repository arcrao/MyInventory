-- ========================================
-- MIGRATION: Add Gym Member Check-In / Check-Out (QR Code)
-- ========================================
-- This migration adds gym membership tracking:
-- - `gym_members`: members with a unique QR-encoded member_code
-- - `gym_checkins`: attendance log (check-in / check-out timestamps)
-- - `gym_scan_checkin()`: atomic RPC used by staff scanning a member's QR
--   code. First scan of the day (no open session) records a check-in;
--   scanning the same member again while they have an open session
--   records a check-out. Runs as one transaction with row locking to
--   avoid double check-ins from rapid duplicate scans.
--
-- Security model (matches the rest of the app):
-- - All authenticated users can view members and the check-in log
-- - Only admins/super_admins (is_admin()) can add/edit/delete members
--   and perform check-in/check-out scans (staff-only action)
--
-- Run this in Supabase SQL Editor
-- ========================================

-- Gym Members Table
CREATE TABLE gym_members (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_code TEXT NOT NULL UNIQUE, -- encoded into the member's QR code
  name TEXT NOT NULL,
  phone TEXT,
  membership_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-generate a stable, human-readable member_code (e.g. GM-00001)
-- before the row is inserted, if one wasn't explicitly provided.
CREATE OR REPLACE FUNCTION generate_gym_member_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    NEW.member_code := 'GM-' || LPAD(NEW.id::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_gym_member_code
  BEFORE INSERT ON gym_members
  FOR EACH ROW
  EXECUTE FUNCTION generate_gym_member_code();

CREATE TRIGGER update_gym_members_updated_at
  BEFORE UPDATE ON gym_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Gym Check-In / Check-Out Log
CREATE TABLE gym_checkins (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL, -- nullable to preserve log if member is deleted
  member_name TEXT NOT NULL,   -- audit trail, persists even if member is deleted
  member_code TEXT NOT NULL,   -- audit trail, persists even if member is deleted
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id),
  checked_out_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_gym_members_user_id ON gym_members(user_id);
CREATE INDEX idx_gym_members_member_code ON gym_members(member_code);
CREATE INDEX idx_gym_checkins_member_id ON gym_checkins(member_id);
CREATE INDEX idx_gym_checkins_check_in_time ON gym_checkins(check_in_time);
-- Fast lookup of a member's currently-open session (the common scan-time query)
CREATE INDEX idx_gym_checkins_open_session ON gym_checkins(member_id) WHERE check_out_time IS NULL;

-- Row Level Security
ALTER TABLE gym_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_checkins ENABLE ROW LEVEL SECURITY;

-- Gym Members Policies
CREATE POLICY "All authenticated users can view gym members"
  ON gym_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert gym members"
  ON gym_members FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update gym members"
  ON gym_members FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete gym members"
  ON gym_members FOR DELETE
  USING (is_admin());

-- Gym Check-Ins Policies (append-only log, updated once for check-out)
CREATE POLICY "All authenticated users can view gym checkins"
  ON gym_checkins FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert gym checkins"
  ON gym_checkins FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update gym checkins"
  ON gym_checkins FOR UPDATE
  USING (is_admin());

-- ========================================
-- FUNCTION: gym_scan_checkin
-- ========================================
-- Called by staff after scanning a member's QR code. Toggles the member's
-- attendance: opens a new check-in if none is open, otherwise closes the
-- open one as a check-out. Atomic + row-locked to avoid double-scans.
CREATE OR REPLACE FUNCTION gym_scan_checkin(p_member_code TEXT)
RETURNS json AS $$
DECLARE
  v_staff_id UUID;
  v_member RECORD;
  v_open_checkin RECORD;
BEGIN
  -- SECURITY CHECK: Enforce staff (admin) only access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only staff can record check-in/check-out';
  END IF;

  v_staff_id := auth.uid();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT * INTO v_member
  FROM gym_members
  WHERE member_code = p_member_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No member found for this QR code';
  END IF;

  IF v_member.status != 'active' THEN
    RAISE EXCEPTION '% is not an active member', v_member.name;
  END IF;

  -- Lock the member's open session row, if any, to prevent a double-scan race
  SELECT * INTO v_open_checkin
  FROM gym_checkins
  WHERE member_id = v_member.id AND check_out_time IS NULL
  ORDER BY check_in_time DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE gym_checkins
    SET check_out_time = NOW(), checked_out_by = v_staff_id
    WHERE id = v_open_checkin.id;

    RETURN json_build_object(
      'success', true,
      'action', 'checked_out',
      'memberId', v_member.id,
      'memberName', v_member.name,
      'memberCode', v_member.member_code,
      'timestamp', NOW()
    );
  ELSE
    INSERT INTO gym_checkins (member_id, member_name, member_code, checked_in_by)
    VALUES (v_member.id, v_member.name, v_member.member_code, v_staff_id);

    RETURN json_build_object(
      'success', true,
      'action', 'checked_in',
      'memberId', v_member.id,
      'memberName', v_member.name,
      'memberCode', v_member.member_code,
      'timestamp', NOW()
    );
  END IF;

  -- If any error occurs above, entire transaction rolls back automatically
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gym_scan_checkin TO authenticated;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. Add members: INSERT via the app (Settings-style admin UI), member_code
--    is generated automatically and encoded into a QR code.
-- 2. Staff scan a member's QR code from the "Gym" tab, which calls:
--    supabase.rpc('gym_scan_checkin', { p_member_code: '<scanned code>' })
-- 3. The RPC toggles check-in/check-out automatically based on whether the
--    member currently has an open session.
-- ========================================
