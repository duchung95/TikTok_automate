# TikTok Shop → FlashPOD Web App — Plan & Status

_Last updated: 2025-07 (session 3)_

---

## Architecture

```
TiktokShop/
├── web_app/
│   └── frontend/                # React + Vite (TypeScript)
│       ├── src/
│       │   ├── features/
│       │   │   └── orders/      # CSV parse, table, export XLSX
│       │   ├── App.tsx          # AppShell layout + routing
│       │   └── flashship_mapping.json  # statically imported (no fetch)
│       ├── scripts/
│       │   ├── package.mjs      # zip build → Desktop
│       │   └── start.command    # (legacy, no longer needed for distribution)
│       ├── vite.config.ts       # base: './', viteSingleFile plugin
│       └── package.json
│
└── docs/
    └── web-app-plan.md          # This file
```

**Runtime**: Single `index.html` (all JS/CSS inlined by `vite-plugin-singlefile`).
Works by double-clicking — no server, no port, no Electron needed.

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
| Tests | Vitest |
| Routing | React Router 6 |

---

## Current Status (Phase 1a — Frontend, no backend)

### ✅ Done

| Feature | Notes |
|---|---|
| CSV parsing | `parseCsvRows`, `markPartialOrders`, `isRowReady` — 43 tests |
| Variant mapping | Nested JSON, numeric IDs, color/size aliases (`mapVariant`) |
| 6-state RowStatus | `locked / partial / needs-link-label / needs-design / needs-mockup / ready` |
| Vietnamese status badges | `❌ Thiếu Variant ID`, `⚠️ Đơn không đầy đủ`, `�� Cần Link Label`, `🖼 Cần URL thiết kế`, `🖼 Cần URL mockup`, `✅ Sẵn sàng` |
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
| Submit button disabled | Permanently disabled with Mantine `Tooltip`: "Tính năng đang phát triển" |
| 81 tests passing | gdriveUtils: 10, csvParser: 43, exportXlsx: 28 |
| Committed & pushed | Commit `435443e` on branch `add-web-app` |

### ❌ Pending (Phase 1a)

| Item | Notes |
|---|---|
| `needsAttentionCount` fix | `OrdersPage.tsx` uses old logic (`!item.variantId \|\| !item.designFront`). Should use exported `getRowStatus` from `OrdersTable.tsx` |
| Attention banner Vietnamese | Banner title/body still in English — needs Vietnamese copy |
| Navbar width | `App.tsx` navbar still 200 px — requested 140 px |

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
- `getRowStatus(item): RowStatus` — **not yet exported** (needed by `OrdersPage.tsx`)
- `GdriveImage` — retry-on-error image component with preview modal
- `UrlQuad` — 4 URL input + thumbnail columns
- Frozen row order via `frozenOrderRef` + `prevLengthRef`

### `src/features/orders/useOrdersStore.ts`
- Imports `flashship_mapping.json` statically
- Pre-processes `MAPPING`, `COLOR_FIX`, `SIZE_FIX` at module load
- State: `items`, `checked`, `isLoading`, `error`
- Actions: `importCsv`, `updateItem`, `toggleChecked`, `selectAll`, `clearAll`

### `src/features/orders/OrdersPage.tsx`
- Export XLSX button: wired, shows count, loading spinner, violation guard with red alert
- Submit button: disabled with tooltip "Tính năng đang phát triển"
- `needsAttentionCount` — **uses old logic** (not yet fixed)
- Attention banner — **still in English** (not yet fixed)

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

### Phase 1a — Frontend only ← **IN PROGRESS**
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
- [ ] Fix `needsAttentionCount` to use `getRowStatus`
- [ ] Vietnamese attention banner
- [ ] Navbar width → 140 px

### Phase 1b — Backend Foundation
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
