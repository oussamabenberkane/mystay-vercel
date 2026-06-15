-- ============================================================
-- 009_payments.sql
-- Card payments (Chargily) and order payment state.
-- Adds the payments table, orders.payment_status /
-- orders.payment_method, and re-creates the expenses view to
-- surface the new order payment columns without breaking existing
-- consumers (existing columns keep the same name/position/order).
-- ============================================================

-- ------------------------------------------------------------
-- payments TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payments (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid           NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id     uuid           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stay_id      uuid           NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  order_id     uuid           REFERENCES orders(id) ON DELETE SET NULL,  -- nullable
  amount       numeric(10, 2) NOT NULL,
  currency     text           NOT NULL DEFAULT 'DZD',
  method       text           NOT NULL CHECK (method IN ('app_card', 'reception')),
  provider     text           NOT NULL DEFAULT 'chargily' CHECK (provider IN ('chargily')),
  provider_ref text,
  status       text           NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  checkout_url text,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_hotel_idx    ON payments (hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_guest_idx    ON payments (guest_id);
CREATE INDEX IF NOT EXISTS payments_stay_idx     ON payments (stay_id);
CREATE INDEX IF NOT EXISTS payments_order_idx    ON payments (order_id);
CREATE INDEX IF NOT EXISTS payments_provider_ref_idx ON payments (provider_ref);

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- orders payment columns
--   payment_status: unpaid | pending | paid   (default 'unpaid')
--   payment_method: app_card | reception | NULL (NULL = not chosen yet)
-- Existing rows backfill to 'unpaid' / NULL via the DEFAULT.
-- ------------------------------------------------------------

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending', 'paid'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('app_card', 'reception'));

-- ------------------------------------------------------------
-- expenses VIEW — re-create surfacing payment columns.
-- Existing columns (id, hotel_id, stay_id, guest_id, amount,
-- status, created_at) keep identical name & position; the two
-- payment columns are APPENDED so existing consumers are unaffected.
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW expenses AS
SELECT
  o.id,
  o.hotel_id,
  o.stay_id,
  o.guest_id,
  o.total_amount   AS amount,
  o.status,
  o.created_at,
  o.payment_status,
  o.payment_method
FROM orders o
WHERE o.status != 'cancelled';

-- ------------------------------------------------------------
-- ENABLE RLS — payments
--   * client: read only their own payments
--   * staff/admin: read all payments in their hotel
--   * client: may create app_card payments for their own active stay
--   * staff/admin: may create/update payments in their hotel
--     (e.g. mark reception payments paid; webhook updates run via
--      the service-role admin client and bypass RLS)
-- ------------------------------------------------------------

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select"        ON payments;
DROP POLICY IF EXISTS "payments_insert_client" ON payments;
DROP POLICY IF EXISTS "payments_insert_staff"  ON payments;
DROP POLICY IF EXISTS "payments_update"        ON payments;

CREATE POLICY "payments_select"
  ON payments FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      guest_id = auth.uid()
      OR get_my_role() IN ('staff', 'admin')
    )
  );

CREATE POLICY "payments_insert_client"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id = get_my_hotel_id()
    AND get_my_role() = 'client'
    AND guest_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM stays
      WHERE id = stay_id
        AND guest_id = auth.uid()
        AND hotel_id = get_my_hotel_id()
        AND status IN ('active', 'checked_in')
    )
  );

CREATE POLICY "payments_insert_staff"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'));

CREATE POLICY "payments_update"
  ON payments FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'));
