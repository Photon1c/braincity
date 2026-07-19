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
            nodesPerDistrict: [4, 8],
            blockPitch: 36,
            roadWidth: 14
        },
        building: { widthRange: [8, 22], heightRange: [10, 140], depthFactor: 1 },
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
        bloom: { strength: 0.35, radius: 0.4, threshold: 0.15 },
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
        CONFIG.world.districtNames.forEach((districtName) => {
            const count = randInt(...CONFIG.world.nodesPerDistrict);
            for (let i = 0; i < count; i++) {
                const zone = pick(Object.values(ZONES));
                const descs = {
                    engine: 'Core processing engine for predictive modeling and simulation orchestration.',
                    project: 'Development project with cross-team dependencies and active iteration.',
                    visualizer: 'Data visualization and real-time monitoring dashboard.',
                    monitor: 'System health and performance monitoring service.',
                    simulator: 'Agent-based and statistical simulation environment.',
                    infrastructure: 'Infrastructure and deployment automation tooling.',
                    'market-tool': 'Market analysis and trading signal processing pipeline.'
                };
                const type = pick(TYPES);
                projects.push({
                    id: id++,
                    name: `${pick(ADJ)}-${pick(NOUN)}`,
                    type,
                    district: districtName,
                    description: descs[type] || 'Project node in the BrainCity network.',
                    repoCount: randInt(1, 12),
                    commitActivity: randInt(5, 100),
                    stars: randInt(0, 500),
                    health: Math.random(),
                    pressure: Math.random(),
                    dependencies: [],
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
        var unpositioned = projects.filter(function (p) { return !p.position; });
        if (unpositioned.length === 0) return;

        var PITCH = CONFIG.world.blockPitch;
        var zoneOrder = [ZONES.WINDOWS, ZONES.VPS, ZONES.CLOUD, ZONES.CROSS];
        var zoneAngles = {
            [ZONES.WINDOWS]: -Math.PI / 2,
            [ZONES.VPS]: 0,
            [ZONES.CLOUD]: Math.PI / 2,
            [ZONES.CROSS]: Math.PI
        };
        var zoneRadius = CONFIG.world.districtRadius * 0.7;
        var blockSpread = CONFIG.world.districtSpread * 0.55;

        var byZone = {};
        unpositioned.forEach(function (p) {
            var z = p.zone || ZONES.CROSS;
            if (!byZone[z]) byZone[z] = {};
            var d = p.district || 'Unknown';
            if (!byZone[z][d]) byZone[z][d] = [];
            byZone[z][d].push(p);
        });

        zoneOrder.forEach(function (zone) {
            var districts = byZone[zone];
            if (!districts) return;
            var angle = zoneAngles[zone];
            var cx = Math.cos(angle) * zoneRadius;
            var cz = Math.sin(angle) * zoneRadius;
            var districtNames = Object.keys(districts);
            var perSide = Math.max(1, Math.ceil(Math.sqrt(districtNames.length)));

            districtNames.forEach(function (name, di) {
                var zoneProjects = districts[name];
                var blockRow = Math.floor(di / perSide);
                var blockCol = di % perSide;
                var side = (blockCol - (perSide - 1) / 2) * blockSpread * 0.9;
                var perpX = -Math.sin(angle) * side;
                var perpZ = Math.cos(angle) * side;
                var bx = cx + perpX + Math.cos(angle) * blockRow * blockSpread * 0.5;
                var bz = cz + perpZ + Math.sin(angle) * blockRow * blockSpread * 0.5;

                var perRow = Math.max(1, Math.ceil(Math.sqrt(zoneProjects.length)));
                var gridW = (perRow - 1) * PITCH;

                zoneProjects.forEach(function (p, i) {
                    var row = Math.floor(i / perRow);
                    var col = i % perRow;
                    var stagger = (row % 2) * (PITCH / 3);
                    p.position = {
                        x: bx + col * PITCH - gridW / 2 + stagger,
                        y: 0,
                        z: bz + row * PITCH - gridW / 2
                    };
                    p.address = 'B' + String.fromCharCode(65 + di) + '-' + (row + 1) + String.fromCharCode(65 + col);
                });
            });
        });

        unpositioned.forEach(function (p) {
            if (!p.position) {
                p.position = { x: (Math.random() - 0.5) * 200, y: 0, z: (Math.random() - 0.5) * 200 };
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