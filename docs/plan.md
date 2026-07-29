# Ticket Digitizer PWA — Implementation Plan

## Context

The user's father works as an autónomo (self-employed) in Spain and needs to digitize paper receipts/tickets for quarterly tax filings (IVA/IRPF) and his gestor. The priority is an extremely frictionless daily workflow on his Android phone: open app, snap photo, confirm, done — with data ending up organized, searchable, backed up, and exportable in a format ready for tax purposes.

Through clarification, the following constraints were confirmed:
- **Android-only**, so the app should be an installable PWA (no native app store friction, no iOS compat burden).
- **OCR must run entirely client-side** — no external paid AI/OCR API, no per-scan cost, no third-party data exposure.
- **No separate backend service** (no Supabase/Firebase) — storage/sync piggybacks on the Google account the father already has via his Android phone, using **Google Drive** (images) and **Google Sheets** (structured data + built-in Excel/CSV export for his gestor or tax office).
- **Everything is free** — no hosting costs, no API costs, at this usage volume.

This plan produces a working v1 through incremental milestones rather than one large build, so there's a usable, testable app at each stage.

---

## Recommended Decisions (former open points, now settled)

- **Frontend**: React 18 + TypeScript + Vite 5 + `vite-plugin-pwa`. Chosen over vanilla JS because the confirm/edit screen is a reactive form with per-field confidence states — worth a component model even for a single-purpose app.
- **Camera capture**: `<input type="file" accept="image/*" capture="environment">` (opens native Android camera app) rather than a custom `getUserMedia` UI — better photo quality (autofocus/HDR) with far less code.
- **OAuth**: Google Identity Services (GIS) token client — pure client-side, no backend/secret needed. Capture never requires sign-in, only sync does, so occasional re-auth is acceptable friction (see Risks).
- **Sheet layout**: one tab per year (e.g. tab `2026`), mirrors the Drive folder structure.
- **Hosting**: Cloudflare Pages (free, HTTPS by default, git-push-to-deploy).
- **Styling**: Tailwind CSS.

---

## 1. Manual Prerequisite Steps (user must do these — cannot be automated)

1. Install **Node.js LTS (v20+)** and **Git** locally. *(Done for this dev environment.)*
2. Create a free **Cloudflare account** (or Vercel/Netlify/GitHub if preferred) for hosting.
3. In **Google Cloud Console** (console.cloud.google.com):
   - Create a new project (e.g. "ticket-digitizer").
   - Enable **Google Drive API** and **Google Sheets API**.
   - Configure OAuth consent screen: User type **External**, keep in **Testing** mode (avoids Google's app-review process — fine for 1–2 personal users, up to 100 test users supported).
   - Add scopes: `drive.file` (least-privilege, per-file access only) and `spreadsheets`.
   - Add test users: father's Gmail (and son's, if he'll also sign in).
   - Create OAuth Client ID → **Web application** → Authorized JavaScript origins: the Cloudflare Pages URL + `http://localhost:5173` for dev. No redirect URIs or client secret needed for the token-client flow.
   - Note the Client ID for `VITE_GOOGLE_CLIENT_ID`.
   - Expect a one-time "unverified app" warning on first sign-in per account (Testing mode) — expected, not a bug.

---

## 2. App Flow (frictionless-first design)

Home screen = one large camera button, dominant.
Tap → native camera opens → photo taken → image written to IndexedDB immediately (`status: captured`) before anything else, so nothing is ever lost to a crash.
→ OCR runs automatically (Tesseract.js, Spanish pack) → parser extracts date/total/IVA/vendor → **Confirm screen**: prefilled editable form, low-confidence fields flagged, one "Guardar" button → saves as `pending_sync`, returns instantly to Home (sync happens in background, never blocks next capture).
History screen: past tickets with status/thumbnail, tap to fix/retry. Settings: sign-in/out, categories.

This is the core loop: **camera → confirm → save → back to camera**, ~4 taps per ticket, fully usable offline except the final sync.

---

## 3. Data Model

**Drive folders**: `Tickets/{year}/T{quarter}/` (quarter from ticket date). Root folder tagged via `appProperties` so it's found idempotently across sessions/devices instead of duplicated.

**Image filenames**: `{YYYYMMDD}_{HHmmss}_{vendorSlug}_{shortId}.jpg`.

**Spreadsheet** "Tickets - Registro", one tab per year, columns: Fecha, Trimestre, Proveedor/Comercio, NIF/CIF, Base Imponible, % IVA, Importe IVA, Total, Categoría, Enlace Imagen (Drive hyperlink), Nombre Archivo, Notas, Fecha de Alta, Estado (OK/Revisar — flags low-OCR-confidence rows for the gestor to double-check).

Rows appended via Sheets API `values.append` (`USER_ENTERED` so formulas/formatting render). Both Drive files and Sheet rows persist indefinitely (satisfies ~4-year Spanish retention with zero extra logic). Locally, image blobs are purged from IndexedDB once synced (keep metadata only) to bound on-device storage over years of use.

---

## 4. Project Structure

```
C:\Users\Lenovo\Documents\ticket-digitizer\
  index.html, package.json, vite.config.ts, tsconfig.json, .env.example, README.md
  public\icons\
  src\
    main.tsx, App.tsx
    app\ (CameraScreen, ConfirmScreen, HistoryScreen, SettingsScreen)
    components\ (Button, FieldInput, SyncStatusBadge, InstallPrompt)
    lib\
      ocr\tesseractClient.ts
      ocrParser\ (parseDate, parseAmounts, parseIVA, parseVendor, index, types) — pure functions, {value, confidence}
      db\ (indexedDb.ts via `idb`, ticketRepository.ts, settingsRepository.ts)
      google\ (auth.ts — GIS token client, driveClient.ts, sheetsClient.ts, folderResolver.ts — idempotent find-or-create)
      sync\ (syncEngine.ts — sequential drain of pending_sync queue, useSyncStatus.ts)
      image\downscale.ts (canvas resize + EXIF orientation fix — required before OCR/upload)
    state\ (AppContext.tsx, ticketReducer.ts)
    types\ (ticket.ts, ocr.ts)
  tests\ocrParser\*.test.ts + tests\fixtures\ (real OCR text samples for regex tuning)
```

**PWA packaging**: `vite-plugin-pwa` with `registerType: 'prompt'` (never silently interrupts mid-capture). Precache full app shell; runtime CacheFirst for Tesseract.js core/wasm + `spa.traineddata` (~10-15MB, so OCR works offline after first use). Google API calls excluded from SW caching (handled by the app-level IndexedDB queue instead). Manifest: standalone display, portrait, 192/512/maskable icons. Custom install prompt shown after first successful scan, not on load.

---

## 5. Phased Build Plan

1. **M1 — Shell & installability**: Vite+React+TS scaffold, Tailwind, manifest+icons, `vite-plugin-pwa`, deploy to Cloudflare Pages, verify install + Lighthouse PWA score on the real Android phone. **Status: built and verified locally (build clean, manifest + service worker active, all screens render). Deployment + on-device install still pending user action.**
2. **M2 — Capture + offline queue**: camera button, IndexedDB queue, local History list. No OCR yet — verify nothing is lost across reloads/offline.
3. **M3 — OCR integration**: Tesseract.js + Spanish pack with SW caching, image downscale/EXIF fix, raw OCR text shown, real-device timing check.
4. **M4 — Parsing + Confirm screen**: build/unit-test `ocrParser` against 10-20 real photographed receipts (user supplies these), confidence-flagged prefilled form. Deliverable: full offline capture→OCR→edit→save loop.
5. **M5 — Google OAuth + Drive/Sheets**: complete §1 setup; prototype GIS sign-in on a real *installed* PWA instance first (standalone-mode auth popups are a known rough edge, see Risks) before building the rest on top; then `driveClient`/`sheetsClient`/`folderResolver`.
6. **M6 — Sync engine + polish**: background/foreground sync triggers, retry/backoff, sync badge, re-login-on-expiry prompt, install-prompt UX, update-available toast.
7. **M7 — Export/hardening**: year-boundary tab creation, category dropdown, verify Sheet→XLSX and Drive folder→zip exports actually work end to end, test a second device/browser on the same Google account.

---

## 6. Risks to Watch

1. **OCR accuracy on faded/crumpled thermal receipts** is the main real risk — expect ~60-80% auto-fill accuracy, not higher; the Confirm screen's manual edit is the actual reliability mechanism, not a nice-to-have.
2. **GIS token client inside a standalone/installed PWA** can behave inconsistently (silent refresh, popup chrome) — prototype this specifically at the start of M5 before building the rest of the sync engine on it.
3. **On-device storage growth**: mitigated by downscaling before storage and purging synced blobs.
4. **EXIF orientation** from `<input capture>` photos must be corrected before OCR/upload or receipts land sideways.

---

## 7. Verification

- After each milestone, install/test on the actual Android phone (Chrome), not just desktop — camera capture, offline behavior, and install prompts are phone-specific.
- M4: validate parser accuracy against real receipts collected from the father.
- M5: sign in with the father's actual Google account, confirm folder/sheet created correctly in his real Drive, confirm no duplicate folders on repeated syncs.
- M7: open the resulting Sheet and Drive folder from a second device/browser to confirm multi-device access works, and confirm Sheet→Excel export opens cleanly.
