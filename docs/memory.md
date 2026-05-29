# Project Memory (as of 2026-05-28)

## Google OAuth & Auth Context
- All Google OAuth logic is managed globally via `GoogleAuthContext` (React Context).
- All features (Google Sheets export, Google Drive image preview, modal logic) use this context for authentication state and actions.
- Sign-in and sign-out are handled via context, with a single source of truth for `signedIn`, `accessToken`, and `error`.

## Testing
- All tests for authentication, export, and UI logic are passing (127/127).
- `useGoogleLogin` is mocked in tests to simulate both success and error flows.
- All button queries use `data-testid` for unambiguous selection (e.g., `sign-in-btn`, `sign-out-btn`).
- Each test targets only the intended consumer/component, ensuring state isolation and reliability.
- Edge cases for sign-in, sign-out, error, and localStorage are covered.

## Code Quality
- Code and tests follow KISS, DRY, and TypeScript-first principles.
- Mantine is used for all UI components.
- The codebase is modular, testable, and clean, with all recent issues around ambiguous selectors and test state isolation resolved.

---

_Last updated: 2026-05-28_
