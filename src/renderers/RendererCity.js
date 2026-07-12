/* =========================================================================
   renderers/RendererCity.js
   City Mode: infrastructure view. Reads the same project graph the Neural
   renderer reads, projects it as a skyline + road network with zone colors.
   ========================================================================= */
(function () {
    function createCityRenderer(THREE, scene, graph, CONFIG) {
        const { projects, byId, edges, ZONES } = graph;
        const map = THREE.MathUtils.mapLinear;

        const group = new THREE.Group();
        scene.add(group);

        const grid = new THREE.GridHelper(CONFIG.world.citySize * 1.4, 80, 0x0088aa, 0x0088aa);
        grid.material.transparent = true;
        const GRID_BASE_OPACITY = 0.12;
        grid.material.opacity = GRID_BASE_OPACITY;
        group.add(grid);

        const buildingMaterial = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 1, vertexColors: true });
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        boxGeo.translate(0, 0.5, 0);
        const buildingsMesh = new THREE.InstancedMesh(boxGeo, buildingMaterial, projects.length);
        buildingsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        buildingsMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(projects.length * 3), 3);
        group.add(buildingsMesh);

        function widthFor(node) { return map(node.repoCount, 1, 12, ...CONFIG.building.widthRange); }
        function heightFor(node) { return map(node.commitActivity, 0, 100, ...CONFIG.building.heightRange); }
        function zoneColorFor(node) {
            const zoneColors = {
                [ZONES.WINDOWS]: new THREE.Color(CONFIG.colors.zone.windows),
                [ZONES.VPS]: new THREE.Color(CONFIG.colors.zone.vps),
                [ZONES.CLOUD]: new THREE.Color(CONFIG.colors.zone.cloud),
                [ZONES.CROSS]: new THREE.Color(CONFIG.colors.zone.cross)
            };
            return zoneColors[node.zone] || new THREE.Color(CONFIG.colors.zone.cross);
        }
        function healthColorFor(node) {
            const mix = (1 - node.health) * 0.5 + node.pressure * 0.5;
            const brightness = map(node.stars, 0, 500, 0.6, 1.5);
            return new THREE.Color(CONFIG.colors.healthy).lerp(new THREE.Color(CONFIG.colors.stressed), mix).multiplyScalar(brightness);
        }

        const dummyMatrix = new THREE.Matrix4(), dummyPos = new THREE.Vector3(), dummyQuat = new THREE.Quaternion(), dummyScale = new THREE.Vector3();
        const baseColors = new Float32Array(projects.length * 3);
        projects.forEach((node, i) => {
            const w = widthFor(node), h = heightFor(node), d = w * CONFIG.building.depthFactor;
            dummyPos.set(node.position.x, node.position.y, node.position.z);
            dummyQuat.identity(); dummyScale.set(w, h, d);
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            buildingsMesh.setMatrixAt(i, dummyMatrix);
            node.height = h;

            const zc = zoneColorFor(node);
            const hc = healthColorFor(node);
            const finalColor = zc.clone().lerp(hc, 0.5);
            baseColors[i * 3] = finalColor.r;
            baseColors[i * 3 + 1] = finalColor.g;
            baseColors[i * 3 + 2] = finalColor.b;
            node.baseColor = finalColor;
        });
        buildingsMesh.instanceMatrix.needsUpdate = true;
        buildingsMesh.instanceColor.setArray(baseColors);
        buildingsMesh.instanceColor.needsUpdate = true;

        const CABLE_HEIGHT = 5;
        const cablePositions = new Float32Array(edges.length * 2 * 3);
        const cableColors = new Float32Array(edges.length * 2 * 3);
        edges.forEach((e, i) => {
            const a = byId.get(e.a).position, b = byId.get(e.b).position;
            const color = new THREE.Color(CONFIG.colors.cableLow).lerp(new THREE.Color(CONFIG.colors.cableHigh), e.health);
            const o = i * 6;
            cablePositions[o] = a.x; cablePositions[o + 1] = CABLE_HEIGHT; cablePositions[o + 2] = a.z;
            cablePositions[o + 3] = b.x; cablePositions[o + 4] = CABLE_HEIGHT; cablePositions[o + 5] = b.z;
            cableColors.set([color.r, color.g, color.b, color.r, color.g, color.b], o);
        });
        const cableGeo = new THREE.BufferGeometry();
        cableGeo.setAttribute('position', new THREE.BufferAttribute(cablePositions, 3));
        cableGeo.setAttribute('color', new THREE.BufferAttribute(cableColors, 3));
        const CABLE_BASE_OPACITY = 0.55;
        const cableMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: CABLE_BASE_OPACITY, toneMapped: false });
        group.add(new THREE.LineSegments(cableGeo, cableMaterial));

        const RING_BASE_OPACITY = 0.6;
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: RING_BASE_OPACITY, side: THREE.DoubleSide, toneMapped: false });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.visible = false;
        group.add(ring);

        const pulses = SignalEngine.createPulseSystem(THREE, CONFIG.signal.cityMaxPulses);
        group.add(pulses.points);

        function triggerImpulse(nodeId, depth = 0, excludeEdge = -1) {
            const neighbors = graph.adjacency.get(nodeId) || [];
            const from = byId.get(nodeId).position;
            neighbors.forEach(n => {
                if (n.edgeIndex === excludeEdge) return;
                const e = edges[n.edgeIndex];
                const to = byId.get(n.neighborId).position;
                const speed = CONFIG.signal.pulseSpeed / e.length;
                pulses.activate(
                    new THREE.Vector3(from.x, CABLE_HEIGHT, from.z),
                    new THREE.Vector3(to.x, CABLE_HEIGHT, to.z),
                    speed, depth,
                    (arrivedDepth) => {
                        if (arrivedDepth + 1 <= CONFIG.signal.maxDepth) {
                            setTimeout(() => triggerImpulse(n.neighborId, arrivedDepth + 1, n.edgeIndex), CONFIG.signal.cascadeDelay);
                        }
                    }
                );
            });
        }

        let signalPhase = 'IDLE';
        const flickerColor = new THREE.Color();
        function update(dt, elapsed) {
            projects.forEach((node, i) => {
                const intensity = 0.65 + 0.35 * Math.sin(elapsed * node.activityFreq + node.phaseOffset) * (node.commitActivity / 100);
                flickerColor.copy(node.baseColor).multiplyScalar(intensity);
                buildingsMesh.setColorAt(i, flickerColor.r, flickerColor.g, flickerColor.b);
                if (Math.random() < node.pressure * CONFIG.signal.cityAmbientRate * dt) triggerImpulse(node.id);
            });
            buildingsMesh.instanceColor.needsUpdate = true;
            const live = pulses.update(dt);
            signalPhase = live > 0 ? 'PROPAGATING' : 'IDLE';
        }

        function setOpacity(v) {
            buildingMaterial.opacity = v;
            cableMaterial.opacity = CABLE_BASE_OPACITY * v;
            grid.material.opacity = GRID_BASE_OPACITY * v;
            ringMaterial.opacity = RING_BASE_OPACITY * v;
            pulses.setOpacity(v);
        }

        function pickAt(raycaster) {
            const hit = raycaster.intersectObject(buildingsMesh)[0];
            if (!hit || hit.instanceId === undefined) return null;
            return projects[hit.instanceId];
        }

        function select(project) {
            const w = widthFor(project);
            ring.position.set(project.position.x, 0.3, project.position.z);
            ring.scale.setScalar(w * 0.9);
            ring.visible = true;
        }

        function clearSelection() { ring.visible = false; }

        return {
            group, update, setOpacity, pickAt, select, clearSelection, triggerImpulse,
            get signalPhase() { return signalPhase; }
        };
    }

    window.RendererCity = { create: createCityRenderer };
})();