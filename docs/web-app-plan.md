# Web App — Product Plan

## Overview

A React + Python desktop app that replaces the current tkinter tool.
- **Frontend**: React + TypeScript + Vite + Mantine
- **Backend**: Python FastAPI (runs locally)
- **Bundling**: PyInstaller + pywebview → single `.app` (no setup required on other machines)
- **Package manager**: pnpm (frontend), pip/venv (backend)

---

## Architecture

```
web_app/
├── backend/                   # Python FastAPI
│   ├── main.py                # App entry point, starts server
│   ├── routers/
│   │   ├── orders.py          # CSV parse + FlashPOD order CRUD
│   │   ├── designs.py         # Design library management
│   │   └── flashpod.py        # FlashPOD API proxy routes
│   ├── services/
│   │   ├── flashpod_client.py # FlashPOD HTTP client (all API calls)
│   │   ├── csv_parser.py      # TikTok CSV → order items (ported from existing code)
│   │   └── variant_mapper.py  # flashship_mapping.json lookups
│   ├── models/
│   │   └── schemas.py         # Pydantic models (OrderItem, Design, etc.)
│   └── tests/                 # pytest — ported from existing 434 tests
│
├── frontend/                  # React + Vite
│   └── src/
│       ├── features/
│       │   ├── orders/        # Orders table, CSV upload, submit
│       │   ├── designs/       # Design library with image previews
│       │   └── settings/      # API token config, UAT/prod toggle
│       ├── api/               # Typed fetch wrappers for backend
│       └── components/        # Shared UI components
│
└── docs/
    └── web-app-plan.md        # This file
```

---

## UI Design

### Layout — Mantine AppShell
- `AppShell` with a persistent left `Navbar` + `Header`
- **React Router** for routing — each page is a proper route
- Adding future features = new route + new nav item only

```
┌─────────────────────────────────────────────────────┐
│  🛍 TikTok → FlashPOD        [UAT ●]  [Settings ⚙] │  ← AppShell.Header
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ 📦 Orders │   <-- routed content (AppShell.Main)    │  ← /orders
│          │                                          │
│ 🎨 Designs│                                        │  ← /designs
│          │                                          │
│ ⚙ Settings│                                       │  ← /settings
│          │                                          │
└──────────┴──────────────────────────────────────────┘
     ↑ AppShell.Navbar
```

### Orders Page — single table, smart visual hierarchy (no tabs)

**No tabs.** Everything is one flat table. Smart sorting and visual cues guide the user naturally.

#### Attention banner (sticky, above the table)
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠ 8 orders need design URLs               [Jump to first ↓]│
└─────────────────────────────────────────────────────────────┘
```
- Mantine `Alert` component, only shown when incomplete rows exist
- **[Jump to first ↓]** scrolls to the first row that needs attention
- Disappears automatically when all rows are complete

#### Toolbar (below banner)
```
[📂 Upload CSV]   [☑ Select All]   [Export XLSX]   [Submit X orders →]
```

#### Table — default sort: needs attention first
```
┌──────────────────────────────────────────────────────────────┐
│ 🔴 HD-001 │ John D. │ ...  ← locked, missing variant ID      │
│ 🟡 HD-002 │ Jane S. │ ...  ← needs design URL filled  ✏     │
│ 🟡 HD-003 │ Bob K.  │ ...  ← needs design URL filled  ✏     │
│ ✅ HD-004 │ Alice M.│ ...  ← ready to export/submit          │
│ ✅ HD-005 │ Carol T.│ ...  ← ready to export/submit          │
└──────────────────────────────────────────────────────────────┘
```

- **Rows needing attention float to the top** on CSV load
- User never needs to scroll to find incomplete rows
- Row coloring uses Mantine `Table` row props — no custom CSS needed
- Checkboxes work exactly like V1: user checks what they want → Export or Submit

#### Row states
| State | Visual |
|---|---|
| Missing Variant ID | 🔴 Red `Badge`, row locked (cannot check) |
| Needs design URL | 🟡 Yellow `Badge` + ✏ indicator, checkable |
| Ready | ✅ Green `Badge`, checkable |
| Submitted | ✅ Green `Badge` + "Submitted", greyed out |
| Failed | ❌ Red `Badge`, stays checked, error in `Tooltip` |
| Pending | ⏳ Mantine `Loader`, row disabled during API call |

#### Two-row layout per order
- **Top row**: checkbox, order date, order ID, customer, product/variation, variant ID, qty, address
- **Bottom row**: design URL fields with live image previews (`Mantine Image`) + status `Badge`
- Click URL field → `TextInput` inline editor
- Click 📚 → `Popover` to pick from Design Library (auto-fills all 4 URLs)



---

## Submission Flow (Option A + lightweight confirm)

1. User uploads TikTok CSV → table populates
2. User fills design URLs row by row (image previews load live)
3. User checks ☑ rows to submit
4. Clicks **[Submit X orders →]** (disabled until ≥1 valid row is checked)
5. Small inline confirmation popover appears:
   ```
   Submit 3 orders to FlashPOD?   [Cancel]  [Confirm →]
   ```
6. Each checked row fires `POST /api/orders` → FlashPOD API
7. Rows update in-place with status badge (✅ / ❌ / ⏳)
8. Failed rows stay checked — user can fix + retry

### "Ready to submit" criteria per row
- ☑ Checked
- Valid Variant ID exists
- Design Front URL is filled (required by FlashPOD)
- Not already successfully submitted

### Optional fields (no block on submit, soft warning only)
- Design Back, Mockup Front, Mockup Back, Link Label

---

## Design Library

- Saved locally as JSON (no database for now — easy to migrate later)
- Each design: name, tags, design front URL, design back URL, mockup front URL, mockup back URL, thumbnail preview
- Accessible via 📚 button on any order row → popover with image grid
- Select a design → auto-fills all 4 URL fields on that row instantly

---

## Settings

- API token input (stored in macOS Keychain via `keyring`, not in files)
- Toggle: UAT ↔ Production API URL
- On first launch: prompt user to enter token if none found in Keychain

---

## Secrets / Environment

- `.env` — local dev only, **never committed** (in `.gitignore`)
- `.env.example` — committed, no real token
- Production: token stored in macOS Keychain, read at runtime

---

## Bundling

### Phase 1a — No backend
- Vite built with `base: "./"` so all asset paths are relative (works via `file://`)
- `launcher.py` uses `pywebview` to open `dist/index.html` directly from disk — no server, no port
- PyInstaller bundles `launcher.py` + `dist/` → single `TikTokShopWeb.app`
- Estimated size: ~15–20 MB

### Phase 1b+ — With FastAPI backend
- `launcher.py` starts FastAPI on a random free port, waits until ready, then opens pywebview at `localhost:{port}`
- Same double-click experience for the user — transparent upgrade
- Estimated size: ~25–30 MB

### Key Vite config
```ts
// vite.config.ts
export default defineConfig({
  base: "./",  // relative paths → works via file:// and localhost
})
```

Output: single `TikTokShopWeb.app` + zip — same install experience as current app (V1)

---

## Build Phases

### Phase 1a — Frontend (no backend required) ← START HERE
Goal: users can use the app immediately while backend is being built.

- [ ] Scaffold `frontend/` — Vite + React + TypeScript + Mantine (pnpm)
- [ ] CSV parsed in the browser (pure JS — no backend needed)
- [ ] Variant mapping loaded from `flashship_mapping.json` as a static asset
- [ ] Orders table — two-row layout per order
- [ ] Inline URL editing + live validation
- [ ] Image previews in table cells (Google Drive thumbnails)
- [ ] **Export to XLSX** using `exceljs` (same format as current app — works today)
- [ ] Partial order locking (red/orange rows)
- [ ] Select all / bulk check

### Phase 1b — Backend Foundation
Goal: scaffold the backend so API submission can be added without reworking the frontend.

- [ ] Scaffold `backend/` — FastAPI + folder structure + venv
- [ ] Port `csv_parser` + `variant_mapper` from existing Python code
- [ ] Build FlashPOD API client (`flashpod_client.py`)
- [ ] Backend routes: `POST /csv/parse`, `GET /variants`, `POST /orders`, `DELETE /orders/:id`
- [ ] Frontend switches from in-browser parse → backend parse (transparent to user)

### Phase 2 — Direct API Submission
Goal: submit orders directly to FlashPOD. Excel export stays as fallback.

- [ ] Submit flow: confirm popover → `POST /api/orders` → in-place status badges
- [ ] Status badges per row (✅ Submitted / ❌ Failed / ⏳ Pending)
- [ ] Retry failed rows
- [ ] Excel export remains available as fallback

### Phase 3 — Design Library
- [ ] Design library page — grid of saved designs with image previews
- [ ] Create / edit / delete design
- [ ] "Apply design" picker on order rows (fills all 4 URLs at once)
- [ ] Local JSON storage (no DB — easy to migrate later)

### Phase 4 — Settings + Bundling
- [ ] Settings page — token entry, UAT/prod toggle
- [ ] macOS Keychain integration (`keyring`)
- [ ] PyInstaller build script (`build_web_mac.sh`)
- [ ] pywebview wrapper (`launcher.py`) → single `.app` like current app
