// ...existing content...

## Environment Variables

This project uses environment variables for configuration. Vite automatically loads the following files in order of priority:

1. `.env` – Base variables for all environments.
2. `.env.local` – Local overrides (not committed).
3. `.env.[mode]` – Mode-specific (e.g., `.env.development`, `.env.production`).
4. `.env.[mode].local` – Local overrides for a specific mode (not committed).

For local development, you can create a `.env.development` or `.env.local` file in the `web_app/frontend` directory. Example:

```
VITE_GOOGLE_SHEET_ID=your-local-test-sheet-id
VITE_API_URL=http://localhost:3000/api
```

- Only variables prefixed with `VITE_` are exposed to your frontend code.
- Do not commit secrets to `.env`, `.env.development`, or any file tracked by git.

See `.env.development.example` for a template.

## Deployment (GitHub Pages)

This project can be deployed to GitHub Pages from the `web_app/frontend` directory.

Quick steps:

1. Install the deploy helper (already added):

```bash
pnpm install --save-dev gh-pages
```

2. Build and deploy:

```bash
pnpm run build
pnpm run deploy.  ## this will get deploy to our Github page
```

The `deploy` script pushes the built `dist` to the `gh-pages` branch.

Notes:
- Ensure `homepage` (if used) in `package.json` or the `vite` base is configured for your GitHub Pages URL.
- The `start.command` remains useful for local testing and OAuth during development.

// ...existing content...
