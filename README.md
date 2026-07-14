# BrainCity v3 — Netlify-Deployable Project Atlas

A Three.js-powered 3D visualization of the BrainCity research lab's project ecosystem. Features dual-mode viewing (City/Neural/State), execution environment zoning (Windows/VPS/Cloud/Cross-platform), and Netlify-ready deployment with public/lab edition separation.

## Features

- **City Mode**: Zone-colored buildings (projects) with window lights, cable network (dependencies), signal pulses, and zone boundary labels
- **Neural Mode**: Cognitive view — click a building to dive into its dependency graph as a neuron with soma/pod firing and signal propagation
- **State Evolution Engine**: Six-dimensional state dynamics visualization (Persistence, Production, Release, Pressure, Transport, Dissipation)
- **Execution Environment Zoning**: Color-coded by deployment target (Windows=blue, VPS=green, Cloud=orange, Cross=purple)
- **Camera Focus**: Click a building to smoothly fly the camera to it; orbit controls re-enabled on arrival
- **Hover Highlighting**: Hover over a building to highlight its connected dependency cables
- **Bloom Glow**: UnrealBloomPass for atmospheric glow, tuned for dark theme
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
| Select building | Click (camera auto-focuses) |
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
│   ├── main.js             # Orchestrator (scene setup, animation loop, pointer events)
│   ├── shared/
│   │   ├── dataModel.js    # Project graph, visibility filtering, zone config, position assignment
│   │   ├── signalEngine.js # Pooled pulse system
│   │   ├── cameraRig.js    # Camera transitions
│   │   └── hud.js          # HUD DOM management
│   ├── ui/
│   │   └── SidePanel.js    # Project list side panel with search and selection
│   ├── renderers/
│   │   ├── RendererCity.js # City mode renderer (InstancedMesh per type/zone, window lights, cables)
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

When no `projects.json` is found, the app falls back to procedurally generated projects.

## Deployment

### Netlify (Recommended)

1. Push to GitHub (private repo OK)
2. Connect to Netlify
3. Build command: `echo 'static site'`
4. Publish directory: `.`
5. Enable **Netlify Identity** for Laboratory Edition gating

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
2. Run local server to verify (generated fallback activates when file missing)

### Adding Zones

Edit `CONFIG.colors.zone` in `src/shared/dataModel.js`:
```javascript
zone: {
  windows: 0x88ccff,
  vps: 0x88ffaa,
  cloud: 0xffcc88,
  cross: 0xcc99ff
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
- **InstancedMesh**: Buildings rendered via multiple `InstancedMesh` objects grouped by (type, zone) pair for per-zone coloring without relying on vertexColors + instanceColor

## License

Internal research tool. Not for public redistribution without permission.

---

*BrainCity v3 — "The difference isn't the graphics. It's the data source."*
