-- ------------------------------------------------------------
-- HOTEL LOOKUP BY SLUG (signup flow)
-- The signup form resolves a hotel code (slug) BEFORE the user is
-- authenticated, so the anon role needs a way to map slug -> id.
-- hotels_select RLS only covers authenticated users of that hotel;
-- this SECURITY DEFINER helper exposes just the id, not the table.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_hotel_id_by_slug(hotel_slug text)
RETURNS uuid AS $$
  SELECT id FROM hotels WHERE slug = hotel_slug;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_hotel_id_by_slug(text) TO anon, authenticated;
