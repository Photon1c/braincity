/* =========================================================================
   state/StateEvolutionEngine.js
   Six-dimensional state/dynamics instrument visualizing Persistence,
   Production, Release, Pressure, Transport, and Dissipation.
   Integrates with CityBrain as a neural overlay mode.
   ========================================================================= */
(function () {
    const DIMENSIONS = [
        { id: 'persistence', name: 'Persistence', color: 0x00e5ff, description: 'State retention over time' },
        { id: 'production', name: 'Production', color: 0x00ff88, description: 'New state generation rate' },
        { id: 'release', name: 'Release', color: 0xffaa00, description: 'State emission/export' },
        { id: 'pressure', name: 'Pressure', color: 0xff0066, description: 'Accumulated tension' },
        { id: 'transport', name: 'Transport', color: 0xaa44ff, description: 'State flow between nodes' },
        { id: 'dissipation', name: 'Dissipation', color: 0x8888ff, description: 'Entropy/loss rate' }
    ];

    function createStateEvolutionEngine(THREE, scene, graph, CONFIG) {
        const { projects, byId, edges } = graph;

        const group = new THREE.Group();
        group.position.set(...CONFIG.neural.home);
        group.visible = false;
        scene.add(group);

        const dimensionMeshes = new Map();
        const dimensionValues = new Map();
        let activeDimension = null;
        let animationTime = 0;

        function initializeDimensions() {
            const radius = 60;
            DIMENSIONS.forEach((dim, i) => {
                const angle = (i / DIMENSIONS.length) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;

                const geo = new THREE.RingGeometry(8, 12, 32);
                const mat = new THREE.MeshBasicMaterial({
                    color: dim.color,
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide,
                    toneMapped: false
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, 5, z);
                mesh.rotation.x = -Math.PI / 2;
                mesh.userData.dimension = dim.id;
                group.add(mesh);
                dimensionMeshes.set(dim.id, mesh);
                dimensionValues.set(dim.id, Math.random());
            });
        }

        function updateDimensionValues(dt) {
            animationTime += dt;
            projects.forEach(project => {
                DIMENSIONS.forEach(dim => {
                    const baseValue = dimensionValues.get(dim.id) || 0;
                    const variation = Math.sin(animationTime * 0.5 + project.id) * 0.1;
                    const projectInfluence = (project.health * 0.5 + (1 - project.pressure) * 0.5) * 0.3;
                    dimensionValues.set(dim.id, THREE.MathUtils.clamp(baseValue + variation + projectInfluence * 0.01, 0, 1));
                });
            });
        }

        function renderDimensions() {
            dimensionMeshes.forEach((mesh, dimId) => {
                const value = dimensionValues.get(dimId) || 0;
                const scale = 0.5 + value * 1.5;
                mesh.scale.setScalar(scale);
                mesh.material.opacity = 0.3 + value * 0.5;
            });
        }

        function selectDimension(dimId) {
            activeDimension = dimId;
            dimensionMeshes.forEach((mesh, id) => {
                mesh.material.opacity = id === dimId ? 0.9 : 0.3;
                mesh.scale.setScalar(id === dimId ? 1.5 : 1.0);
            });
        }

        function getActiveDimension() { return activeDimension; }
        function getDimensionValue(dimId) { return dimensionValues.get(dimId) || 0; }
        function getAllDimensions() { return DIMENSIONS.map(d => ({ ...d, value: dimensionValues.get(d.id) || 0 })); }

        function setOpacity(v) {
            group.visible = v > 0;
            dimensionMeshes.forEach(mesh => { mesh.material.opacity *= v; });
        }

        function update(dt) {
            updateDimensionValues(dt);
            renderDimensions();
        }

        initializeDimensions();

        return {
            group, update, setOpacity, selectDimension, getActiveDimension, getDimensionValue, getAllDimensions
        };
    }

    window.StateEvolutionEngine = { create: createStateEvolutionEngine, DIMENSIONS };
})();