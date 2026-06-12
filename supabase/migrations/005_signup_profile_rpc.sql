-- ------------------------------------------------------------
-- SIGNUP PROFILE CREATION
-- With email confirmation enabled, auth.signUp returns no session,
-- so the signup server action runs as anon and profiles_insert
-- (authenticated, id = auth.uid()) rejects the profile row.
-- This SECURITY DEFINER helper creates the client profile instead.
-- Safe for anon: the caller must know the freshly issued auth uuid,
-- the user must have no profile yet, email is read from auth.users
-- (not trusted from input), and the role is always forced to client.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_signup_profile(
  p_user_id uuid,
  p_hotel_slug text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_language text DEFAULT 'en'
)
RETURNS void AS $$
DECLARE
  v_email text;
  v_hotel_id uuid;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'auth user not found';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'profile already exists';
  END IF;
  SELECT id INTO v_hotel_id FROM hotels WHERE slug = p_hotel_slug;
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'hotel not found';
  END IF;
  INSERT INTO profiles (id, hotel_id, role, full_name, email, phone, language)
  VALUES (p_user_id, v_hotel_id, 'client', p_full_name, v_email, p_phone, COALESCE(p_language, 'en'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_signup_profile(uuid, text, text, text, text) TO anon, authenticated;
