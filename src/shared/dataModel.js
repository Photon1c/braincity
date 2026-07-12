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
            cableLow: 0x1144aa,
            cableHigh: 0x00e5ff,
            dendrite: 0x00e5ff,
            axon: 0xffaa00,
            zone: {
                windows: 0x0088ff,
                vps: 0x00ff88,
                cloud: 0xff8800,
                cross: 0xaa44ff
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
        bloom: { strength: 1.3, radius: 0.5, threshold: 0.2 },
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

        const edges = buildEdges(projects, byId);
        const adjacency = buildAdjacency(edges);

        return { projects, byId, edges, adjacency, CONFIG, ZONES, VISIBILITY };
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