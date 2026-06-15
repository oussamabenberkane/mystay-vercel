# Agent 04 — In-app check-in / check-out

**Role:** Let guests check in and check out from the app, with real timestamps and live status visible to staff/admin.

## Context (locked scope)
- **App-level status + timestamps only.** No PMS integration, **no payment/settlement coupling** (agent-05 owns all payment logic). Check-out here only records that the guest checked out.

## Responsibilities
1. **Guest:** a clear check-in action (available when the stay is reserved/active and the date is valid) and a check-out action. Tapping sets `checked_in_at` / `checked_out_at` and advances `stays.status` (`reserved → checked_in → checked_out`) per the schema contract. Show current status and a confirmation state.
2. **Staff/admin:** surface live check-in/out status and timestamps in the existing stays/operations views so staff can see who is checked in.
3. Optionally fire the loyalty check-in bonus by calling agent-03's earning helper at the check-in success path (do not embed points logic here).

## Inputs
- `SCHEMA-CONTRACT.md` from agent-00 (`stays.checked_in_at`, `checked_out_at`, status values and the backward-compatible mapping).
- `src/lib/actions/room-service.ts` (`getActiveStayAction` / active-stay RPC) and `src/lib/actions/admin-stays.ts`.
- `src/app/[locale]/(guest)/dashboard/` and `info/page.tsx` (shows `checkin_time`/`checkout_time` reference) — where to place the guest action.
- `src/app/[locale]/(admin)/admin/stays/page.tsx` + `StaysClient` — where to show status.
- auth-store `profile`.

## Deliverables
- Check-in/out actions in `src/lib/actions/` (extend stays/room-service actions or a small `stay-status.ts`): `{ data, error }`, never throw, role-gated, RLS-safe, `const db = supabase as any` for new columns if untyped.
- Guest UI (button/card) to check in and out with status display, on the dashboard or stay/info area.
- Staff/admin status display in stays/operations views.
- `messages/{en,fr,ar}.json` under the **`checkin.*`** namespace only (en/fr/ar parity, RTL-safe).

## Success criteria
- A guest can check in and check out; `checked_in_at`/`checked_out_at` and `status` update correctly and persist.
- Invalid transitions are prevented (can't check out before checking in; can't check in twice).
- Staff/admin see accurate live status per stay, scoped to their hotel.
- `npm run build` and `npm run lint` pass.

## Boundaries
- No payment, billing, or settlement logic — that is agent-05.
- Do not edit `database.ts` or `src/middleware.ts`.
- Coordinate the single guest-nav/dashboard file edit with agent-03 at integration.
- Keep keys under `checkin.*`; do not reorder existing keys.
