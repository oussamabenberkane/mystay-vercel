-- ============================================================
-- 012_hotel_directory.sql
-- Public "Hotel Search & Listings" directory.
--
-- Extends the existing GLOBAL marketing table `showcase_hotels`
-- (006_cms_landing.sql) into a richer public directory that backs
-- the new anon-readable /hotels listing + /hotels/[slug] detail
-- pages. No new table and no tenancy: this stays pure marketing
-- content with no hotel_id, exactly like the original showcase.
--
-- The anon SELECT policy from 006 (is_active = true) already covers
-- these new columns, so NO new RLS policy is required.
--
-- ⚠️  MUST BE APPLIED TO THE LIVE DB. The migrations directory is not
-- authoritative — apply this (and the companion seed) against the
-- live Supabase project before/with deploying the feature.
-- ============================================================

-- ------------------------------------------------------------
-- COLUMNS (idempotent)
-- ------------------------------------------------------------

ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS slug        text;
ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS amenities   text[] NOT NULL DEFAULT '{}';
ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS gallery     text[] NOT NULL DEFAULT '{}';
ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS phone       text;
ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS email       text;
ALTER TABLE showcase_hotels ADD COLUMN IF NOT EXISTS address     text;

-- ------------------------------------------------------------
-- SLUG BACKFILL — public detail URLs are /hotels/<slug>.
-- Derive a kebab-case slug from name for any pre-existing row that
-- lacks one. Seeded rows set their slug explicitly.
-- ------------------------------------------------------------

UPDATE showcase_hotels
SET slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Unique slug for active routing. Partial so legacy NULLs (if any)
-- never collide.
CREATE UNIQUE INDEX IF NOT EXISTS showcase_hotels_slug_idx
  ON showcase_hotels (slug)
  WHERE slug IS NOT NULL;
