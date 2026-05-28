# TikTok Shop → FlashPOD Order Processor

A local web app that reads a **TikTok Shop CSV export**, lets you fill in design/mockup URLs, and exports to either a **FlashShip XLSX file** or a **Google Sheet**.

---

## Running the App

Double-click `start.command` inside the zip folder.

> **First time on a new Mac:** right-click → **Open** to bypass the macOS Gatekeeper warning. After that, double-click works normally.

This starts a local server at `http://localhost:3000` and opens the app in your browser automatically. No installation needed — Python 3 is built into every modern Mac.

---

## Usage

1. Click **Nhập CSV** and select your TikTok Shop order export
2. Fill in **Link Label**, **Design Front/Back**, **Mockup Front/Back** URLs for each order
3. Check the orders you want to export
4. Click **Export XLSX** to download a FlashShip-ready file, **or**
5. Click **Lưu vào Google Sheet** to append directly to the fulfillment Google Sheet

---

## Google Sign-In Setup (one-time, per Google Cloud project)

The app uses Google OAuth to write to Google Sheets. Follow these steps **once** to set it up:

### Step 1 — Create a Google Cloud Project
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top left) → **New Project**
3. Name it `FlashPOD App` → **Create**

### Step 2 — Enable APIs
1. **APIs & Services** → **Library**
2. Search **"Google Sheets API"** → **Enable**
3. Search **"Google Drive API"** → **Enable**

### Step 3 — Configure OAuth Consent Screen
1. **APIs & Services** → **OAuth consent screen**
2. Choose **External** → **Create**
3. Fill in:
   - App name: `FlashPOD`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue** through all steps

### Step 4 — Add Test Users
> ⚠️ While the app is in **Testing** mode, only explicitly added users can sign in.

1. **APIs & Services** → **OAuth consent screen**
2. Scroll to **Test users** → **+ Add Users**
3. Add the Gmail address(es) that will use the app
4. Click **Save**

### Step 5 — Create OAuth Client ID
1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `FlashPOD Local`
4. Under **Authorised JavaScript origins** add:
   ```
   http://localhost:3000
   http://localhost:5173
   http://localhost:5174
   ```
5. Click **Create** — copy the **Client ID** (ends in `.apps.googleusercontent.com`)

### Step 6 — Configure the App
Copy `.env.example` to `.env` and fill in your values:
```bash
cp web_app/frontend/.env.example web_app/frontend/.env
```

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_SHEET_FULLFILL_ID=your-sheet-id-here
```

The Sheet ID is in the Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
```

---

## Development

```bash
cd web_app/frontend
pnpm install
pnpm dev        # dev server at http://localhost:5173
pnpm test       # run unit tests
pnpm build      # production build
pnpm package    # build + zip → Desktop
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 + `vite-plugin-singlefile` |
| UI | Mantine 7 |
| Table | TanStack Table 8 |
| CSV parse | papaparse |
| XLSX export | ExcelJS |
| Google Auth | `@react-oauth/google` |
| Tests | Vitest |
