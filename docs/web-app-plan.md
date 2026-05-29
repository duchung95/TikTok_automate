# TikTok Shop → FlashPOD Web App — Plan & Status

_Last updated: 2026-05-28 (session 6)_

---

## Architecture

```
TiktokShop/
├── web_app/
│   └── frontend/                # React + Vite (TypeScript)
│       ├── src/
│       │   ├── features/
│       │   │   ├── orders/      # CSV parse, table, export XLSX, export to GSheet
│       │   │   └── settings/    # Google Sign-In, Sheet URL config
│       │   ├── App.tsx          # AppShell layout + routing + GoogleOAuthProvider
│       │   └── flashship_mapping.json  # statically imported (no fetch)
│       ├── scripts/
│       │   ├── package.mjs      # zip build → Desktop
│       │   └── start.command    # serves dist/ on http://localhost:3000 (needed for OAuth)
│       ├── .env                 # VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_SHEET_FULLFILL_ID
│       ├── .env.example         # template with setup instructions
│       ├── vite.config.ts       # base: './', viteSingleFile plugin
│       └── package.json
│
└── docs/
    └── web-app-plan.md          # This file
```

**Runtime**: Single `index.html` (all JS/CSS inlined by `vite-plugin-singlefile`).
Launched via `start.command` (double-click) → serves on `http://localhost:3000` → required for Google OAuth.

**Package manager**: `pnpm`
**Build command**: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build && node scripts/package.mjs`
**Output**: `flashpod_YYYY-MM-DD.zip` on Desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 + `vite-plugin-singlefile` |
| UI | Mantine 7 |
| Table | TanStack Table 8 |
| CSV parse | papaparse |
| XLSX export | ExcelJS 4.4 |
| Google Auth | `@react-oauth/google` (implicit flow, token in `localStorage`) |
| Google Sheets | Google Sheets REST API v4 (plain `fetch`) |
| Tests | Vitest |
| Routing | React Router 6 |

---

## Current Status (Phase 1b — Google Sheets Export, in progress)

### ✅ Done (Phase 1a — complete as of commit `c9e1bcf`)

| Feature | Notes |
|---|---|
| CSV parsing | `parseCsvRows`, `markPartialOrders`, `isRowReady` — 43 tests |
| Variant mapping | Nested JSON, numeric IDs, color/size aliases (`mapVariant`) |
| 6-state RowStatus | `locked / partial / needs-link-label / needs-design / needs-mockup / ready` |
| Vietnamese status badges | `❌ Thiếu Variant ID`, `⚠️ Đơn không đầy đủ`, `🔗 Cần Link Label`, `🖼 Cần URL thiết kế`, `🖼 Cần URL mockup`, `✅ Sẵn sàng` |
| Frozen row order | Sort computed once on CSV import, never re-sorts while editing (`frozenOrderRef`) |
| Google Drive utils | `extractGdriveId`, `gdriveThumbnailUrl` — 10 tests |
| Image preview with retry | `GdriveImage` component: up to 3 retries, 800 ms delay, `key` trick to remount `<img>` |
| Image preview modal | `65vw × 65vh`, `objectFit: contain`, "Mở trong Google Drive ↗" button |
| Inline URL editing | `UrlField` + `UrlQuad` (Design Front/Back, Mockup Front/Back) — 180 px TextInput |
| Order colour palette | 6 colours cycling per `orderId`; locked = red-1, partial = orange-1 |
| Export XLSX | Full 37-column FlashShip template — 28 tests |
| Address clearing | When `linkLabel` is non-empty, `Phone/State/Address/City/Zip` → `""` |
| Partial order guard | `getPartialExportViolations` blocks mixed-partial exports |
| Static JSON import | `flashship_mapping.json` bundled into `index.html` (no `fetch`) |
| Single-file build | `vite-plugin-singlefile` — all JS/CSS inlined, ~1.6 MB |
| `needsAttentionCount` fix | Now uses exported `getRowStatus(item) !== 'ready'` |
| Vietnamese UI | Attention banner, CSV error alert fully in Vietnamese |
| Navbar width | 140 px |
| 90 tests passing | gdriveUtils: 10, csvParser: 43, exportXlsx: 28, OrdersTable: 9 |

### 🔧 In Progress (Phase 1b — Google Sheets Export)

| Item | Notes |
|---|---|
| Google Cloud setup | ✅ OAuth Client ID created, Sheet ID confirmed |
| `.env` / `.env.example` | ✅ `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SHEET_FULLFILL_ID` stored |
| Install `@react-oauth/google` | ✅ Done |
| `vite-env.d.ts` | ✅ `ImportMetaEnv` typed for both env vars |
| `googleSheetExport.ts` | ✅ Token helpers, duplicate check, `appendToSheet()` — FlashShip 37 cols + `Order Date/Time` |
| `App.tsx` | ✅ Wrapped with `GoogleOAuthProvider` |
| `App.tsx` header | ⬜ Add Google Sign In / Sign Out button + signed-in email display |
| `OrdersPage.tsx` | ⬜ "Lưu vào Google Sheet" button — auto-triggers sign-in if not signed in, then exports; duplicate modal (Bỏ qua / Ghi đè / Huỷ) |

**Auth UX decision:** Sign In / Sign Out lives in the **header bar** (always visible). `SettingsPage.tsx` does NOT need a Google auth section.

---

## Key Files

### `src/features/orders/csvParser.ts`
- `parseOrderDate(raw)` — parses TikTok date strings
- `shouldSkipRow(row)` — skips cancelled / test rows
- `mapVariant(variation, mapping, colorFix, sizeFix)` — returns `variantId | null`
- `parseCsvRows(raw, mapping)` — full parse pipeline
- `markPartialOrders(items)` — flags partial split-orders
- `isRowReady(item)` — requires: `variantId` + not `isPartialLock` + non-empty `linkLabel` + ≥1 design URL + ≥1 mockup URL

### `src/features/orders/exportXlsx.ts`
- `FLASHSHIP_COLUMNS` — all 37 columns (exported const)
- `buildFlashshipRow(item)` — defaults all columns to `""`, fills known fields; if `linkLabel.trim()` is non-empty → clears `Phone`, `State`, `Address line 1`, `Address line 2`, `City`, `Zip`
- `getPartialExportViolations(items, checkedIndices)` — returns violation strings for partial-order selections
- `exportToXlsx(items, checkedIndices)` — builds workbook, triggers native blob download as `flashship_YYYY-MM-DD.xlsx`

### `src/features/orders/OrdersTable.tsx`
- `export function getRowStatus(item): RowStatus` — determines row status across 6 states ✅
- `GdriveImage` — retry-on-error image component with preview modal
- `UrlQuad` — 4 URL input + thumbnail columns
- Frozen row order via `frozenOrderRef` + `prevLengthRef`

### `src/features/orders/OrdersTable.test.ts` *(new)*
- 9 unit tests covering all 6 `getRowStatus` branches + edge cases

### `src/features/orders/useOrdersStore.ts`
- Imports `flashship_mapping.json` statically
- Pre-processes `MAPPING`, `COLOR_FIX`, `SIZE_FIX` at module load
- State: `items`, `checked`, `isLoading`, `error`
- Actions: `importCsv`, `updateItem`, `toggleChecked`, `selectAll`, `clearAll`

### `src/features/orders/OrdersPage.tsx`
- Export XLSX button: wired, shows count, loading spinner, violation guard with red alert
- Submit button: disabled with tooltip "Tính năng đang phát triển"
- `needsAttentionCount` — uses `getRowStatus(item) !== 'ready'` ✅
- Attention banner + CSV error alert — fully Vietnamese ✅

### `src/features/orders/googleSheetExport.ts` *(new — Phase 1b)*
- `saveAccessToken(token)` / `getAccessToken()` / `clearAccessToken()` / `isSignedIn()` — token helpers via `localStorage`
- `checkDuplicates(items, existingIds)` — returns `{ duplicateOrderIds, newItems, duplicateItems }`
- `appendToSheet({ items, checkedIndices, onDuplicatesFound })` — reads existing Order IDs, calls `onDuplicatesFound` if needed, appends rows
- Sheet columns = FlashShip 37 columns + `Order Date/Time`

### `src/features/settings/SettingsPage.tsx` *(planned — Phase 1b)*
- No Google auth here — Sign In/Out is in the header bar

### `vite.config.ts`
```ts
plugins: [react(), viteSingleFile()]
base: './'
chunkSizeWarningLimit: 10_000
```

### `scripts/package.mjs`
- Zips `dist/index.html` → `flashpod_YYYY-MM-DD.zip` on Desktop
- `flashship_mapping.json` is now bundled inside `index.html` (no longer needs to be in the zip)

---

## XLSX Export — 37 Column Mapping

Fixed values regardless of row data:
| Column | Value |
|---|---|
| Shipping method | `1` |
| DTF/DTG | `3` |
| Country | `US` |
| Order ID prefix | `HD -` |

Address-clearing rule: if `linkLabel.trim()` is non-empty → `Phone`, `State`, `Address line 1`, `Address line 2`, `City`, `Zip` all set to `""`.

---

## Row Status Logic

```
locked           → variantId is null/empty
partial          → isPartialLock is true
needs-link-label → linkLabel is empty
needs-design     → designFront AND designBack are both empty
needs-mockup     → mockupFront AND mockupBack are both empty
ready            → all above pass
```

`isRowReady` = status is `ready`.

---

## Build Phases

### Phase 1a — Frontend only ✅ DONE
- [x] Scaffold frontend (Vite + React + TS + Mantine)
- [x] CSV parse in browser
- [x] Variant mapping from static JSON
- [x] Orders table — two-row layout, frozen sort order
- [x] Inline URL editing + live image previews (with retry)
- [x] Image preview modal
- [x] Export to XLSX (37-column FlashShip format)
- [x] Partial order locking + guard
- [x] Single-file build (works via `file://`)
- [x] `pnpm package` → zip on Desktop
- [x] Fix `needsAttentionCount` to use `getRowStatus`
- [x] Vietnamese attention banner
- [x] Navbar width → 140 px

### Phase 1b — Google Sheets Export ← **IN PROGRESS**

> **Prerequisite (one-time Google Cloud setup — ✅ DONE):**
> - OAuth Client ID: `890161770494-...apps.googleusercontent.com` stored in `.env`
> - Fulfillment Sheet ID stored in `.env` as `VITE_GOOGLE_SHEET_FULLFILL_ID`
> - Authorized origins: `http://localhost:3000`, `http://localhost:5173`

**Auth UX:** Sign In / Sign Out button lives in the **header bar** (always visible). Token cached in `localStorage`.

**Tasks:**
- [x] `@react-oauth/google` installed
- [x] `vite-env.d.ts` — typed `ImportMetaEnv`
- [x] `googleSheetExport.ts` — token helpers, `checkDuplicates`, `appendToSheet`; columns = FlashShip 37 + `Order Date/Time`
- [x] `App.tsx` — wrapped with `GoogleOAuthProvider`
- [ ] `App.tsx` header — Google Sign In / Sign Out button + signed-in email display ← **NEXT**
- [ ] `OrdersPage.tsx` — "Lưu vào Google Sheet" button; auto sign-in if needed; duplicate modal (Bỏ qua / Ghi đè / Huỷ)

### Phase 1c — Backend Foundation
- [ ] Scaffold `backend/` — FastAPI + venv
- [ ] Port `csv_parser` + `variant_mapper` from Python V1
- [ ] Build FlashPOD API client (`flashpod_client.py`)
- [ ] Routes: `POST /csv/parse`, `GET /variants`, `POST /orders`, `DELETE /orders/:id`
- [ ] Frontend switches to backend parse (transparent)

### Phase 2 — Direct API Submission
- [ ] Submit flow: confirm popover → `POST /api/orders` → in-place status badges
- [ ] Per-row status: ✅ Submitted / ❌ Failed / ⏳ Pending
- [ ] Retry failed rows
- [ ] XLSX export stays as fallback

### Phase 3 — Design Library
- [ ] Design library page — grid with image previews
- [ ] Create / edit / delete design entry
- [ ] "Apply design" picker on order rows (fills all 4 URLs)
- [ ] Local JSON storage

### Phase 4 — Settings + Bundling
- [ ] Settings page — token entry, UAT/prod toggle
- [ ] macOS Keychain (`keyring`)
- [ ] PyInstaller / pywebview → single `.app`

---

## Known Issues / Notes

- **pnpm hijacked by VS Code task**: `.vscode/tasks.json` auto-starts `pnpm dev` on folder open — run build commands with `./node_modules/.bin/` prefix directly in terminal to avoid interference.
- **Google Drive image warmup**: First image load after a cold session may fail — `GdriveImage` retries up to 3× with 800 ms delay.
- **`null` variants in mapping**: Some entries in `flashship_mapping.json` have `null` values — filtered out in `useOrdersStore.ts` pre-processing.

---

## Changelog

### 2026-05-28: Improved Google Drive image preview sign-in UX
- Sign-in modal now appears on input blur or preview click, only once per field.
- Modal/ignore state is managed per field in `UrlQuad`.
- `GdriveImage` is now stateless for modal logic.
- Login logic and scopes are consistent with `App.tsx`.
- Fully Vietnamese UI for all auth prompts.
