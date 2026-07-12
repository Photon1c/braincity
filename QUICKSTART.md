# BrainCity v3 — Quickstart

## 30-Second Local Run

```bash
cd /home/sherlockhums/systems-lab/observer/braincity
python -m http.server 3007
```

**Or** with Node:
```bash
npx serve . -l 3007
# Open http://localhost:3007
```

**Or** with npm script (after `npm init -y`):
```bash
npm run dev
# Open http://localhost:3007
```

> Must serve over HTTP — ES modules + importmap block `file://` loads.

---

## Deploy to Netlify (2 minutes)

1. **Push to GitHub** (private repo works fine)
2. **Connect to Netlify** → "Add new site" → "Import from Git"
3. **Settings**:
   - Build command: `echo 'static site'`
   - Publish directory: `.`
4. **Deploy** — Netlify auto-detects `netlify.toml`
5. **Enable Netlify Identity** (Site → Identity → Enable) for Lab Edition auth

---

## Controls Cheatsheet

| Action | Key/Click |
|--------|-----------|
| Orbit | Drag |
| Zoom | Scroll |
| Select project | Click building |
| Enter Neural | Click "Go Neural →" |
| Fire neuron | Click center sphere (soma) |
| Traverse dependency | Click outer pod |
| Exit Neural/State | `ESC` or "← Back to City" |
| State Engine | Press `S` in City mode |

---

## Edition URLs

| URL | Edition | Data | Access |
|-----|---------|------|--------|
| `/` | Public | `data/public/` | Public |
| `/?edition=lab` | Laboratory | `data/internal/` | Auth required |
| `/lab/` | Laboratory | `data/internal/` | Auth required |

---

## Project Structure (Key Files)

```
braincity/
├── index.html           # Entry point (loads THREE via importmap)
├── netlify.toml         # Headers, redirects, SPA fallback
├── data/
│   ├── public/          # 66 projects, portfolio-safe
│   ├── internal/        # +21 internal projects
│   └── private/         # +17 private/ops (lab only)
└── src/
    ├── main.js          # Orchestrator, edition detection, state machine
    ├── shared/
    │   ├── dataModel.js    # Graph + visibility/zone filters + loaders
    │   ├── signalEngine.js # Pulse pool (city cascades + neural firing)
    │   ├── cameraRig.js    # Dive/surface/switch transitions
    │   └── hud.js          # DOM HUD (diffed, stable button)
    ├── renderers/
    │   ├── RendererCity.js     # Instanced buildings + cables
    │   └── RendererNeural.js   # Soma + dendrite/axon ring
    └── state/
        └── StateEvolutionEngine.js  # 6D dynamics (S key)
```

---

## Add a New Project (30 seconds)

1. **Edit** `data/public/projects.json` (or `internal/`, `private/`)
2. **Add entry**:
   ```json
   {
     "id": "my-new-project",
     "name": "My New Project",
     "district": "Simulation",
     "type": "simulator",
     "description": "What it does",
     "repoCount": 3,
     "commitActivity": 45,
     "stars": 12,
     "health": 0.7,
     "pressure": 0.3,
     "dependencies": ["lab-data-spine"],
     "zone": "windows",
     "visibility": "public"
   }
   ```
3. **Update** `data/public/manifest.json` → add to `nodes[]` and `links[]`
4. **Reload** browser

---

## Customize Zones (Colors)

Edit `src/shared/dataModel.js`:
```javascript
colors: {
  zone: {
    windows: 0x0088ff,  // Blue
    vps: 0x00ff88,      // Green
    cloud: 0xff8800,    // Orange
    cross: 0xaa44ff     // Purple
  }
}
```

---

## Customize State Dimensions

Edit `src/state/StateEvolutionEngine.js`:
```javascript
const DIMENSIONS = [
  { id: 'persistence', name: 'Persistence', color: 0x00e5ff, ... },
  { id: 'production', name: 'Production', color: 0x00ff88, ... },
  // Add yours:
  { id: 'my-dimension', name: 'My Dimension', color: 0x123456, description: '...' }
];
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank screen | Must serve via HTTP (`python -m http.server` or `npx serve`) |
| "THREE not defined" | Wait for `citybrain:three-ready` event (check console) |
| Lab edition not loading | Enable Netlify Identity + check `?edition=lab` param |
| CORS on data files | `netlify.toml` has `/data/*` headers; check deploy |
| Buildings not clickable | Ensure `pointerdown`/`pointerup` not consumed by drag |

---

## Architecture in One Sentence

> **One renderer, three data sources.** Public/Internal/Private editions share identical rendering code; only the JSON snapshot differs.

---

## Need More?

See [README.md](README.md) for full documentation, architecture notes, and development guide.