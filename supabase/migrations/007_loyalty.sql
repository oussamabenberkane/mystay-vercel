-- ============================================================
-- 007_loyalty.sql
-- Loyalty program: ledger-backed points accounts, transactions,
-- and redeemable offers.
--
-- Balance model: loyalty_accounts.points_balance is a cached
-- running total kept in sync with the SUM of all
-- loyalty_transactions.delta for that account. The two RPCs
-- (award_loyalty_points / redeem_loyalty_offer) are the only
-- supported way to mutate balances; they insert the ledger row
-- and update the cached balance atomically in one transaction.
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id       uuid        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  hotel_id       uuid        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  points_balance integer     NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid        NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  hotel_id   uuid        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  delta      integer     NOT NULL,                 -- positive = earn, negative = redeem
  reason     text,
  ref_type   text,                                 -- e.g. 'order', 'offer', 'manual'
  ref_id     uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_offers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  points_cost integer     NOT NULL CHECK (points_cost >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS loyalty_accounts_hotel_idx       ON loyalty_accounts (hotel_id);
CREATE INDEX IF NOT EXISTS loyalty_transactions_account_idx ON loyalty_transactions (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_transactions_hotel_idx   ON loyalty_transactions (hotel_id);
CREATE INDEX IF NOT EXISTS loyalty_offers_hotel_active_idx  ON loyalty_offers (hotel_id, is_active);

-- ------------------------------------------------------------
-- keep updated_at fresh on loyalty_accounts
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS loyalty_accounts_updated_at ON loyalty_accounts;
CREATE TRIGGER loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

ALTER TABLE loyalty_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_offers       ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- loyalty_accounts RLS
--   * client: read only their own account
--   * staff/admin: read any account in their hotel
--   Writes go exclusively through the SECURITY DEFINER RPCs below;
--   no direct INSERT/UPDATE policy is granted to clients. Admin may
--   create/adjust accounts directly within their hotel.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "loyalty_accounts_select" ON loyalty_accounts;
DROP POLICY IF EXISTS "loyalty_accounts_insert" ON loyalty_accounts;
DROP POLICY IF EXISTS "loyalty_accounts_update" ON loyalty_accounts;

CREATE POLICY "loyalty_accounts_select"
  ON loyalty_accounts FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      guest_id = auth.uid()
      OR get_my_role() IN ('staff', 'admin')
    )
  );

CREATE POLICY "loyalty_accounts_insert"
  ON loyalty_accounts FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "loyalty_accounts_update"
  ON loyalty_accounts FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- loyalty_transactions RLS
--   * client: read only their own account's ledger
--   * staff/admin: read any ledger in their hotel
--   Inserts go exclusively through the RPCs (SECURITY DEFINER);
--   no client INSERT policy is granted.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "loyalty_transactions_select" ON loyalty_transactions;
DROP POLICY IF EXISTS "loyalty_transactions_insert" ON loyalty_transactions;

CREATE POLICY "loyalty_transactions_select"
  ON loyalty_transactions FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      get_my_role() IN ('staff', 'admin')
      OR EXISTS (
        SELECT 1 FROM loyalty_accounts a
        WHERE a.id = account_id AND a.guest_id = auth.uid()
      )
    )
  );

CREATE POLICY "loyalty_transactions_insert"
  ON loyalty_transactions FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- loyalty_offers RLS
--   * client: read active offers in their hotel
--   * staff/admin: read all offers in their hotel
--   * admin: full write scoped to their hotel
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "loyalty_offers_select" ON loyalty_offers;
DROP POLICY IF EXISTS "loyalty_offers_insert" ON loyalty_offers;
DROP POLICY IF EXISTS "loyalty_offers_update" ON loyalty_offers;
DROP POLICY IF EXISTS "loyalty_offers_delete" ON loyalty_offers;

CREATE POLICY "loyalty_offers_select"
  ON loyalty_offers FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      get_my_role() IN ('staff', 'admin')
      OR is_active = true
    )
  );

CREATE POLICY "loyalty_offers_insert"
  ON loyalty_offers FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "loyalty_offers_update"
  ON loyalty_offers FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "loyalty_offers_delete"
  ON loyalty_offers FOR DELETE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ============================================================
-- RPCs (SECURITY DEFINER) — the only supported balance mutators
-- ============================================================

-- ------------------------------------------------------------
-- award_loyalty_points
--   Credits points to a guest. Lazily creates the loyalty_account
--   if none exists. Inserts a positive ledger row and bumps the
--   cached balance, atomically. Caller must be staff/admin of the
--   guest's hotel, OR the guest themselves earning on their own
--   account (e.g. order-completion hook running as the client).
--
--   Returns the new points_balance (integer).
--   Raises on: guest not found, cross-hotel mismatch, p_points <= 0,
--   or unauthorised caller.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_guest_id uuid,
  p_points   integer,
  p_reason   text DEFAULT NULL,
  p_ref_type text DEFAULT NULL,
  p_ref_id   uuid DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_guest_hotel  uuid;
  v_caller_hotel uuid;
  v_caller_role  text;
  v_account_id   uuid;
  v_new_balance  integer;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'points must be a positive integer';
  END IF;

  SELECT hotel_id INTO v_guest_hotel FROM profiles WHERE id = p_guest_id;
  IF v_guest_hotel IS NULL THEN
    RAISE EXCEPTION 'guest profile not found';
  END IF;

  v_caller_hotel := get_my_hotel_id();
  v_caller_role  := get_my_role();

  -- Authorisation: same hotel, and either staff/admin or the guest acting on self.
  IF v_caller_hotel IS NULL OR v_caller_hotel <> v_guest_hotel THEN
    RAISE EXCEPTION 'not authorised: hotel mismatch';
  END IF;
  IF NOT (v_caller_role IN ('staff', 'admin') OR auth.uid() = p_guest_id) THEN
    RAISE EXCEPTION 'not authorised: insufficient role';
  END IF;

  -- Lazily ensure an account exists, then lock it.
  INSERT INTO loyalty_accounts (guest_id, hotel_id)
  VALUES (p_guest_id, v_guest_hotel)
  ON CONFLICT (guest_id) DO NOTHING;

  SELECT id INTO v_account_id
  FROM loyalty_accounts
  WHERE guest_id = p_guest_id
  FOR UPDATE;

  INSERT INTO loyalty_transactions (account_id, hotel_id, delta, reason, ref_type, ref_id)
  VALUES (v_account_id, v_guest_hotel, p_points, p_reason, p_ref_type, p_ref_id);

  UPDATE loyalty_accounts
  SET points_balance = points_balance + p_points
  WHERE id = v_account_id
  RETURNING points_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- redeem_loyalty_offer
--   Redeems an active offer against the calling guest's account.
--   Validates the offer belongs to the guest's hotel and is active,
--   that the account has sufficient balance, then writes a negative
--   ledger row and decrements the cached balance — atomically.
--
--   Caller is always the guest (auth.uid()); the account must be
--   theirs. Returns the new points_balance (integer).
--   Raises 'insufficient points balance' when balance < cost.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION redeem_loyalty_offer(
  p_offer_id uuid
)
RETURNS integer AS $$
DECLARE
  v_guest_id    uuid := auth.uid();
  v_guest_hotel uuid;
  v_offer_hotel uuid;
  v_offer_active boolean;
  v_cost        integer;
  v_account_id  uuid;
  v_balance     integer;
  v_new_balance integer;
BEGIN
  IF v_guest_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT hotel_id INTO v_guest_hotel FROM profiles WHERE id = v_guest_id;
  IF v_guest_hotel IS NULL THEN
    RAISE EXCEPTION 'guest profile not found';
  END IF;

  SELECT hotel_id, is_active, points_cost
    INTO v_offer_hotel, v_offer_active, v_cost
  FROM loyalty_offers
  WHERE id = p_offer_id;

  IF v_offer_hotel IS NULL THEN
    RAISE EXCEPTION 'offer not found';
  END IF;
  IF v_offer_hotel <> v_guest_hotel THEN
    RAISE EXCEPTION 'not authorised: offer belongs to another hotel';
  END IF;
  IF v_offer_active IS NOT TRUE THEN
    RAISE EXCEPTION 'offer is not active';
  END IF;

  -- Lock the account row to serialise concurrent redemptions.
  SELECT id, points_balance INTO v_account_id, v_balance
  FROM loyalty_accounts
  WHERE guest_id = v_guest_id
  FOR UPDATE;

  IF v_account_id IS NULL OR v_balance < v_cost THEN
    RAISE EXCEPTION 'insufficient points balance';
  END IF;

  INSERT INTO loyalty_transactions (account_id, hotel_id, delta, reason, ref_type, ref_id)
  VALUES (v_account_id, v_guest_hotel, -v_cost, 'Redeemed offer', 'offer', p_offer_id);

  UPDATE loyalty_accounts
  SET points_balance = points_balance - v_cost
  WHERE id = v_account_id
  RETURNING points_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION award_loyalty_points(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_loyalty_offer(uuid) TO authenticated;
