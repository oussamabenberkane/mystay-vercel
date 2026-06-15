# Agent 06 — Bug fixes: QR code link + chat display

**Role:** Fix the two reported defects. Independent of the new schema — **can start immediately, in parallel with agent-00.**

## Bug B4 — "The QR code leads to a site but it doesn't work"
- **Where:** `src/app/[locale]/(admin)/admin/settings/_components/qr-code-section.tsx` encodes `appUrl` (a prop). The parent settings `page.tsx` injects it.
- **Likely cause:** `appUrl` resolves to a wrong/placeholder/localhost value or a route that isn't publicly reachable, so the scanned link 404s or dead-ends.
- **Fix:** trace where `appUrl` comes from (the settings page) and make it resolve to the correct **public production URL** from env (e.g. `NEXT_PUBLIC_*` base URL), pointing at a real, working, locale-prefixed entry route. Coordinate the exact target with **agent-01** — default to the app root / landing so a fresh scan lands on splash → landing → login. Ensure the encoded string is an absolute `https://` URL.
- **Verify:** the value rendered under the QR matches a URL that actually loads the app for an unauthenticated visitor.

## Bug B5 — "The chat does not display completely"
- **Where:** `src/app/[locale]/(guest)/chat/page.tsx`. Outer container is `position: fixed; top:0; left:0; right:0; bottom:64px` with a `shrink-0` header, a `flex-1 overflow-y-auto` messages region, and `<MessageInput>` as the last child. Also check the staff side: `src/components/staff/chat-panel.tsx` (uses `flex h-full` inside a `100vh` page) and `src/app/[locale]/(staff)/staff/chat/page.tsx`.
- **Likely causes to investigate:** the fixed `bottom: 64px` (bottom-nav height) plus the in-flow `MessageInput` can push the input or last messages out of the visible area; mobile browser dynamic toolbars (iOS Safari `100vh`/visual-viewport) and `safe-area-inset` can hide the input behind the bottom nav/home indicator; the messages container has no explicit height and depends entirely on the flex parent being correctly sized.
- **Fix:** make the chat reliably fill the viewport with header + scrollable messages + always-visible input on mobile and desktop, across all three locales (including RTL `ar`). Prefer robust layout (e.g. dynamic viewport units / `100dvh`, proper flex min-height, safe-area padding) over magic pixel offsets. Keep the realtime + 2s polling + optimistic-send logic untouched — this is a **layout-only** fix.
- **Verify:** on a narrow mobile viewport the header, full message list (scrollable to newest), and input are all visible; the input stays visible when the keyboard opens; no content is clipped by the bottom nav.

## Inputs
- The two chat files above + `MessageInput` (`src/components/shared/message-input.tsx`) and the bottom nav component (for its real height / safe-area handling).
- The settings page that renders `QRCodeSection` (find via the `appUrl` prop).
- Env base-URL variable used elsewhere in the app.

## Deliverables
- QR fix (correct, absolute, working public URL).
- Chat layout fix (guest, and staff if it shares the defect), layout-only.
- Any new strings under existing `guest.chat.*` (no new namespace); en/fr/ar parity, RTL-safe.

## Success criteria
- Scanning the admin QR opens a working app entry for an unauthenticated user.
- Guest (and staff) chat renders fully — header, scrollable messages, visible input — on mobile and desktop, all locales, with the keyboard open.
- No change to message-send/realtime/polling behavior; `npm run build` and `npm run lint` pass.

## Boundaries
- Layout/URL fixes only — do not refactor the realtime/polling/optimistic logic or touch schema, middleware, or `database.ts`.
- Coordinate the QR target URL with agent-01 at integration.
