# BrainCity v3 — Netlify-Deployable Project Atlas

A Three.js-powered 3D visualization of the BrainCity research lab's project ecosystem. Features dual-mode viewing (City/Neural/State), execution environment zoning (Windows/VPS/Cloud/Cross-platform), and Netlify-ready deployment with public/lab edition separation.

## Features

- **City Mode**: Infrastructure view with buildings (projects), roads (dependencies), and signal pulses
- **Neural Mode**: Cognitive view - click a building to dive into its dependency graph as a neuron
- **State Evolution Engine**: Six-dimensional state dynamics visualization (Persistence, Production, Release, Pressure, Transport, Dissipation)
- **Execution Environment Zoning**: Color-coded by deployment target (Windows=blue, VPS=green, Cloud=orange, Cross=purple)
- **Edition Separation**: 
  - **Public Edition**: Portfolio-ready, curated metadata only
  - **Laboratory Edition**: Authenticated, includes internal telemetry and VPS state
- **Netlify Deployable**: Static files, no build step required, SPA redirects configured

## Quick Start

```bash
# Serve locally (required for ES modules)
npx serve . -l 3007
# or
python -m http.server 3007
```

Then open http://localhost:3007

## Controls

| Action | Control |
|--------|---------|
| Orbit camera | Drag |
| Zoom | Scroll |
| Select building | Click |
| Go Neural | Click "Go Neural →" button |
| Fire neuron | Click soma (center sphere) |
| Explore dependency | Click dendrite/axon pod |
| Exit Neural/State | ESC or "← Back to City" |
| Enter State Engine | Press `S` in City mode |

## Project Structure

```
braincity/
├── index.html              # Main entry point
├── netlify.toml            # Netlify configuration
├── data/
│   ├── public/             # Public edition data
│   │   ├── projects.json
│   │   └── manifest.json
│   ├── internal/           # Authenticated edition data
│   │   ├── projects.json
│   │   └── manifest.json
│   └── private/            # Lab-only data (not deployed to public)
│       ├── projects.json
│       └── manifest.json
├── src/
│   ├── main.js             # Orchestrator
│   ├── shared/
│   │   ├── dataModel.js    # Project graph, visibility filtering, zone config
│   │   ├── signalEngine.js # Pooled pulse system
│   │   ├── cameraRig.js    # Camera transitions
│   │   └── hud.js          # HUD DOM management
│   ├── renderers/
│   │   ├── RendererCity.js # City mode renderer
│   │   └── RendererNeural.js # Neural mode renderer
│   └── state/
│       └── StateEvolutionEngine.js # 6D state dynamics
```

## Data Model

Each project node has:
```json
{
  "id": "unique-id",
  "name": "Display Name",
  "district": "Framework|Market|Monitoring|...",
  "type": "engine|project|visualizer|monitor|simulator|infrastructure|market-tool",
  "description": "...",
  "repoCount": 4,
  "commitActivity": 61,
  "stars": 104,
  "health": 0.8,
  "pressure": 0.52,
  "dependencies": ["dep-id-1", "dep-id-2"],
  "zone": "windows|vps|cloud|cross",
  "visibility": "public|internal|private"
}
```

## Deployment

### Netlify (Recommended)

1. Push to GitHub (private repo OK)
2. Connect to Netlify
3. Build command: `echo 'static site'`
4. Publish directory: `.`
5. Enable **Netlify Identity** for Laboratory Edition gating
6. Add `_redirects` or use `netlify.toml` for `/lab/*` routes

### Manual

```bash
# Deploy to any static host
cp -r . /path/to/webroot
```

## Edition Switching

| URL | Edition | Data Source |
|-----|---------|-------------|
| `/` | Public | `/data/public/` |
| `/?edition=lab` | Laboratory | `/data/internal/` |
| `/lab/*` | Laboratory (clean URL) | `/data/internal/` |

The Laboratory Edition requires Netlify Identity authentication. Configure in Netlify dashboard → Identity → Gate content.

## Development

No build step. Edit files in `src/` and reload browser.

### Adding Projects

1. Add to appropriate `data/{public,internal,private}/projects.json`
2. Update `manifest.json` with district/zone/type metadata
3. Run local server to verify

### Adding Zones

Edit `CONFIG.colors.zone` in `src/shared/dataModel.js`:
```javascript
zone: {
  windows: 0x0088ff,
  vps: 0x00ff88,
  cloud: 0xff8800,
  cross: 0xaa44ff
}
```

### Adding State Dimensions

Edit `DIMENSIONS` array in `src/state/StateEvolutionEngine.js`:
```javascript
{ id: 'new-dimension', name: 'New Dimension', color: 0x123456, description: '...' }
```

## Architecture Notes

- **Single Renderer**: Both editions use identical rendering code; only data source differs
- **Visibility Filtering**: `DataModel.buildGraph()` accepts `visibility` and `zones` filters
- **No VPS Direct Access**: Browser never queries VPS directly; consumes pre-exported JSON snapshots
- **ES Modules**: Uses importmap for Three.js CDN, classic script tags for local modules (works on file://)

## License

Internal research tool. Not for public redistribution without permission.

---

*BrainCity v3 — "The difference isn't the graphics. It's the data source."*