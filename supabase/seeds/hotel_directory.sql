-- ============================================================
-- seeds/hotel_directory.sql
-- Demo content for the public /hotels directory (012_hotel_directory.sql).
--
-- This is READ-ONLY seeded marketing data for the first iteration
-- (no admin CRUD yet). Re-runnable: upserts on the unique `slug`.
-- Images are picsum placeholders — replace with real photography.
--
-- ⚠️  MUST BE APPLIED TO THE LIVE DB alongside migration 012.
-- ============================================================

-- Retire the original test row so the directory reads clean.
UPDATE showcase_hotels SET is_active = false WHERE slug = 'dbtest-hotel';

INSERT INTO showcase_hotels
  (slug, name, location, indicative_price, rating, sort_order, is_active,
   description, amenities, gallery, image_url, phone, email, address)
VALUES
  (
    'riviera-azur', 'Riviera Azur', 'Algiers', 18500, 4.7, 1, true,
    'A contemporary seafront retreat on the Bay of Algiers, where floor-to-ceiling windows frame the Mediterranean and a rooftop infinity pool catches the last light of day. Quietly refined, effortlessly close to the city.',
    ARRAY['Sea View','Outdoor Pool','Spa & Hammam','Rooftop Bar','Free Wi-Fi','Airport Shuttle','Fine Dining Restaurant','Concierge'],
    ARRAY['https://picsum.photos/seed/riviera-azur-1/1280/860','https://picsum.photos/seed/riviera-azur-2/1280/860','https://picsum.photos/seed/riviera-azur-3/1280/860','https://picsum.photos/seed/riviera-azur-4/1280/860'],
    'https://picsum.photos/seed/riviera-azur-1/1280/860',
    '+213 21 00 11 22', 'reservations@rivieraazur.dz', '12 Boulevard du Front de Mer, Algiers'
  ),
  (
    'casbah-lumiere', 'Casbah Lumière', 'Algiers', 22000, 4.8, 2, true,
    'A jewel-box boutique hotel woven into the historic Casbah, blending whitewashed Ottoman architecture with hand-laid zellige and candlelit courtyards. Twelve rooms, no two alike.',
    ARRAY['Garden Terrace','Spa & Hammam','Fine Dining Restaurant','Free Wi-Fi','Concierge','Breakfast Included','24/7 Room Service'],
    ARRAY['https://picsum.photos/seed/casbah-lumiere-1/1280/860','https://picsum.photos/seed/casbah-lumiere-2/1280/860','https://picsum.photos/seed/casbah-lumiere-3/1280/860','https://picsum.photos/seed/casbah-lumiere-4/1280/860'],
    'https://picsum.photos/seed/casbah-lumiere-1/1280/860',
    '+213 21 33 44 55', 'stay@casbahlumiere.dz', '3 Rue Sidi Ramdane, Casbah, Algiers'
  ),
  (
    'atlas-grand-hotel', 'Atlas Grand Hotel', 'Oran', 14200, 4.5, 3, true,
    'Oran''s landmark business address, steps from the waterfront promenade. Generous suites, a celebrated brasserie, and meeting spaces built for the deal that closes itself.',
    ARRAY['Free Wi-Fi','Business Center','Fitness Center','Fine Dining Restaurant','Free Parking','Airport Shuttle','Concierge','Breakfast Included'],
    ARRAY['https://picsum.photos/seed/atlas-grand-1/1280/860','https://picsum.photos/seed/atlas-grand-2/1280/860','https://picsum.photos/seed/atlas-grand-3/1280/860','https://picsum.photos/seed/atlas-grand-4/1280/860'],
    'https://picsum.photos/seed/atlas-grand-1/1280/860',
    '+213 41 22 33 44', 'contact@atlasgrand.dz', '45 Boulevard de la Soummam, Oran'
  ),
  (
    'tlemcen-andalus-resort', 'Tlemcen Andalus Resort', 'Tlemcen', 16500, 4.6, 4, true,
    'Set among olive groves beneath the Lalla Setti plateau, this Andalusian-inspired resort pairs cool tiled patios and reflecting pools with sweeping views over the old imperial city.',
    ARRAY['Outdoor Pool','Spa & Hammam','Garden Terrace','Family Rooms','Free Wi-Fi','Free Parking','Fine Dining Restaurant','Fitness Center'],
    ARRAY['https://picsum.photos/seed/tlemcen-andalus-1/1280/860','https://picsum.photos/seed/tlemcen-andalus-2/1280/860','https://picsum.photos/seed/tlemcen-andalus-3/1280/860','https://picsum.photos/seed/tlemcen-andalus-4/1280/860'],
    'https://picsum.photos/seed/tlemcen-andalus-1/1280/860',
    '+213 43 55 66 77', 'welcome@tlemcenandalus.dz', 'Route de Lalla Setti, Tlemcen'
  ),
  (
    'constantine-heights', 'Constantine Heights', 'Constantine', 12800, 4.4, 5, true,
    'Perched above the gorges of the City of Bridges, with vertiginous balcony views and a glass-walled restaurant that seems to float over the Rhumel. Drama, served at altitude.',
    ARRAY['Free Wi-Fi','Fitness Center','Business Center','Fine Dining Restaurant','Concierge','Free Parking','Breakfast Included'],
    ARRAY['https://picsum.photos/seed/constantine-heights-1/1280/860','https://picsum.photos/seed/constantine-heights-2/1280/860','https://picsum.photos/seed/constantine-heights-3/1280/860','https://picsum.photos/seed/constantine-heights-4/1280/860'],
    'https://picsum.photos/seed/constantine-heights-1/1280/860',
    '+213 31 77 88 99', 'info@constantineheights.dz', 'Avenue Aouati Mostefa, Constantine'
  ),
  (
    'annaba-marina-suites', 'Annaba Marina Suites', 'Annaba', 13500, 4.5, 6, true,
    'All-suite living on the marina, with private terraces over the moored yachts and a short stroll to the golden crescent of Rizi Amor beach. Built for slow mornings and long, salt-air evenings.',
    ARRAY['Sea View','Beach Access','Outdoor Pool','Family Rooms','Free Wi-Fi','Free Parking','24/7 Room Service','Breakfast Included'],
    ARRAY['https://picsum.photos/seed/annaba-marina-1/1280/860','https://picsum.photos/seed/annaba-marina-2/1280/860','https://picsum.photos/seed/annaba-marina-3/1280/860','https://picsum.photos/seed/annaba-marina-4/1280/860'],
    'https://picsum.photos/seed/annaba-marina-1/1280/860',
    '+213 38 11 22 33', 'reservations@annabamarina.dz', 'Port de Plaisance, Annaba'
  ),
  (
    'sahara-pearl-lodge', 'Sahara Pearl Lodge', 'Ghardaïa', 9800, 4.3, 7, true,
    'An intimate desert lodge at the gateway to the M''Zab valley, with earth-toned suites, a palm-shaded courtyard, and guided dune excursions that end under a sky thick with stars.',
    ARRAY['Desert Excursions','Garden Terrace','Free Wi-Fi','Free Parking','Breakfast Included','Family Rooms','Concierge'],
    ARRAY['https://picsum.photos/seed/sahara-pearl-1/1280/860','https://picsum.photos/seed/sahara-pearl-2/1280/860','https://picsum.photos/seed/sahara-pearl-3/1280/860','https://picsum.photos/seed/sahara-pearl-4/1280/860'],
    'https://picsum.photos/seed/sahara-pearl-1/1280/860',
    '+213 29 44 55 66', 'hello@saharapearl.dz', 'Route de Beni Isguen, Ghardaïa'
  )
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
  name             = EXCLUDED.name,
  location         = EXCLUDED.location,
  indicative_price = EXCLUDED.indicative_price,
  rating           = EXCLUDED.rating,
  sort_order       = EXCLUDED.sort_order,
  is_active        = EXCLUDED.is_active,
  description      = EXCLUDED.description,
  amenities        = EXCLUDED.amenities,
  gallery          = EXCLUDED.gallery,
  image_url        = EXCLUDED.image_url,
  phone            = EXCLUDED.phone,
  email            = EXCLUDED.email,
  address          = EXCLUDED.address;
