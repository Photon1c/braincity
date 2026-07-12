/* =========================================================================
   renderers/RendererNeural.js
   Neural Mode: cognition view with zone-aware coloring.
   Same graph, different projection — a project becomes a soma, its
   dependents become dendrite pods (input), its own dependencies become
   axon pods (output). Lives at a fixed world anchor.
   ========================================================================= */
(function () {
    function createNeuralRenderer(THREE, scene, graph, CONFIG) {
        const { byId, edges } = graph;
        const map = THREE.MathUtils.mapLinear;
        const ORIGIN = new THREE.Vector3(0, 0, 0);

        const group = new THREE.Group();
        group.position.set(...CONFIG.neural.home);
        group.visible = false;
        scene.add(group);

        const pulses = SignalEngine.createPulseSystem(THREE, CONFIG.signal.neuralMaxPulses);
        pulses.points.userData.persist = true;
        group.add(pulses.points);

        let focus = null;
        let pods = [];
        let clickables = [];
        let somaMesh = null;
        let somaFlash = 0;
        let signalPhase = 'IDLE';

        function nodeColor(project) {
            const zoneColors = {
                windows: new THREE.Color(CONFIG.colors.zone.windows),
                vps: new THREE.Color(CONFIG.colors.zone.vps),
                cloud: new THREE.Color(CONFIG.colors.zone.cloud),
                cross: new THREE.Color(CONFIG.colors.zone.cross)
            };
            const baseColor = zoneColors[project.zone] || zoneColors.cross;
            const mix = (1 - project.health) * 0.5 + project.pressure * 0.5;
            return baseColor.clone().lerp(new THREE.Color(CONFIG.colors.stressed), mix);
        }

        function focusOn(project) {
            SignalEngine.disposeGroupChildren(group);
            focus = project;
            pods = [];
            clickables = [];
            somaFlash = 0;

            const somaColor = nodeColor(project);
            const somaRadius = map(project.repoCount, 1, 12, ...CONFIG.neural.somaRadiusRange);
            const somaMaterial = new THREE.MeshBasicMaterial({ color: somaColor, transparent: true, opacity: 1, toneMapped: false });
            somaMesh = new THREE.Mesh(new THREE.SphereGeometry(somaRadius, 24, 16), somaMaterial);
            somaMesh.userData.kind = 'soma';
            group.add(somaMesh);
            clickables.push(somaMesh);

            const incoming = edges.filter(e => e.b === project.id).map(e => byId.get(e.a));
            const outgoing = edges.filter(e => e.a === project.id).map(e => byId.get(e.b));

            function addPods(list, radius, color, type) {
                list.forEach((neighbor, i) => {
                    const angle = (i / list.length) * Math.PI * 2;
                    const jitterY = DataModel.rand(-4, 4);
                    const localPos = new THREE.Vector3(Math.cos(angle) * radius, jitterY, Math.sin(angle) * radius);

                    const lineGeo = new THREE.BufferGeometry().setFromPoints(type === 'in' ? [localPos, ORIGIN] : [ORIGIN, localPos]);
                    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55, toneMapped: false }));
                    group.add(line);

                    const podRadius = map(neighbor.repoCount, 1, 12, ...CONFIG.neural.podRadiusRange);
                    const baseColor = nodeColor(neighbor);
                    const podMaterial = new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 1, toneMapped: false });
                    const mesh = new THREE.Mesh(new THREE.SphereGeometry(podRadius, 16, 12), podMaterial);
                    mesh.position.copy(localPos);
                    group.add(mesh);
                    clickables.push(mesh);

                    pods.push({ mesh, project: neighbor, type, localPos: localPos.clone(), flash: 0, baseColor });
                });
            }
            addPods(incoming, CONFIG.neural.dendriteRadius, CONFIG.colors.dendrite, 'in');
            addPods(outgoing, CONFIG.neural.axonRadius, CONFIG.colors.axon, 'out');

            return { inCount: incoming.length, outCount: outgoing.length };
        }

        function fire() {
            somaFlash = 1;
            pods.forEach(p => {
                if (p.type !== 'out') return;
                const speed = CONFIG.signal.pulseSpeed / Math.max(p.localPos.length(), 1);
                pulses.activate(ORIGIN, p.localPos, speed, 0, () => { p.flash = 1; });
            });
        }

        const tmpColor = new THREE.Color();
        function update(dt) {
            if (!somaMesh) return;
            somaFlash *= Math.pow(0.002, dt);
            tmpColor.copy(nodeColor(focus)).multiplyScalar(1 + somaFlash * 1.3);
            somaMesh.material.color.copy(tmpColor);

            pods.forEach(p => {
                p.flash *= Math.pow(0.002, dt);
                tmpColor.copy(p.baseColor).multiplyScalar(1 + p.flash * 1.3);
                p.mesh.material.color.copy(tmpColor);
                if (p.type === 'in' && Math.random() < p.project.pressure * CONFIG.signal.neuralAmbientRate * dt) {
                    const speed = CONFIG.signal.pulseSpeed / Math.max(p.localPos.length(), 1);
                    pulses.activate(p.localPos, ORIGIN, speed, 0, () => fire());
                    p.flash = 1;
                }
            });

            const live = pulses.update(dt);
            signalPhase = live > 0 ? 'FIRING' : 'IDLE';
        }

        function setOpacity(v) {
            if (somaMesh) somaMesh.material.opacity = v;
            pods.forEach(p => { p.mesh.material.opacity = v; });
            group.children.forEach(child => { if (child.isLine) child.material.opacity = 0.55 * v; });
            pulses.setOpacity(v);
        }

        function pickAt(raycaster) {
            const hit = raycaster.intersectObjects(clickables)[0];
            if (!hit) return null;
            if (hit.object.userData.kind === 'soma') return { type: 'soma' };
            const pod = pods.find(p => p.mesh === hit.object);
            return pod ? { type: 'pod', project: pod.project } : null;
        }

        return {
            group, focusOn, update, setOpacity, pickAt, fire,
            get focus() { return focus; },
            get pods() { return pods; },
            get signalPhase() { return signalPhase; }
        };
    }

    window.RendererNeural = { create: createNeuralRenderer };
})();