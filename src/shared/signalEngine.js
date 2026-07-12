/* =========================================================================
   shared/signalEngine.js
   A generic pooled-points pulse system. Both City (cascading impulses along
   dependency cables) and Neural (dendrite/axon firing) instantiate their own
   copy of this and just feed it different graphs and trigger conditions.
   Takes THREE as a parameter rather than importing it, so this file has no
   hidden dependency on load order or module wiring.
   ========================================================================= */
(function () {
    function createPulseSystem(THREE, maxCount) {
        const positions = new Float32Array(maxCount * 3).fill(-9999);
        const colors = new Float32Array(maxCount * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({
            size: 5, vertexColors: true, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false
        });
        const points = new THREE.Points(geo, material);
        const pool = Array.from({ length: maxCount }, () => ({
            active: false, t: 0, speed: 0, depth: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), onArrive: null
        }));

        function freeSlot() { for (let i = 0; i < maxCount; i++) if (!pool[i].active) return i; return -1; }
        function activate(fromVec, toVec, speed, depth, onArrive) {
            const slot = freeSlot();
            if (slot === -1) return false;
            const p = pool[slot];
            p.active = true; p.t = 0; p.speed = speed; p.depth = depth; p.onArrive = onArrive;
            p.from.copy(fromVec); p.to.copy(toVec);
            return true;
        }
        const tmp = new THREE.Vector3();
        function update(dt) {
            let live = 0;
            for (let i = 0; i < maxCount; i++) {
                const p = pool[i], o = i * 3;
                if (!p.active) { positions[o + 1] = -9999; continue; }
                live++;
                p.t += dt * p.speed;
                if (p.t >= 1) {
                    p.active = false; positions[o + 1] = -9999;
                    if (p.onArrive) p.onArrive(p.depth);
                    continue;
                }
                tmp.lerpVectors(p.from, p.to, p.t);
                positions[o] = tmp.x; positions[o + 1] = tmp.y; positions[o + 2] = tmp.z;
                const fade = 1 / (1 + p.depth * 0.35);
                colors[o] = fade; colors[o + 1] = fade; colors[o + 2] = fade;
            }
            geo.attributes.position.needsUpdate = true;
            geo.attributes.color.needsUpdate = true;
            return live;
        }
        function setOpacity(v) { material.opacity = 0.9 * v; }
        return { points, activate, update, setOpacity };
    }

    function disposeGroupChildren(group) {
        for (let i = group.children.length - 1; i >= 0; i--) {
            const child = group.children[i];
            if (child.userData.persist) continue;
            group.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    }

    window.SignalEngine = { createPulseSystem, disposeGroupChildren };
})();