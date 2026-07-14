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

        // Subtle grid for dark theme
        const grid = new THREE.GridHelper(CONFIG.world.citySize * 1.4, 80, 0x4488aa, 0x224466);
        grid.material.transparent = true;
        const GRID_BASE_OPACITY = 0.15;
        grid.material.opacity = GRID_BASE_OPACITY;
        group.add(grid);

        // Building geometries by type
        const buildingGeometries = {
            engine: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
            project: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0),
            visualizer: new THREE.OctahedronGeometry(0.5).translate(0, 0.5, 0),
            monitor: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
            simulator: new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0),
            infrastructure: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
            'market-tool': new THREE.TorusGeometry(0.5, 0.15, 8, 16).translate(0, 0.5, 0)
        };

        // Zone color map
        const zoneColors = {
            [ZONES.WINDOWS]: new THREE.Color(CONFIG.colors.zone.windows),
            [ZONES.VPS]: new THREE.Color(CONFIG.colors.zone.vps),
            [ZONES.CLOUD]: new THREE.Color(CONFIG.colors.zone.cloud),
            [ZONES.CROSS]: new THREE.Color(CONFIG.colors.zone.cross)
        };

        // Group projects by (type, zone) so each InstancedMesh gets one material color
        const groups = new Map(); // key: "type|zone"
        projects.forEach(p => {
            const type = p.type || 'project';
            const zone = p.zone || ZONES.CROSS;
            const key = type + '|' + zone;
            const g = groups.get(key) || { type, zone, items: [] };
            g.items.push(p);
            groups.set(key, g);
        });

        const buildingsByType = new Map(); // key: type|zone
        groups.forEach((g) => {
            const geo = (buildingGeometries[g.type] || buildingGeometries.project).clone();
            const color = zoneColors[g.zone] || new THREE.Color(0xffffff);
            const hex = color.getHex();
            const mat = new THREE.MeshBasicMaterial({
                color: hex,
                vertexColors: false,
                toneMapped: false,
                transparent: false,
                opacity: 1
            });
            const mesh = new THREE.InstancedMesh(geo, mat, g.items.length);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.frustumCulled = false;
            mesh.instanceMatrix.needsUpdate = true;
            group.add(mesh);
            const key = g.type + '|' + g.zone;
            buildingsByType.set(key, { mesh, geo, mat, items: g.items, color, count: 0 });
        });

        // WINDOW LIGHTS - add glowing windows to buildings
        const windowLightsByType = new Map();
        const windowLightGeo = new THREE.PlaneGeometry(0.3, 0.3);
        const windowLightMat = new THREE.MeshBasicMaterial({
            color: 0xfff8e7,
            transparent: true,
            opacity: 0.9,
            toneMapped: true,
            depthWrite: false
        });
        
        // Count projects per type for window lights
        const typeCounts2 = new Map();
        projects.forEach(p => {
            const t = p.type || 'project';
            typeCounts2.set(t, (typeCounts2.get(t) || 0) + 1);
        });
        typeCounts2.forEach((count, type) => {
            // Create window lights - roughly 6-8 windows per floor per side
            const lightCount = count * 12;
            const windowMesh = new THREE.InstancedMesh(windowLightGeo, windowLightMat, lightCount);
            windowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            windowMesh.frustumCulled = false;
            group.add(windowMesh);
            windowLightsByType.set(type, { mesh: windowMesh, count: 0 });
        });

        function widthFor(node) { return map(node.repoCount, 1, 12, ...CONFIG.building.widthRange); }
        function heightFor(node) { return map(node.commitActivity, 0, 100, ...CONFIG.building.heightRange); }
        function depthFor(node) { return widthFor(node) * CONFIG.building.depthFactor; }

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

        // Build matrices per (type, zone) group
        const dummyMatrix = new THREE.Matrix4(), dummyPos = new THREE.Vector3(), dummyQuat = new THREE.Quaternion(), dummyScale = new THREE.Vector3();
        buildingsByType.forEach((g) => { g.count = 0; });

        projects.forEach((node) => {
            const type = node.type || 'project';
            const zone = node.zone || ZONES.CROSS;
            const key = type + '|' + zone;
            const g = buildingsByType.get(key);
            if (!g) return;
            const idx = g.count;
            g.count = idx + 1;

            const w = widthFor(node), h = heightFor(node), d = depthFor(node);
            dummyPos.set(node.position.x, node.position.y, node.position.z);
            dummyQuat.identity(); dummyScale.set(w, h, d);
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            g.mesh.setMatrixAt(idx, dummyMatrix);
            node.height = h;
            node.baseColor = g.color;
            node.groupKey = key;
            node.groupIndex = idx;
            
            // Add window lights for this building
            const wl = windowLightsByType.get(type);
            if (wl) {
                const lightsPerFloor = 8;
                const floors = Math.max(1, Math.floor(h / 4));
                let lightIdx = wl.count;
                for (let f = 0; f < floors; f++) {
                    const y = 2 + f * 4;
                    for (let s = 0; s < 4; s++) {
                        for (let l = 0; l < lightsPerFloor / 4; l++) {
                            if (lightIdx >= wl.mesh.count) break;
                            const angle = (s * Math.PI / 2) + (l / (lightsPerFloor / 4)) * 0.6;
                            const offset = Math.max(w, d) / 2 + 0.1;
                            dummyPos.set(
                                node.position.x + Math.cos(angle) * offset,
                                y,
                                node.position.z + Math.sin(angle) * offset
                            );
                            dummyQuat.setFromEuler(new THREE.Euler(0, angle + Math.PI / 2, 0, 'YXZ'));
                            dummyScale.set(1, 1, 1);
                            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
                            wl.mesh.setMatrixAt(lightIdx, dummyMatrix);
                            lightIdx++;
                        }
                    }
                }
                wl.count = lightIdx;
            }
        });

        buildingsByType.forEach(({ mesh }) => {
            mesh.instanceMatrix.needsUpdate = true;
        });

        // Update window lights
        windowLightsByType.forEach(({ mesh }) => {
            mesh.instanceMatrix.needsUpdate = true;
        });

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
        const cablesMesh = new THREE.LineSegments(cableGeo, cableMaterial);
        group.add(cablesMesh);

        // Zone boundary labels
        const zoneLabels = {
            windows: { pos: [0, 35, -CONFIG.world.districtRadius * 0.7], text: 'WINDOWS', color: CONFIG.colors.zone.windows },
            vps: { pos: [CONFIG.world.districtRadius * 0.7, 35, 0], text: 'VPS', color: CONFIG.colors.zone.vps },
            cloud: { pos: [0, 35, CONFIG.world.districtRadius * 0.7], text: 'CLOUD', color: CONFIG.colors.zone.cloud },
            cross: { pos: [-CONFIG.world.districtRadius * 0.7, 35, 0], text: 'CROSS', color: CONFIG.colors.zone.cross }
        };
        const labelSprites = [];
        const loader = new THREE.TextureLoader();
        Object.entries(zoneLabels).forEach(([key, label]) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.font = 'bold 32px monospace';
            ctx.fillStyle = '#' + label.color.toString(16).padStart(6, '0');
            ctx.textAlign = 'center';
            ctx.fillText(label.text, 128, 44);
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, toneMapped: false, depthTest: false });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(...label.pos);
            sprite.scale.set(80, 20, 1);
            group.add(sprite);
            labelSprites.push(sprite);
        });

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

        // Hover state
        let hoveredInstanceId = null;
        const hoverColor = new THREE.Color(0xffff00); // Bright yellow for bloom

let signalPhase = 'IDLE';
        function update(dt, elapsed) {
            // Reset cable colors
            cableColors.forEach((_, i) => {
                const edgeIdx = Math.floor(i / 6);
                const edge = edges[edgeIdx];
                if (edge) {
                    const color = new THREE.Color(CONFIG.colors.cableLow).lerp(new THREE.Color(CONFIG.colors.cableHigh), edge.health);
                    cableColors[i] = color.r;
                    cableColors[i + 1] = color.g;
                    cableColors[i + 2] = color.b;
                }
            });

            projects.forEach((node) => {
                if (node.id === hoveredInstanceId) {
                    const neighbors = graph.adjacency.get(node.id) || [];
                    neighbors.forEach(n => {
                        const e = edges[n.edgeIndex];
                        if (e) {
                            const o = n.edgeIndex * 6;
                            cableColors[o] = 1; cableColors[o + 1] = 1; cableColors[o + 2] = 0.1;
                            cableColors[o + 3] = 1; cableColors[o + 4] = 1; cableColors[o + 5] = 0.1;
                        }
                    });
                }
            });

            cableGeo.attributes.color.needsUpdate = true;

            const live = pulses.update(dt);
            signalPhase = live > 0 ? 'PROPAGATING' : 'IDLE';
        }

        function setOpacity(v) {
            buildingsByType.forEach(({ mat }) => mat.opacity = v);
            cableMaterial.opacity = CABLE_BASE_OPACITY * v;
            grid.material.opacity = GRID_BASE_OPACITY * v;
            ringMaterial.opacity = RING_BASE_OPACITY * v;
            pulses.setOpacity(v);
        }

        function pickAt(raycaster) {
            for (const [key, { mesh }] of buildingsByType) {
                const hit = raycaster.intersectObject(mesh)[0];
                if (hit && hit.instanceId !== undefined) {
                    return projects.find(p => p.groupKey === key && p.groupIndex === hit.instanceId) || null;
                }
            }
            return null;
        }

        function setHover(instanceId) {
            hoveredInstanceId = instanceId;
        }

        function select(project) {
            const w = widthFor(project);
            ring.position.set(project.position.x, 0.3, project.position.z);
            ring.scale.setScalar(w * 0.9);
            ring.visible = true;
        }

        function clearSelection() { ring.visible = false; }

        return {
            group, update, setOpacity, pickAt, select, clearSelection, triggerImpulse, setHover,
            get signalPhase() { return signalPhase; }
        };
    }

    window.RendererCity = { create: createCityRenderer };
})();