## Open this site locally (Windows)

If you double-click `index.html`, you’ll get a blank page. This is a Vite React app, so it must be served over `http://localhost`.

### Option A — easiest (recommended)
1. Double-click `start-local.bat`
2. Wait for it to open a browser tab to:
   - `http://localhost:5176`

### Option B — manual
In PowerShell (inside this folder):

```powershell
npm install
npm run dev -- --port 5176
```

Then open:
- `http://localhost:5176`

### “I want to open a built copy”
Build and preview:

```powershell
npm run build
npm run preview -- --port 4176
```

Then open:
- `http://localhost:4176`

