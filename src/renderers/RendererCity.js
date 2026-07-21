(function () {
    function buildRoadSystem(THREE, parent, blocks, zoneCenters, CONFIG) {
        var roadGroup = new THREE.Group();
        var roadMaterials = [];

        var citySize = CONFIG.world.citySize * 1.6;

        var groundGeo = new THREE.PlaneGeometry(citySize, citySize);
        var groundMat = new THREE.MeshBasicMaterial({
            color: 0x0a0a14,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            toneMapped: false,
            depthWrite: true
        });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0.005;
        roadGroup.add(ground);
        roadMaterials.push(groundMat);

        var padMat = new THREE.MeshBasicMaterial({
            color: 0x111122,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(padMat);
        var padGeo = new THREE.PlaneGeometry(1, 1);

        blocks.forEach(function (block) {
            var size = block.halfSize * 2;
            var pad = new THREE.Mesh(padGeo, padMat);
            pad.rotation.x = -Math.PI / 2;
            pad.position.set(block.center.x, 0.015, block.center.z);
            pad.scale.set(size, size, 1);
            roadGroup.add(pad);
        });

        addRoadsBetweenBlocks(THREE, roadGroup, blocks, CONFIG, roadMaterials);
        addRadialRoads(THREE, roadGroup, zoneCenters, CONFIG, roadMaterials);
        addCentralHub(THREE, roadGroup, CONFIG, roadMaterials);

        parent.add(roadGroup);
        return roadMaterials;
    }

    function addRoadsBetweenBlocks(THREE, roadGroup, blocks, CONFIG, roadMaterials) {
        var byZone = {};
        blocks.forEach(function (b) {
            if (!byZone[b.zone]) byZone[b.zone] = [];
            byZone[b.zone].push(b);
        });

        var roadMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(roadMat);
        var stripeMat = new THREE.MeshBasicMaterial({
            color: 0x334466,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(stripeMat);

        var roadWidth = CONFIG.world.roadWidth;

        Object.keys(byZone).forEach(function (zone) {
            var zoneBlocks = byZone[zone];
            var perSide = zoneBlocks[0].perSide;

            var grid = {};
            zoneBlocks.forEach(function (b) {
                var row = Math.floor(b.di / perSide);
                var col = b.di % perSide;
                grid[row + ',' + col] = b;
            });

            var seen = {};

            function drawRoadBetween(a, b) {
                var key = a.di < b.di ? a.di + '-' + b.di : b.di + '-' + a.di;
                if (seen[key]) return;
                seen[key] = true;

                var dx = b.center.x - a.center.x;
                var dz = b.center.z - a.center.z;
                var dist = Math.sqrt(dx * dx + dz * dz);
                var cx = (a.center.x + b.center.x) / 2;
                var cz = (a.center.z + b.center.z) / 2;
                var angle = Math.atan2(dz, dx);

                var roadGeo = new THREE.PlaneGeometry(dist - a.halfSize - b.halfSize, roadWidth);
                var road = new THREE.Mesh(roadGeo, roadMat);
                road.rotation.set(-Math.PI / 2, angle, 0);
                road.position.set(cx, 0.025, cz);
                roadGroup.add(road);

                var stripeGeo = new THREE.PlaneGeometry(dist - a.halfSize - b.halfSize, 1.2);
                var stripe = new THREE.Mesh(stripeGeo, stripeMat);
                stripe.rotation.set(-Math.PI / 2, angle, 0);
                stripe.position.set(cx, 0.028, cz);
                roadGroup.add(stripe);
            }

            for (var r = 0; r < perSide; r++) {
                for (var c = 0; c < perSide; c++) {
                    var current = grid[r + ',' + c];
                    if (!current) continue;
                    var right = grid[r + ',' + (c + 1)];
                    var bottom = grid[(r + 1) + ',' + c];
                    if (right) drawRoadBetween(current, right);
                    if (bottom) drawRoadBetween(current, bottom);
                }
            }
        });
    }

    function addRadialRoads(THREE, roadGroup, zoneCenters, CONFIG, roadMaterials) {
        var roadWidth = CONFIG.world.roadWidth * 1.6;
        var roadMat = new THREE.MeshBasicMaterial({
            color: 0x222244,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(roadMat);
        var laneMat = new THREE.MeshBasicMaterial({
            color: 0x445577,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(laneMat);

        Object.keys(zoneCenters).forEach(function (zone) {
            var zc = zoneCenters[zone];
            var dx = zc.x;
            var dz = zc.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            var angle = Math.atan2(dz, dx);

            var roadGeo = new THREE.PlaneGeometry(dist, roadWidth);
            var road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.set(-Math.PI / 2, angle, 0);
            road.position.set(dx / 2, 0.025, dz / 2);
            roadGroup.add(road);

            var leftLaneGeo = new THREE.PlaneGeometry(dist, 0.8);
            var leftLane = new THREE.Mesh(leftLaneGeo, laneMat);
            leftLane.rotation.set(-Math.PI / 2, angle, 0);
            leftLane.position.set(dx / 2, 0.028, dz / 2 - roadWidth * 0.25);
            roadGroup.add(leftLane);

            var rightLaneGeo = new THREE.PlaneGeometry(dist, 0.8);
            var rightLane = new THREE.Mesh(rightLaneGeo, laneMat);
            rightLane.rotation.set(-Math.PI / 2, angle, 0);
            rightLane.position.set(dx / 2, 0.028, dz / 2 + roadWidth * 0.25);
            roadGroup.add(rightLane);
        });
    }

    function addCentralHub(THREE, roadGroup, CONFIG, roadMaterials) {
        var hubRadius = CONFIG.world.roadWidth * 1.5;
        var hubGeo = new THREE.CylinderGeometry(hubRadius, hubRadius, 0.01, 32);
        var hubMat = new THREE.MeshBasicMaterial({
            color: 0x223355,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(hubMat);
        var hub = new THREE.Mesh(hubGeo, hubMat);
        hub.position.y = 0.03;
        roadGroup.add(hub);

        var ringGeo = new THREE.TorusGeometry(hubRadius, 0.5, 8, 32);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0x445577,
            transparent: true,
            opacity: 0.6,
            toneMapped: false,
            depthWrite: true
        });
        roadMaterials.push(ringMat);
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.032;
        roadGroup.add(ring);
    }

    function createCityRenderer(THREE, scene, graph, CONFIG) {
        const { projects, byId, edges, ZONES, blocks, zoneCenters } = graph;
        const map = THREE.MathUtils.mapLinear;

        const group = new THREE.Group();
        scene.add(group);

        const grid = new THREE.GridHelper(CONFIG.world.citySize * 1.4, 80, 0x4488aa, 0x224466);
        grid.material.transparent = true;
        const GRID_BASE_OPACITY = 0.04;
        grid.material.opacity = GRID_BASE_OPACITY;
        group.add(grid);

        var roadMaterials = buildRoadSystem(THREE, group, blocks, zoneCenters, CONFIG);

        const buildingGeometries = {
            engine: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
            project: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0),
            visualizer: new THREE.OctahedronGeometry(0.5).translate(0, 0.5, 0),
            monitor: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
            simulator: new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0),
            infrastructure: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
            'market-tool': new THREE.TorusGeometry(0.5, 0.15, 8, 16).translate(0, 0.5, 0)
        };

        const zoneWallColors = {
            [ZONES.WINDOWS]: new THREE.Color(CONFIG.colors.zone.windows).multiplyScalar(0.35),
            [ZONES.VPS]: new THREE.Color(CONFIG.colors.zone.vps).multiplyScalar(0.35),
            [ZONES.CLOUD]: new THREE.Color(CONFIG.colors.zone.cloud).multiplyScalar(0.35),
            [ZONES.CROSS]: new THREE.Color(CONFIG.colors.zone.cross).multiplyScalar(0.35)
        };
        const zoneWindowColors = {
            [ZONES.WINDOWS]: new THREE.Color(CONFIG.colors.zone.windows),
            [ZONES.VPS]: new THREE.Color(CONFIG.colors.zone.vps),
            [ZONES.CLOUD]: new THREE.Color(CONFIG.colors.zone.cloud),
            [ZONES.CROSS]: new THREE.Color(CONFIG.colors.zone.cross)
        };

        // Group by (type, zone) for building meshes
        const groups = new Map();
        projects.forEach(p => {
            const type = p.type || 'project';
            const zone = p.zone || ZONES.CROSS;
            const key = type + '|' + zone;
            const g = groups.get(key) || { type, zone, items: [] };
            g.items.push(p);
            groups.set(key, g);
        });

        const buildingsByType = new Map();
        groups.forEach((g) => {
            const geo = (buildingGeometries[g.type] || buildingGeometries.project).clone();
            const color = zoneWallColors[g.zone] || new THREE.Color(0x333333);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
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

        // WINDOW LIGHTS per zone (each zone gets colored windows)
        const windowGroups = new Map();
        projects.forEach(p => {
            const zone = p.zone || ZONES.CROSS;
            if (!windowGroups.has(zone)) windowGroups.set(zone, []);
            windowGroups.get(zone).push(p);
        });

        const windowLightsByZone = new Map();
        const windowLightGeo = new THREE.PlaneGeometry(0.35, 0.5);
        windowGroups.forEach((items, zone) => {
            const perBuilding = 48;
            const totalWindows = items.length * perBuilding;
            const zoneColor = zoneWindowColors[zone] || new THREE.Color(0xfff8e7);
            const mat = new THREE.MeshBasicMaterial({
                color: zoneColor,
                transparent: true,
                opacity: 0.85,
                toneMapped: false,
                depthWrite: false
            });
            const mesh = new THREE.InstancedMesh(windowLightGeo, mat, totalWindows);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.frustumCulled = false;
            group.add(mesh);
            windowLightsByZone.set(zone, { mesh, mat, color: zoneColor, count: 0 });
        });

        function widthFor(node) { return map(node.repoCount, 1, 12, ...CONFIG.building.widthRange); }
        function heightFor(node) { return map(node.commitActivity, 0, 100, ...CONFIG.building.heightRange); }
        function depthFor(node) { return widthFor(node) * CONFIG.building.depthFactor; }

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

            // Window lights for this building
            const wl = windowLightsByZone.get(zone);
            if (wl) {
                const windowsPerFace = 12;
                const floorH = 3;
                const floors = Math.max(1, Math.floor((h - 2) / floorH));
                const faceDims = [
                    { cx: 0, cz: d / 2 + 0.05, axis: 'x', span: w },
                    { cx: 0, cz: -d / 2 - 0.05, axis: 'x', span: w },
                    { cx: w / 2 + 0.05, cz: 0, axis: 'z', span: d },
                    { cx: -w / 2 - 0.05, cz: 0, axis: 'z', span: d }
                ];
                const perFace = Math.max(2, Math.floor(windowsPerFace / 4));

                faceDims.forEach(face => {
                    const step = face.span / (perFace + 1);
                    const halfSpan = face.span / 2;
                    for (let f = 0; f < floors; f++) {
                        const y = 1.5 + f * floorH + (f % 2) * 0.5;
                        for (let wi = 0; wi < perFace; wi++) {
                            if (wl.count >= wl.mesh.count) break;
                            const wx = face.axis === 'x' ? face.cx : (wi + 1) * step - halfSpan;
                            const wz = face.axis === 'z' ? face.cz : (wi + 1) * step - halfSpan;
                            dummyPos.set(node.position.x + wx, y, node.position.z + wz);
                            const facingAngle = face.axis === 'x' ? 0 : Math.PI / 2;
                            dummyQuat.setFromEuler(new THREE.Euler(0, facingAngle, 0, 'YXZ'));
                            dummyScale.set(1, 1, 1);
                            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
                            wl.mesh.setMatrixAt(wl.count, dummyMatrix);
                            wl.count++;
                        }
                    }
                });
            }
        });

        buildingsByType.forEach(({ mesh }) => {
            mesh.instanceMatrix.needsUpdate = true;
        });
        windowLightsByZone.forEach(({ mesh }) => {
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
        const CABLE_BASE_OPACITY = 0.4;
        const cableMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: CABLE_BASE_OPACITY, toneMapped: false });
        const cablesMesh = new THREE.LineSegments(cableGeo, cableMaterial);
        group.add(cablesMesh);

        // Zone boundary labels
        const zoneLabels = {
            windows: { pos: [0, 40, -CONFIG.world.districtRadius * 0.7], text: 'WINDOWS', color: CONFIG.colors.zone.windows },
            vps: { pos: [CONFIG.world.districtRadius * 0.7, 40, 0], text: 'VPS', color: CONFIG.colors.zone.vps },
            cloud: { pos: [0, 40, CONFIG.world.districtRadius * 0.7], text: 'CLOUD', color: CONFIG.colors.zone.cloud },
            cross: { pos: [-CONFIG.world.districtRadius * 0.7, 40, 0], text: 'CROSS', color: CONFIG.colors.zone.cross }
        };
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

        let hoveredInstanceId = null;
        let signalPhase = 'IDLE';

        function update(dt, elapsed) {
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
            windowLightsByZone.forEach(({ mat }) => { mat.opacity = 0.85 * v; });
            cableMaterial.opacity = CABLE_BASE_OPACITY * v;
            grid.material.opacity = GRID_BASE_OPACITY * v;
            ringMaterial.opacity = RING_BASE_OPACITY * v;
            roadMaterials.forEach(function (mat) { mat.opacity = mat.opacity > 0.01 ? v : mat.opacity; });
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
