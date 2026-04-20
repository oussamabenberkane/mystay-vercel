-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies for all tables
-- ============================================================

-- ------------------------------------------------------------
-- HELPER FUNCTIONS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_my_hotel_id()
RETURNS uuid AS $$
  SELECT hotel_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ------------------------------------------------------------

ALTER TABLE hotels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stays              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- hotels
-- ------------------------------------------------------------

CREATE POLICY "hotels_select"
  ON hotels FOR SELECT
  TO authenticated
  USING (id = get_my_hotel_id());

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- rooms
-- ------------------------------------------------------------

CREATE POLICY "rooms_select"
  ON rooms FOR SELECT
  TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "rooms_insert"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "rooms_update"
  ON rooms FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "rooms_delete"
  ON rooms FOR DELETE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- stays
-- ------------------------------------------------------------

CREATE POLICY "stays_select"
  ON stays FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      guest_id = auth.uid()
      OR get_my_role() IN ('staff', 'admin')
    )
  );

CREATE POLICY "stays_insert"
  ON stays FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "stays_update"
  ON stays FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- menu_categories
-- ------------------------------------------------------------

CREATE POLICY "menu_categories_select"
  ON menu_categories FOR SELECT
  TO authenticated
  USING (hotel_id = get_my_hotel_id());

CREATE POLICY "menu_categories_insert"
  ON menu_categories FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "menu_categories_update"
  ON menu_categories FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "menu_categories_delete"
  ON menu_categories FOR DELETE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- menu_items
-- ------------------------------------------------------------

-- Clients see only available items; staff/admin see all
CREATE POLICY "menu_items_select"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      get_my_role() IN ('staff', 'admin')
      OR is_available = true
    )
  );

CREATE POLICY "menu_items_insert"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "menu_items_update"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "menu_items_delete"
  ON menu_items FOR DELETE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------

CREATE POLICY "orders_select"
  ON orders FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      guest_id = auth.uid()
      OR get_my_role() IN ('staff', 'admin')
    )
  );

-- Client can only place orders for their own guest_id with an active stay in their hotel
CREATE POLICY "orders_insert"
  ON orders FOR INSERT
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
        AND status = 'active'
    )
  );

CREATE POLICY "orders_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'));

-- ------------------------------------------------------------
-- order_items
-- ------------------------------------------------------------

CREATE POLICY "order_items_select"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.hotel_id = get_my_hotel_id()
        AND (
          o.guest_id = auth.uid()
          OR get_my_role() IN ('staff', 'admin')
        )
    )
  );

CREATE POLICY "order_items_insert"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.guest_id = auth.uid()
        AND o.hotel_id = get_my_hotel_id()
    )
  );

-- ------------------------------------------------------------
-- service_requests
-- ------------------------------------------------------------

CREATE POLICY "service_requests_select"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      guest_id = auth.uid()
      OR get_my_role() IN ('staff', 'admin')
    )
  );

CREATE POLICY "service_requests_insert"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id = get_my_hotel_id()
    AND get_my_role() = 'client'
    AND guest_id = auth.uid()
  );

CREATE POLICY "service_requests_update"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'))
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() IN ('staff', 'admin'));

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND (
      get_my_role() IN ('staff', 'admin')
      OR EXISTS (
        SELECT 1 FROM stays s
        WHERE s.id = stay_id AND s.guest_id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id = get_my_hotel_id()
    AND sender_id = auth.uid()
  );

-- ------------------------------------------------------------
-- push_subscriptions
-- ------------------------------------------------------------

CREATE POLICY "push_subscriptions_select"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
