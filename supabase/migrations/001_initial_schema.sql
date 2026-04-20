-- ============================================================
-- 001_initial_schema.sql
-- Tables, indexes, views, functions, triggers
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

CREATE TABLE hotels (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  logo_url   text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id         uuid  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   uuid  REFERENCES hotels(id) ON DELETE CASCADE,
  role       text  NOT NULL CHECK (role IN ('client', 'staff', 'admin')),
  full_name  text  NOT NULL,
  phone      text,
  language   text  DEFAULT 'en' CHECK (language IN ('en', 'fr', 'ar')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE rooms (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid    NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  number     text    NOT NULL,
  type       text    NOT NULL,
  floor      integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (hotel_id, number)
);

CREATE TABLE stays (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid  NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id   uuid  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id    uuid  NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  check_in   date  NOT NULL,
  check_out  date  NOT NULL,
  status     text  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE menu_categories (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid    NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name       text    NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE menu_items (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid           NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category_id  uuid           NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name         text           NOT NULL,
  description  text,
  price        numeric(10, 2) NOT NULL,
  image_url    text,
  is_available boolean        NOT NULL DEFAULT true,
  sort_order   integer        DEFAULT 0,
  created_at   timestamptz    DEFAULT now()
);

CREATE TABLE orders (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid           NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  stay_id      uuid           NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  guest_id     uuid           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text           NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz    DEFAULT now(),
  updated_at   timestamptz    DEFAULT now()
);

CREATE TABLE order_items (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid           NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity     integer        NOT NULL CHECK (quantity > 0),
  unit_price   numeric(10, 2) NOT NULL,
  created_at   timestamptz    DEFAULT now()
);

CREATE TABLE service_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  stay_id     uuid        NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  guest_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('cleaning', 'towels', 'maintenance', 'other')),
  description text,
  priority    text        NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  stay_id    uuid        NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  subscription jsonb   NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

CREATE INDEX ON profiles (hotel_id);
CREATE INDEX ON profiles (hotel_id, role);
CREATE INDEX ON stays (guest_id);
CREATE INDEX ON stays (hotel_id, status);
CREATE INDEX ON orders (stay_id);
CREATE INDEX ON orders (hotel_id, status);
CREATE INDEX ON orders (hotel_id, created_at DESC);
CREATE INDEX ON service_requests (hotel_id, status);
CREATE INDEX ON service_requests (stay_id);
CREATE INDEX ON messages (stay_id, created_at ASC);
CREATE INDEX ON messages (hotel_id, created_at DESC);
CREATE INDEX ON menu_items (hotel_id, category_id);
CREATE INDEX ON menu_items (hotel_id, is_available);

-- ------------------------------------------------------------
-- VIEWS
-- ------------------------------------------------------------

CREATE VIEW expenses AS
SELECT
  o.id,
  o.hotel_id,
  o.stay_id,
  o.guest_id,
  o.total_amount AS amount,
  o.status,
  o.created_at
FROM orders o
WHERE o.status != 'cancelled';

-- ------------------------------------------------------------
-- TRIGGER FUNCTIONS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Placeholder trigger for future auth hooks.
-- Profiles are created explicitly by the app after signup (hotel_id and role
-- are not available at auth time).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- RPC FUNCTIONS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_active_stay(p_guest_id uuid)
RETURNS TABLE (
  id          uuid,
  hotel_id    uuid,
  room_id     uuid,
  check_in    date,
  check_out   date,
  status      text,
  room_number text,
  room_type   text,
  room_floor  integer
) AS $$
  SELECT
    s.id, s.hotel_id, s.room_id, s.check_in, s.check_out, s.status,
    r.number AS room_number, r.type AS room_type, r.floor AS room_floor
  FROM stays s
  JOIN rooms r ON r.id = s.room_id
  WHERE s.guest_id = p_guest_id AND s.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_hotel_stats(p_hotel_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_orders_today', (
      SELECT COUNT(*) FROM orders
      WHERE hotel_id = p_hotel_id AND created_at::date = CURRENT_DATE
    ),
    'pending_orders', (
      SELECT COUNT(*) FROM orders
      WHERE hotel_id = p_hotel_id AND status = 'pending'
    ),
    'pending_requests', (
      SELECT COUNT(*) FROM service_requests
      WHERE hotel_id = p_hotel_id AND status = 'pending'
    ),
    'active_stays', (
      SELECT COUNT(*) FROM stays
      WHERE hotel_id = p_hotel_id AND status = 'active'
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(total_amount), 0) FROM orders
      WHERE hotel_id = p_hotel_id
        AND created_at::date = CURRENT_DATE
        AND status != 'cancelled'
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
