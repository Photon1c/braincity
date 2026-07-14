/* =========================================================================
   shared/dataModel.js
   The single source of truth. No THREE.js, no rendering code — just the
   project graph with visibility filtering and execution environment zoning.
   ========================================================================= */
(function () {
    const CONFIG = {
        world: {
            citySize: 900,
            districtNames: [
                'Framework',
                'Infrastructure & Ops',
                'Market',
                'Monitoring',
                'Mythopoetic Narrative',
                'Simulation',
                'Investigation',
                'Nature & Ecology',
                'Visualization',
                'Agents & AI'
            ],
            districtRadius: 260,
            districtSpread: 110,
            nodesPerDistrict: [4, 8]
        },
        building: { widthRange: [5, 20], heightRange: [10, 140], depthFactor: 1 },
        neural: {
            home: [0, 150, 0],
            somaRadiusRange: [4, 10],
            podRadiusRange: [1.4, 3.2],
            dendriteRadius: 26,
            axonRadius: 42
        },
        colors: {
            healthy: 0x00e5ff,
            stressed: 0xff0066,
            cableLow: 0x443322,
            cableHigh: 0xffaa44,
            dendrite: 0x00e5ff,
            axon: 0xffaa00,
            zone: {
                windows: 0x88ccff,  // Light blue
                vps: 0x88ffaa,      // Light green
                cloud: 0xffcc88,    // Light orange/peach
                cross: 0xcc99ff     // Light purple
            }
        },
        signal: {
            pulseSpeed: 90,
            cityMaxPulses: 320,
            neuralMaxPulses: 64,
            cascadeDelay: 140,
            maxDepth: 3,
            cityAmbientRate: 0.05,
            neuralAmbientRate: 0.15
        },
        bloom: { strength: 0.8, radius: 0.5, threshold: 0.1 },
        camera: { fov: 52, near: 0.1, far: 4000 },
        transitionDuration: { dive: 1.6, surface: 1.6, switch: 0.7 }
    };

    const ZONES = {
        WINDOWS: 'windows',
        VPS: 'vps',
        CLOUD: 'cloud',
        CROSS: 'cross'
    };

    const VISIBILITY = {
        PUBLIC: 'public',
        INTERNAL: 'internal',
        PRIVATE: 'private'
    };

    const ADJ = ['swift', 'quiet', 'iron', 'ember', 'lunar', 'coral', 'violet', 'ghost', 'solar', 'echo', 'onyx', 'amber'];
    const NOUN = ['otter', 'falcon', 'harbor', 'relay', 'atlas', 'cipher', 'ridge', 'vector', 'nova', 'drift', 'anchor', 'pulse'];
    const TYPES = ['engine', 'project', 'visualizer', 'monitor', 'simulator', 'infrastructure', 'market-tool'];

    function rand(min, max) { return min + Math.random() * (max - min); }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

    function generateProjects() {
        const projects = [];
        let id = 0;
        const districtCount = CONFIG.world.districtNames.length;
        CONFIG.world.districtNames.forEach((districtName, di) => {
            const angle = (di / districtCount) * Math.PI * 2;
            const cx = Math.cos(angle) * CONFIG.world.districtRadius;
            const cz = Math.sin(angle) * CONFIG.world.districtRadius;
            const count = randInt(...CONFIG.world.nodesPerDistrict);
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * CONFIG.world.districtSpread;
                const position = { x: cx + Math.cos(a) * r, y: 0, z: cz + Math.sin(a) * r };
                const zone = pick(Object.values(ZONES));
                projects.push({
                    id: id++,
                    name: `${pick(ADJ)}-${pick(NOUN)}`,
                    type: pick(TYPES),
                    district: districtName,
                    repoCount: randInt(1, 12),
                    commitActivity: randInt(5, 100),
                    stars: randInt(0, 500),
                    health: Math.random(),
                    pressure: Math.random(),
                    dependencies: [],
                    position,
                    phaseOffset: Math.random() * Math.PI * 2,
                    activityFreq: 0.3 + Math.random() * 0.6,
                    zone,
                    visibility: VISIBILITY.PUBLIC
                });
            }
        });
        return projects;
    }

    function assignDependencies(projects) {
        const byDistrict = {};
        projects.forEach(p => (byDistrict[p.district] ||= []).push(p));
        projects.forEach(p => {
            const depCount = randInt(1, 3);
            const chosen = new Set();
            let guard = 0;
            while (chosen.size < depCount && guard++ < 20) {
                const localPool = byDistrict[p.district];
                const target = (Math.random() < 0.7 && localPool.length > 1) ? pick(localPool) : pick(projects);
                if (target.id !== p.id) chosen.add(target.id);
            }
            p.dependencies = [...chosen];
        });
    }

    function buildEdges(projects, byId) {
        const seen = new Set();
        const edges = [];
        projects.forEach(p => {
            p.dependencies.forEach(depId => {
                const key = `${p.id}_${depId}`;
                if (seen.has(key)) return;
                seen.add(key);
                const target = byId.get(depId);
                if (target) {
                    edges.push({ a: p.id, b: depId, length: Math.max(dist(p.position, target.position), 1), health: (p.health + target.health) / 2 });
                }
            });
        });
        return edges;
    }

    function buildAdjacency(edges) {
        const adj = new Map();
        edges.forEach((e, idx) => {
            if (!adj.has(e.a)) adj.set(e.a, []);
            if (!adj.has(e.b)) adj.set(e.b, []);
            adj.get(e.a).push({ edgeIndex: idx, neighborId: e.b });
            adj.get(e.b).push({ edgeIndex: idx, neighborId: e.a });
        });
        return adj;
    }

    function filterProjectsByVisibility(projects, allowedVisibilities) {
        const allowed = new Set(allowedVisibilities);
        return projects.filter(p => allowed.has(p.visibility));
    }

    function filterProjectsByZone(projects, allowedZones) {
        if (!allowedZones || allowedZones.length === 0) return projects;
        const allowed = new Set(allowedZones);
        return projects.filter(p => allowed.has(p.zone));
    }

    function buildGraph(rawProjects, options = {}) {
        const { visibility = [VISIBILITY.PUBLIC], zones = [] } = options;
        let projects = rawProjects;

        projects = filterProjectsByVisibility(projects, visibility);
        projects = filterProjectsByZone(projects, zones);

        const byId = new Map(projects.map(p => [p.id, p]));
        projects.forEach(p => {
            p.dependencies = p.dependencies.filter(depId => byId.has(depId));
        });

        assignPositions(projects);

        const edges = buildEdges(projects, byId);
        const adjacency = buildAdjacency(edges);

        return { projects, byId, edges, adjacency, CONFIG, ZONES, VISIBILITY };
    }

    function assignPositions(projects) {
        const districtCount = CONFIG.world.districtNames.length;
        const districtMap = {};
        CONFIG.world.districtNames.forEach((name, i) => {
            const angle = (i / districtCount) * Math.PI * 2;
            districtMap[name] = {
                cx: Math.cos(angle) * CONFIG.world.districtRadius,
                cz: Math.sin(angle) * CONFIG.world.districtRadius
            };
        });

        // Organize by zone for better city layout
        const zoneOrder = [ZONES.WINDOWS, ZONES.VPS, ZONES.CLOUD, ZONES.CROSS];
        const zoneAngles = {
            [ZONES.WINDOWS]: -Math.PI / 2,   // South
            [ZONES.VPS]: 0,                   // East
            [ZONES.CLOUD]: Math.PI / 2,       // North
            [ZONES.CROSS]: Math.PI            // West
        };
        const zoneRadius = CONFIG.world.districtRadius * 0.7;
        const zoneSpread = CONFIG.world.districtSpread * 0.8;

        // Group by zone within each district
        const projectsByZone = {};
        projects.forEach(p => {
            const zone = p.zone || ZONES.CROSS;
            if (!projectsByZone[zone]) projectsByZone[zone] = [];
            projectsByZone[zone].push(p);
        });

        // Assign positions: each zone gets a quadrant, then arrange by type within zone
        zoneOrder.forEach(zone => {
            const zoneProjects = projectsByZone[zone] || [];
            if (zoneProjects.length === 0) return;

            const baseAngle = zoneAngles[zone] || 0;
            const zoneCenter = {
                cx: Math.cos(baseAngle) * zoneRadius,
                cz: Math.sin(baseAngle) * zoneRadius
            };

            // Further group by type within zone
            const typeGroups = {};
            zoneProjects.forEach(p => {
                const type = p.type || 'project';
                if (!typeGroups[type]) typeGroups[type] = [];
                typeGroups[type].push(p);
            });

            let typeIndex = 0;
            Object.keys(typeGroups).forEach(type => {
                const typeProjects = typeGroups[type];
                const typeAngle = baseAngle + (typeIndex / Math.max(1, Object.keys(typeGroups).length - 1)) * (Math.PI / 4) - Math.PI / 8;
                typeIndex++;

                typeProjects.forEach((p, i) => {
                    if (!p.position) {
                        const a = typeAngle + (i / Math.max(1, typeProjects.length - 1)) * (Math.PI / 6) - Math.PI / 12;
                        const r = Math.sqrt(Math.random()) * zoneSpread;
                        p.position = {
                            x: zoneCenter.cx + Math.cos(a) * r,
                            y: 0,
                            z: zoneCenter.cz + Math.sin(a) * r
                        };
                    }
                });
            });
        });

        // Fallback for any projects without position (shouldn't happen)
        projects.forEach(p => {
            if (!p.position) {
                const center = districtMap[p.district] || { cx: 0, cz: 0 };
                const a = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * CONFIG.world.districtSpread;
                p.position = { x: center.cx + Math.cos(a) * r, y: 0, z: center.cz + Math.sin(a) * r };
            }
        });
    }

    async function loadProjects(source = 'public') {
        try {
            const response = await fetch(`/data/${source}/projects.json`);
            if (!response.ok) throw new Error(`Failed to load ${source} projects`);
            return await response.json();
        } catch (error) {
            console.warn(`Could not load ${source} projects, using generated data:`, error);
            return generateProjects();
        }
    }

    async function loadManifest(source = 'public') {
        try {
            const response = await fetch(`/data/${source}/manifest.json`);
            if (!response.ok) throw new Error(`Failed to load ${source} manifest`);
            return await response.json();
        } catch (error) {
            console.warn(`Could not load ${source} manifest:`, error);
            return null;
        }
    }

    window.DataModel = {
        CONFIG,
        ZONES,
        VISIBILITY,
        generateProjects,
        assignDependencies,
        buildEdges,
        buildAdjacency,
        buildGraph,
        filterProjectsByVisibility,
        filterProjectsByZone,
        loadProjects,
        loadManifest,
        rand,
        randInt,
        pick
    };
})();