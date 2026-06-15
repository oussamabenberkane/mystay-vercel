-- ============================================================
-- 006_cms_landing.sql
-- Pre-login landing / promo CMS: ad banners, flash sales,
-- showcase (marketing) hotels.
--
-- These three tables are the ONE deliberate exception to the
-- "authenticated only" rule: anon gets read-only access, filtered
-- to is_active = true, so the pre-login splash/landing can render
-- without a session. Nothing else in the schema is anon-readable.
--
-- showcase_hotels is PURE MARKETING content and is NOT the tenant
-- `hotels` table. It never participates in tenancy / RLS scoping.
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ad_banners (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid        REFERENCES hotels(id) ON DELETE CASCADE,  -- nullable = global banner
  image_url  text        NOT NULL,
  title      text,
  link_url   text,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flash_sales (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid        REFERENCES hotels(id) ON DELETE CASCADE,  -- nullable = global
  title          text        NOT NULL,
  description    text,
  image_url      text,
  discount_label text,
  starts_at      timestamptz,
  ends_at        timestamptz,
  is_active      boolean     NOT NULL DEFAULT true,
  sort_order     integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS showcase_hotels (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text           NOT NULL,
  image_url        text,
  location         text,
  indicative_price numeric(10, 2),
  rating           numeric(2, 1),
  sort_order       integer        NOT NULL DEFAULT 0,
  is_active        boolean        NOT NULL DEFAULT true,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS ad_banners_active_idx     ON ad_banners (is_active, sort_order);
CREATE INDEX IF NOT EXISTS ad_banners_hotel_idx      ON ad_banners (hotel_id);
CREATE INDEX IF NOT EXISTS flash_sales_active_idx    ON flash_sales (is_active, sort_order);
CREATE INDEX IF NOT EXISTS flash_sales_hotel_idx     ON flash_sales (hotel_id);
CREATE INDEX IF NOT EXISTS showcase_hotels_active_idx ON showcase_hotels (is_active, sort_order);

-- ------------------------------------------------------------
-- ENABLE RLS
-- ------------------------------------------------------------

ALTER TABLE ad_banners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_hotels ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ad_banners RLS
--   * anon  : read-only, is_active = true (landing render)
--   * authN : read all of own hotel + global (hotel_id IS NULL)
--   * admin : full write scoped to own hotel (global rows are
--             managed via the admin service-role path, not anon)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "ad_banners_anon_select"   ON ad_banners;
DROP POLICY IF EXISTS "ad_banners_select"        ON ad_banners;
DROP POLICY IF EXISTS "ad_banners_insert"        ON ad_banners;
DROP POLICY IF EXISTS "ad_banners_update"        ON ad_banners;
DROP POLICY IF EXISTS "ad_banners_delete"        ON ad_banners;

CREATE POLICY "ad_banners_anon_select"
  ON ad_banners FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "ad_banners_select"
  ON ad_banners FOR SELECT
  TO authenticated
  USING (hotel_id IS NULL OR hotel_id = get_my_hotel_id());

CREATE POLICY "ad_banners_insert"
  ON ad_banners FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "ad_banners_update"
  ON ad_banners FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "ad_banners_delete"
  ON ad_banners FOR DELETE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- flash_sales RLS (same shape as ad_banners)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "flash_sales_anon_select"   ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_select"        ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_insert"        ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_update"        ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_delete"        ON flash_sales;

CREATE POLICY "flash_sales_anon_select"
  ON flash_sales FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "flash_sales_select"
  ON flash_sales FOR SELECT
  TO authenticated
  USING (hotel_id IS NULL OR hotel_id = get_my_hotel_id());

CREATE POLICY "flash_sales_insert"
  ON flash_sales FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "flash_sales_update"
  ON flash_sales FOR UPDATE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin')
  WITH CHECK (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

CREATE POLICY "flash_sales_delete"
  ON flash_sales FOR DELETE
  TO authenticated
  USING (hotel_id = get_my_hotel_id() AND get_my_role() = 'admin');

-- ------------------------------------------------------------
-- showcase_hotels RLS
--   Pure marketing content with no hotel_id / tenancy. Anon reads
--   active rows for the landing. Writes are admin-only (any admin),
--   since this is global partner-showcase content not scoped to a
--   tenant. (In practice managed via the admin service-role path.)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "showcase_hotels_anon_select" ON showcase_hotels;
DROP POLICY IF EXISTS "showcase_hotels_select"      ON showcase_hotels;
DROP POLICY IF EXISTS "showcase_hotels_insert"      ON showcase_hotels;
DROP POLICY IF EXISTS "showcase_hotels_update"      ON showcase_hotels;
DROP POLICY IF EXISTS "showcase_hotels_delete"      ON showcase_hotels;

CREATE POLICY "showcase_hotels_anon_select"
  ON showcase_hotels FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "showcase_hotels_select"
  ON showcase_hotels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "showcase_hotels_insert"
  ON showcase_hotels FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "showcase_hotels_update"
  ON showcase_hotels FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "showcase_hotels_delete"
  ON showcase_hotels FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');
