-- ============================================================
-- 008_stays_checkin.sql
-- App-level check-in / check-out on the stays row.
-- Adds checked_in_at / checked_out_at timestamps and widens the
-- status CHECK to include the lifecycle values reserved |
-- checked_in | checked_out ALONGSIDE the existing active | archived.
--
-- BACKWARD-COMPATIBLE MAPPING (no existing row is rewritten):
--   - 'active'   : legacy "current in-house stay". Still fully valid
--                  and remains the operative status that the ordering
--                  flow, get_active_stay(), and get_hotel_stats()
--                  recognise as the LIVE stay. Semantically equal to
--                  'checked_in'. Existing rows keep this value.
--   - 'archived' : legacy "past stay". Still valid. Semantically
--                  equal to 'checked_out'. Existing rows keep this value.
-- New lifecycle (used by agent-04 going forward):
--   - 'reserved'    : stay created, guest not yet checked in.
--   - 'checked_in'  : guest checked in (sets checked_in_at).
--   - 'checked_out' : guest checked out (sets checked_out_at).
-- Because legacy 'active'/'archived' remain in the allowed set,
-- nothing that depends on status = 'active' (ordering RLS,
-- get_active_stay, stats) breaks. Agent-04 decides whether new
-- check-ins write 'active' or 'checked_in'; both are permitted.
-- ============================================================

-- ------------------------------------------------------------
-- COLUMNS
-- ------------------------------------------------------------

ALTER TABLE stays ADD COLUMN IF NOT EXISTS checked_in_at  timestamptz;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;

-- ------------------------------------------------------------
-- WIDEN status CHECK constraint (guarded / idempotent)
-- The original unnamed CHECK from 001 is auto-named stays_status_check.
-- ------------------------------------------------------------

ALTER TABLE stays DROP CONSTRAINT IF EXISTS stays_status_check;

ALTER TABLE stays
  ADD CONSTRAINT stays_status_check
  CHECK (status IN ('active', 'archived', 'reserved', 'checked_in', 'checked_out'));
