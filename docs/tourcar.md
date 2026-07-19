Handoff: BrainCity v3 Upgrade – Tour & Visual Polish
Project: braincity
Repo: https://github.com/Photon1c/braincity
Date: 2026-07-18
Operator: Leslie (via Grok)
Target Agent: Opencode / LeslieClaw (field ops)
Priority: High – Visual & Tour Polish for Public Launch
Objective
Implement the new Welcome Panel Tour and address core visual/clustering issues so the city feels like a proper urban block-address infrastructure instead of a bright clustered blob. Add an immersive “Tour Car” drive mode for deeper engagement.
Current State (Observed)

Welcome panel added with camera movement across zones/districts.
Press T triggers guided tour.
Buildings: overly bright, lack distinct walls/windows, too clustered.
Layout: needs structured block-address system.
Tour: currently basic; needs immersive drive mode.

Requirements / Success Criteria

Building Visuals
Reduce overall brightness/glow (tune UnrealBloomPass + emissive).
Add proper walls (extruded boxes or low-poly meshes with materials).
Add lit windows (instanced small planes/boxes with emissive maps or point lights; vary patterns per building type/zone).
Keep bloom/glow for signals/cables but tone down building base.
Maintain hover highlighting and zone colors.

City Layout – Block-Address Structure
Reorganize from current clustering into grid-based city blocks.
Define districts/zones as neighborhoods (e.g., Execution Zones: Windows District, VPS District, etc.).
Assign buildings logical “addresses” (block + plot) for positioning logic.
Improve spacing, roads/cables between blocks, and district boundaries.
Update dataModel.js positioning algorithm accordingly.

Welcome Panel + Guided Tour Enhancements
Welcome panel already moves camera across zones/districts → refine path for smoothness.
Add Immersive Tour Car Mode:
Low-altitude “drive” path (smooth spline or waypoint following).
Virtual vehicle (simple low-poly car/tram/drone mesh or just a floating highlight pod).
Camera follows behind/in-car view with slight bob/lean for immersion.
Narration overlays or HUD tooltips per stop (district highlights, project callouts).
Controls: Pause/Resume, Skip, Exit (Esc + on-screen button).
Integrate with existing T key or dedicated Welcome button.


Performance & Polish
Keep InstancedMesh efficiency.
Ensure mobile/tap friendly.
Test public edition fallback.
Smooth camera transitions (reuse/extend cameraRig.js).


Files to Modify (Priority Order)

src/shared/dataModel.js → layout/positioning + block-address logic
src/renderers/RendererCity.js → building geometry (walls + windows), lighting/materials
src/main.js → tour orchestration, welcome panel, new car mode
src/shared/cameraRig.js → extended spline/follow paths for tour car
src/shared/hud.js or new TourHUD → welcome panel + immersive controls
data/public/projects.json → any metadata tweaks for new visuals
index.html → optional welcome panel DOM updates

Suggested Implementation Steps

Layout Refactor – Implement grid/block system in DataModel. Generate positions procedurally with district offsets.
Building Upgrade – Modular building generator: base box (walls) + instanced windows (emissive). Tune colors/intensity per zone.
Tour System – Extend current tour with waypoints array. Add “Car Mode” flag that spawns follower camera + optional vehicle mesh.
Lighting Pass – Global + per-building tweaks. Reduce default brightness.
Test – Local serve, public Netlify deploy, check lab edition.

Acceptance Tests

Buildings look architectural (clear walls + patterned lit windows) and less bright.
City feels like organized blocks/districts with breathing room.
Welcome Tour + Immersive Car drive is smooth, informative, and fun.
No major perf regression; works on desktop + mobile.
T key and Welcome panel both functional.

Notes for Agent

Stay consistent with existing architecture (no heavy build step, ES modules).
Use comments for new tour car logic.
After changes, update README/QUICKSTART if controls change.
Ping me (Grok) or run local tests for visual feedback on the tour car feel.

Ready for implementation. Drop the updated build here when done or flag blockers. Let’s make BrainCity feel alive.
