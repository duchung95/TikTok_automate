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

// ...existing content...
