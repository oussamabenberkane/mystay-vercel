-- 011_secure_loyalty_award.sql
-- Hardens loyalty point earning.
--
-- Problem: award_loyalty_points was EXECUTE-able by anon/authenticated and
-- accepted a client-supplied p_points with a self-award branch
-- (auth.uid() = p_guest_id). A signed-in guest could therefore call the RPC
-- directly (or the exported earning server actions) and grant themselves an
-- arbitrary number of points, or replay the fixed check-in bonus to farm it.
--
-- Fix:
--   1. Make the award a privileged primitive callable ONLY by the trusted
--      server (service_role). All validation/derivation of amounts now lives in
--      the server-action layer, which calls this via the service-role client.
--   2. Add idempotency per source event (ref_type + ref_id) so a given order or
--      check-in can never be credited twice (replay/double-toggle safe).
--   3. redeem_loyalty_offer is unchanged — it is correctly scoped to auth.uid()
--      and validates balance, so it stays authenticated-callable.

revoke execute on function public.award_loyalty_points(uuid, integer, text, text, uuid)
  from anon, authenticated, public;

create or replace function public.award_loyalty_points(
  p_guest_id uuid,
  p_points   integer,
  p_reason   text default null,
  p_ref_type text default null,
  p_ref_id   uuid default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_guest_hotel uuid;
  v_account_id  uuid;
  v_new_balance integer;
begin
  -- Callable only by the trusted server (service_role) after this migration.
  if p_points is null or p_points <= 0 then
    raise exception 'points must be a positive integer';
  end if;

  select hotel_id into v_guest_hotel from profiles where id = p_guest_id;
  if v_guest_hotel is null then
    raise exception 'guest profile not found';
  end if;

  -- Idempotency: never credit the same source event (order, check-in, ...) more
  -- than once. Returns the current balance unchanged if already awarded.
  if p_ref_type is not null and p_ref_id is not null then
    if exists (
      select 1 from loyalty_transactions
      where ref_type = p_ref_type and ref_id = p_ref_id and delta > 0
    ) then
      select points_balance into v_new_balance
      from loyalty_accounts where guest_id = p_guest_id;
      return coalesce(v_new_balance, 0);
    end if;
  end if;

  insert into loyalty_accounts (guest_id, hotel_id)
  values (p_guest_id, v_guest_hotel)
  on conflict (guest_id) do nothing;

  select id into v_account_id
  from loyalty_accounts
  where guest_id = p_guest_id
  for update;

  insert into loyalty_transactions (account_id, hotel_id, delta, reason, ref_type, ref_id)
  values (v_account_id, v_guest_hotel, p_points, p_reason, p_ref_type, p_ref_id);

  update loyalty_accounts
  set points_balance = points_balance + p_points,
      updated_at = now()
  where id = v_account_id
  returning points_balance into v_new_balance;

  return v_new_balance;
end;
$function$;

-- Re-assert: only the trusted server may call this primitive.
grant execute on function public.award_loyalty_points(uuid, integer, text, text, uuid)
  to service_role;
