-- ============================================================
-- 010_stays_client_checkin.sql  (agent-04)
-- In-app guest check-in / check-out.
--
-- The base policy "stays_update" (002_rls_policies.sql) restricts
-- UPDATE on stays to admins only. To let a GUEST check themselves
-- in / out from the app (stamping checked_in_at / checked_out_at
-- and advancing status), add a client-scoped UPDATE policy.
--
-- PostgreSQL combines multiple PERMISSIVE policies with OR, so this
-- ADDS guest self-service without weakening the admin policy.
--
-- Scope: a client may update ONLY their own stay in their own hotel
-- (USING), and may not reassign it to another guest/hotel (WITH
-- CHECK pins guest_id = auth.uid() and the hotel). The server action
-- (src/lib/actions/stay-status.ts) additionally validates the status
-- transition and only ever writes status + the check-in/out stamps.
--
-- NOTE: this migration must be applied to the live DB (the orchestrator
-- applies migrations). It is purely additive and idempotent.
-- ============================================================

DROP POLICY IF EXISTS "stays_update_client_checkin" ON stays;

CREATE POLICY "stays_update_client_checkin"
  ON stays FOR UPDATE
  TO authenticated
  USING (
    hotel_id = get_my_hotel_id()
    AND get_my_role() = 'client'
    AND guest_id = auth.uid()
  )
  WITH CHECK (
    hotel_id = get_my_hotel_id()
    AND get_my_role() = 'client'
    AND guest_id = auth.uid()
  );
