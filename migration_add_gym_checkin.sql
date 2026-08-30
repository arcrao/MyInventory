-- ========================================
-- MIGRATION: Add Gym Member Check-In / Check-Out (QR Code)
-- ========================================
-- This migration adds gym membership tracking as a module fully independent
-- from the inventory/products access model:
-- - `gym_roles`: who has access to the Gym module at all (separate from
--   `user_roles`, which controls Products access). A user with a products
--   role has NO Gym access unless they also have a row here, and vice
--   versa - the two products share only the Supabase auth.users table.
-- - `gym_members`: members with a unique QR-encoded member_code
-- - `gym_checkins`: attendance log (check-in / check-out timestamps)
-- - `gym_scan_checkin()`: atomic RPC used by staff scanning a member's QR
--   code. First scan (no open session) records a check-in; scanning the
--   same member again while they have an open session records a
--   check-out. Runs as one transaction with row locking to avoid double
--   check-ins from rapid duplicate scans.
--
-- Security model:
-- - gym_staff: can view members and the check-in log, and scan
--   check-in/check-out (day-to-day front-desk work)
-- - gym_admin: everything gym_staff can do, plus add/edit/delete members
--   and grant/revoke Gym access (gym_roles) for other users
-- - Anyone without a gym_roles row (including products admins) has NO
--   access to any gym_* table
--
-- Run this in Supabase SQL Editor
-- ========================================

-- Gym Roles Table (independent of `user_roles`, which governs Products)
CREATE TABLE gym_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'gym_staff' CHECK (role IN ('gym_admin', 'gym_staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper: does the current user have any Gym access (staff or admin)?
CREATE OR REPLACE FUNCTION is_gym_staff()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM gym_roles WHERE user_id = auth.uid();
  RETURN v_role IN ('gym_admin', 'gym_staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: is the current user a Gym admin (member/roster management)?
CREATE OR REPLACE FUNCTION is_gym_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM gym_roles WHERE user_id = auth.uid();
  RETURN v_role = 'gym_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE gym_roles ENABLE ROW LEVEL SECURITY;

-- Gym Roles Policies
CREATE POLICY "Gym admins can view all gym roles, users can view their own"
  ON gym_roles FOR SELECT
  USING (is_gym_admin() OR user_id = auth.uid());

CREATE POLICY "Only gym admins can insert gym roles"
  ON gym_roles FOR INSERT
  WITH CHECK (is_gym_admin());

CREATE POLICY "Only gym admins can update gym roles"
  ON gym_roles FOR UPDATE
  USING (is_gym_admin());

CREATE POLICY "Only gym admins can delete gym roles"
  ON gym_roles FOR DELETE
  USING (is_gym_admin());

CREATE TRIGGER update_gym_roles_updated_at
  BEFORE UPDATE ON gym_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
CREATE POLICY "Gym staff can view gym members"
  ON gym_members FOR SELECT
  USING (is_gym_staff());

CREATE POLICY "Only gym admins can insert gym members"
  ON gym_members FOR INSERT
  WITH CHECK (is_gym_admin());

CREATE POLICY "Only gym admins can update gym members"
  ON gym_members FOR UPDATE
  USING (is_gym_admin());

CREATE POLICY "Only gym admins can delete gym members"
  ON gym_members FOR DELETE
  USING (is_gym_admin());

-- Gym Check-Ins Policies (append-only log, updated once for check-out)
CREATE POLICY "Gym staff can view gym checkins"
  ON gym_checkins FOR SELECT
  USING (is_gym_staff());

CREATE POLICY "Gym staff can insert gym checkins"
  ON gym_checkins FOR INSERT
  WITH CHECK (is_gym_staff());

CREATE POLICY "Gym staff can update gym checkins"
  ON gym_checkins FOR UPDATE
  USING (is_gym_staff());

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
  -- SECURITY CHECK: Enforce Gym staff/admin only access
  IF NOT is_gym_staff() THEN
    RAISE EXCEPTION 'Only gym staff can record check-in/check-out';
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
-- Gym Access Management (for gym_admin, from the app)
-- ========================================
-- These let a gym_admin grant/revoke/list Gym access by email without
-- touching SQL, the same way the "Scan" and "Members" screens work.
-- auth.users isn't selectable by regular clients, so these are
-- SECURITY DEFINER functions that look it up internally, gated by
-- is_gym_admin().

CREATE OR REPLACE FUNCTION gym_grant_role_by_email(p_email TEXT, p_role TEXT)
RETURNS json AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  IF NOT is_gym_admin() THEN
    RAISE EXCEPTION 'Only gym admins can grant gym access';
  END IF;

  IF p_role NOT IN ('gym_admin', 'gym_staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user found with email %. They must sign up first.', p_email;
  END IF;

  INSERT INTO gym_roles (user_id, role)
  VALUES (v_target_user_id, p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = p_role;

  RETURN json_build_object('success', true, 'message', 'Gym access granted');
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gym_grant_role_by_email TO authenticated;

CREATE OR REPLACE FUNCTION gym_revoke_role(p_user_id UUID)
RETURNS json AS $$
BEGIN
  IF NOT is_gym_admin() THEN
    RAISE EXCEPTION 'Only gym admins can revoke gym access';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own gym access';
  END IF;

  DELETE FROM gym_roles WHERE user_id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Gym access revoked');
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gym_revoke_role TO authenticated;

CREATE OR REPLACE FUNCTION gym_list_roles()
RETURNS TABLE(user_id UUID, email TEXT, role TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  IF NOT is_gym_admin() THEN
    RAISE EXCEPTION 'Only gym admins can view gym access list';
  END IF;

  RETURN QUERY
  SELECT gr.user_id, au.email, gr.role, gr.created_at
  FROM gym_roles gr
  JOIN auth.users au ON au.id = gr.user_id
  ORDER BY gr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gym_list_roles TO authenticated;

-- ========================================
-- Creating Your First Gym Admin
-- ========================================
-- Gym access is completely separate from Products' `user_roles` - a
-- Products admin/super_admin has NO Gym access by default, and a Gym
-- admin has NO Products access. Bootstrap the first gym_admin manually:
--
-- 1. Go to Supabase Dashboard -> Authentication -> Users
-- 2. Copy the User ID (UUID) of the person who will manage the Gym module
-- 3. Go to SQL Editor and run:
--
-- INSERT INTO gym_roles (user_id, role)
-- VALUES ('their-user-id-here', 'gym_admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'gym_admin';
--
-- Once a gym_admin exists, that person can grant, change, and revoke
-- gym_staff/gym_admin access for others by email from the Gym > Access
-- tab in the app (no further SQL needed).

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. Bootstrap a gym_admin (see above) - without this, nobody can access
--    the Gym tab, since gym_roles starts empty.
-- 2. Add members from the Gym > Members tab; member_code is generated
--    automatically and encoded into a QR code.
-- 3. Staff scan a member's QR code from the Gym > Scan tab, which calls:
--    supabase.rpc('gym_scan_checkin', { p_member_code: '<scanned code>' })
-- 4. The RPC toggles check-in/check-out automatically based on whether the
--    member currently has an open session.
-- ========================================
