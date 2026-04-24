## Open this site locally (Windows)

If you double-click `index.html`, you’ll get a blank page. This is a Vite React app, so it must be served over `http://localhost`.

### Option A — easiest (recommended)
1. Double-click `start-local.bat`
2. It starts **two** things: a second **command window** for the **API** (`http://localhost:8080`) and this project’s Vite **site** (`http://localhost:5176`). Leave **both** open.
3. Wait for it to open a browser tab to:
   - `http://localhost:5176`

### Option B — manual
Two terminals:

**Terminal 1 — API**

```powershell
cd backend
npm install
npm run dev
```

**Terminal 2 — site**

```powershell
cd <this repo>
npm install
$env:VITE_MARKETING_ONLY=1; npm run dev -- --mode marketing --port 5176
```

Then open `http://localhost:5176`.

### Booking / contact forms (`localhost:8080`)

- **Vite** only serves the web UI. The **Node backend** in `/backend` is a separate app on port **8080**; the forms POST there.
- If the API is not on your machine, set `VITE_API_URL` or open the site once with `?api=https://…` (see `src/api/client.ts`).

The front page must be opened as `http://localhost:5176` (Vite), not as a file.

### “I want to open a built copy”
Build and preview:

```powershell
npm run build
npm run preview -- --port 4176
```

Then open:
- `http://localhost:4176`

