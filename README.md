## Wheatfill Precision Health

Telehealth landing site + patient portal + provider portal with a real multi-user backend, scheduling, ordering, and Stripe Hosted Checkout.

### Local development
- **Frontend**: `npm install` then `npm run dev -- --port 5176`
- **Backend**:
  - `cd backend`
  - `npm install`
  - `cp .env.example .env` (then set `JWT_SECRET`)
  - `npm run dev`

Default URLs:
- **Web**: `http://localhost:5176`
- **API**: `http://localhost:8080`

### API URL override (useful for GitHub Pages)
You can point the frontend at a deployed backend by setting either:
- `localStorage.wph_api_url_v1 = "https://your-api-domain"`
- or `?api=https://your-api-domain` query param once (it persists)

### Data retention & audit logging
See `backend/RETENTION.md`.

### HIPAA-safe hosting split (recommended)
This repo supports two deploy modes:

- **Marketing-only (GitHub Pages)**: no PHI routes or forms. Safe to host on GitHub Pages.
  - Build: `npm run build:marketing`
  - Configure: copy `.env.marketing.example` to `.env.marketing` and set `VITE_APP_URL` to your AWS app domain.

- **Full app (AWS)**: Patient Portal / Provider Portal / messaging / intake / booking.
  - Host on **AWS (BAA)**, not GitHub Pages.

---

## (Template notes)

This repo started from a Vite template.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
