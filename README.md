# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## CONCODE travel planner

TripVerse sends planning requests to its own `/api/chat` Vercel Function. That function
forwards to CONCODE's `/api/v1/travel` endpoint with a server-only API key. Set these
two environment variables in Vercel for Production, Preview, and Development as needed:

```text
CONCODE_API_URL=https://api.concode.ai
CONCODE_API_KEY=<the same secret configured on the CONCODE server>
```

Do not use a `VITE_` prefix for either value and do not add the key to the Android or
iOS app. If CONCODE is unavailable, TripVerse retains its deterministic local itinerary
suggestion and labels it as a fallback; it does not switch to another AI provider.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
