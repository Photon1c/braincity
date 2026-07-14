(function () {
    /* ------------------------------------------------------------------ */
    /* 3D simplex noise (GLSL) — shared by all shaders                    */
    /* ------------------------------------------------------------------ */
    const shaderNoise = [
        'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
        'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
        'vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }',
        'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
        'float snoise(vec3 v) {',
        '  const vec2 C = vec2(1.0/6.0, 1.0/3.0);',
        '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
        '  vec3 i  = floor(v + dot(v, C.yyy));',
        '  vec3 x0 = v - i + dot(i, C.xxx);',
        '  vec3 g = step(x0.yzx, x0.xyz);',
        '  vec3 l = 1.0 - g;',
        '  vec3 i1 = min(g.xyz, l.zxy);',
        '  vec3 i2 = max(g.xyz, l.zxy);',
        '  vec3 x1 = x0 - i1 + C.xxx;',
        '  vec3 x2 = x0 - i2 + C.yyy;',
        '  vec3 x3 = x0 - D.yyy;',
        '  i = mod289(i);',
        '  vec4 p = permute(permute(permute(',
        '    i.z + vec4(0.0, i1.z, i2.z, 1.0))',
        '    + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
        '    + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
        '  float n_ = 0.142857142857;',
        '  vec3 ns = n_ * D.wyz - D.xzx;',
        '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
        '  vec4 x_ = floor(j * ns.z);',
        '  vec4 y_ = floor(j - 7.0 * x_);',
        '  vec4 x = x_ * ns.x + ns.yyyy;',
        '  vec4 y = y_ * ns.x + ns.yyyy;',
        '  vec4 h = 1.0 - abs(x) - abs(y);',
        '  vec4 b0 = vec4(x.xy, y.xy);',
        '  vec4 b1 = vec4(x.zw, y.zw);',
        '  vec4 s0 = floor(b0)*2.0 + 1.0;',
        '  vec4 s1 = floor(b1)*2.0 + 1.0;',
        '  vec4 sh = -step(h, vec4(0.0));',
        '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;',
        '  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;',
        '  vec3 p0 = vec3(a0.xy, h.x);',
        '  vec3 p1 = vec3(a0.zw, h.y);',
        '  vec3 p2 = vec3(a1.xy, h.z);',
        '  vec3 p3 = vec3(a1.zw, h.w);',
        '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));',
        '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
        '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
        '  m = m * m;',
        '  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));',
        '}'
    ].join('\n');

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
        let signalPhase = 'IDLE';
        let dendriteMesh = null;
        let axonMesh = null;
        let synapsePoints = null;
        const dendriteGeos = [];
        const axonGeos = [];
        const synPositions = [];
        const synSizes = [];

        /* ---- shared shader uniforms ---- */
        const uniforms = {
            uTime: { value: 0 },
            uPhase: { value: 0 },
            uProgress: { value: 0 },
            uSomaColor: { value: new THREE.Color(0x88ccff) },
            uColCyan: { value: new THREE.Color('#00e5ff') },
            uColBlue: { value: new THREE.Color('#0033aa') },
            uColGold: { value: new THREE.Color('#ffaa00') },
            uColOrange: { value: new THREE.Color('#ff4400') },
            uColMagenta: { value: new THREE.Color('#ff0066') },
            uColViolet: { value: new THREE.Color('#6600ff') },
            uDendriteRadius: { value: CONFIG.neural.dendriteRadius },
            uAxonRadius: { value: CONFIG.neural.axonRadius },
            uSomaRadius: { value: 7 }
        };

        /* ---- impulse state machine ---- */
        const PHASE = {
            IDLE: 0,
            DENDRITE_INFLOW: 1,
            SOMA_MERGE: 2,
            AXON_OUTFLOW: 3,
            REFRACTORY: 4
        };
        let impulsePhase = PHASE.IDLE;
        let impulseProgress = 0;
        let ambientTimer = 0;

        /* ---- bioelectric HUD state ---- */
        let membraneV = -70;
        let axonLoad = 2;
        let syncCoh = 24;

        function nodeColor(project) {
            const zoneColors = {
                windows: new THREE.Color(CONFIG.colors.zone.windows),
                vps: new THREE.Color(CONFIG.colors.zone.vps),
                cloud: new THREE.Color(CONFIG.colors.zone.cloud),
                cross: new THREE.Color(CONFIG.colors.zone.cross)
            };
            return (zoneColors[project.zone] || zoneColors.cross).clone();
        }

        /* ---- soma shader material ---- */
        const somaMaterial = new THREE.ShaderMaterial({
            uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            vertexShader: [
                shaderNoise,
                'uniform float uTime;',
                'uniform int uPhase;',
                'uniform float uProgress;',
                'varying vec3 vNormal;',
                'varying vec3 vViewPosition;',
                'varying float vNoise;',
                'void main() {',
                '  vec3 pos = position;',
                '  float noise = snoise(pos * 0.5 + uTime * 0.3) * 0.5;',
                '  float burst = 0.0;',
                '  if (uPhase == 2) { burst = sin(uProgress * 3.14159) * 0.4; }',
                '  pos += normal * (noise + burst);',
                '  vNoise = noise;',
                '  vNormal = normalize(normalMatrix * normal);',
                '  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);',
                '  vViewPosition = -mvPosition.xyz;',
                '  gl_Position = projectionMatrix * mvPosition;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform int uPhase;',
                'uniform float uProgress;',
                'uniform vec3 uSomaColor;',
                'uniform vec3 uColCyan;',
                'uniform vec3 uColBlue;',
                'uniform vec3 uColGold;',
                'uniform vec3 uColMagenta;',
                'varying vec3 vNormal;',
                'varying vec3 vViewPosition;',
                'varying float vNoise;',
                'void main() {',
                '  vec3 normal = normalize(vNormal);',
                '  vec3 viewDir = normalize(vViewPosition);',
                '  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);',
                '  vec3 color = mix(uColBlue * 0.2, uSomaColor, fresnel);',
                '  color += uColCyan * (vNoise * 0.5 + 0.5) * 0.3;',
                '  if (uPhase == 2) {',
                '    float intensity = sin(uProgress * 3.14159);',
                '    color = mix(color, uColGold * 2.0 + uColCyan, intensity * fresnel * 2.0);',
                '    color += uColGold * intensity * (1.0 - fresnel);',
                '  } else if (uPhase == 4) {',
                '    float intensity = 1.0 - uProgress;',
                '    color = mix(color, uColMagenta, intensity * fresnel * 1.5);',
                '  }',
                '  gl_FragColor = vec4(color, 0.8 * fresnel + 0.2);',
                '}'
            ].join('\n')
        });

        /* ---- branch shader material ---- */
        function makeBranchMaterial(isAxon) {
            return new THREE.ShaderMaterial({
                uniforms,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                defines: { IS_AXON: isAxon ? 1 : 0 },
                vertexShader: [
                    shaderNoise,
                    'uniform float uTime;',
                    'varying vec3 vWorldPos;',
                    'varying vec3 vNormal;',
                    'varying vec3 vViewPosition;',
                    'varying vec2 vUv;',
                    'varying float vDist;',
                    'void main() {',
                    '  vUv = uv;',
                    '  vec3 pos = position;',
                    '  float wiggle = snoise(pos * 0.2 + uTime * 0.5) * 0.1;',
                    '  pos += normal * wiggle;',
                    '  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);',
                    '  vWorldPos = worldPosition.xyz;',
                    '  vDist = length(position);',
                    '  vNormal = normalize(normalMatrix * normal);',
                    '  vec4 mvPosition = viewMatrix * worldPosition;',
                    '  vViewPosition = -mvPosition.xyz;',
                    '  gl_Position = projectionMatrix * mvPosition;',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    shaderNoise,
                    'uniform float uTime;',
                    'uniform int uPhase;',
                    'uniform float uProgress;',
                    'uniform vec3 uColCyan;',
                    'uniform vec3 uColBlue;',
                    'uniform vec3 uColGold;',
                    'uniform vec3 uColOrange;',
                    'uniform vec3 uColMagenta;',
                    'uniform vec3 uColViolet;',
                    'uniform float uSomaRadius;',
                    'uniform float uDendriteRadius;',
                    'uniform float uAxonRadius;',
                    'varying vec3 vWorldPos;',
                    'varying vec3 vNormal;',
                    'varying vec3 vViewPosition;',
                    'varying vec2 vUv;',
                    'varying float vDist;',
                    'void main() {',
                    '  vec3 normal = normalize(vNormal);',
                    '  vec3 viewDir = normalize(vViewPosition);',
                    '  float edge = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 2.0);',
                    '  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);',
                    '  float dist = vDist;',
                    '  float idleBreath = 0.45 + 0.15 * sin(uTime * 1.5 + vUv.x * 3.0);',
                    '  vec3 baseColor = mix(uColBlue * 0.5, uColCyan * 0.9, fresnel * edge) * idleBreath;',
                    '  vec3 pulseColor = vec3(0.0);',
                    '  float flowNoise = snoise(vec3(vUv.x * 20.0 - uTime * 2.0, vUv.y * 10.0, uTime)) * 0.5 + 0.5;',
                    '  float axialFlow = 0.65 + 0.35 * sin(vUv.x * 34.0 - uTime * 8.0);',
                    '  #if IS_AXON == 0',
                    '    if (uPhase == 1) {',
                    '      float maxDist = uDendriteRadius;',
                    '      float currentWaveDist = mix(maxDist, uSomaRadius, uProgress);',
                    '      float head = 1.0 - smoothstep(0.0, 2.3, abs(dist - currentWaveDist));',
                    '      float outerTrail = step(currentWaveDist, dist) * exp(-(dist - currentWaveDist) * 0.18);',
                    '      float mergeGlow = (1.0 - smoothstep(uSomaRadius, uSomaRadius + 8.0, dist)) * smoothstep(0.65, 1.0, uProgress);',
                    '      float pulse = max(head * 1.6, outerTrail * 0.65) + mergeGlow * 0.8;',
                    '      pulseColor = uColGold * pulse * flowNoise * axialFlow * 3.2;',
                    '    }',
                    '  #else',
                    '    if (uPhase == 3) {',
                    '      float maxDist = uAxonRadius;',
                    '      float currentWaveDist = mix(uSomaRadius, maxDist + 18.0, uProgress);',
                    '      float head = 1.0 - smoothstep(0.0, 3.4, abs(dist - currentWaveDist));',
                    '      float innerTrail = step(dist, currentWaveDist) * exp(-(currentWaveDist - dist) * 0.1);',
                    '      float somaLaunch = (1.0 - smoothstep(uSomaRadius, uSomaRadius + 7.0, dist)) * (1.0 - smoothstep(0.0, 0.28, uProgress));',
                    '      float pulse = max(head * 2.0, innerTrail * 0.9) + somaLaunch * 1.2;',
                    '      pulseColor = (uColOrange + uColGold * 0.45) * pulse * flowNoise * axialFlow * 4.6;',
                    '    }',
                    '  #endif',
                    '  if (uPhase == 4) {',
                    '    float intensity = 1.0 - uProgress;',
                    '    pulseColor += uColViolet * intensity * edge * 1.5;',
                    '  }',
                    '  gl_FragColor = vec4(baseColor + pulseColor, 1.0);',
                    '}'
                ].join('\n')
            });
        }

        /* ---- synapse point shader ---- */
        const synMat = new THREE.ShaderMaterial({
            uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexShader: [
                'attribute float aSize;',
                'uniform float uTime;',
                'varying float vSize;',
                'void main() {',
                '  vSize = aSize;',
                '  vec3 pos = position;',
                '  pos.y += sin(uTime * 2.0 + pos.x) * 0.5;',
                '  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);',
                '  gl_PointSize = (20.0 + aSize * 15.0) * (100.0 / -mvPosition.z);',
                '  gl_Position = projectionMatrix * mvPosition;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform int uPhase;',
                'uniform float uProgress;',
                'uniform vec3 uColCyan;',
                'uniform vec3 uColGold;',
                'uniform vec3 uColMagenta;',
                'varying float vSize;',
                'void main() {',
                '  vec2 coord = gl_PointCoord - vec2(0.5);',
                '  float d = length(coord);',
                '  if (d > 0.5) discard;',
                '  float alpha = (0.5 - d) * 2.0;',
                '  vec3 color = uColCyan * 0.5;',
                '  if (uPhase == 1 || uPhase == 3) {',
                '    float spark = step(0.8, fract(vSize * 10.0 + uProgress * 5.0));',
                '    color = mix(color, uColGold, spark * 2.0);',
                '  } else if (uPhase == 4) {',
                '    color = mix(color, uColMagenta, (1.0 - uProgress));',
                '  }',
                '  gl_FragColor = vec4(color, alpha);',
                '}'
            ].join('\n')
        });

        /* ---- build tube path from ORIGIN to target ---- */
        function buildTubeGeo(from, to) {
            const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
            mid.add(new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 6 + 3,
                (Math.random() - 0.5) * 8
            ));
            const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
            return new THREE.TubeGeometry(curve, 16, 0.4, 6, false);
        }

        /* ---------------------------------------------------------------- */
        /*  FOCUS_ON                                                        */
        /* ---------------------------------------------------------------- */
        function focusOn(project) {
            SignalEngine.disposeGroupChildren(group);
            focus = project;
            pods = [];
            clickables = [];
            dendriteGeos.length = 0;
            axonGeos.length = 0;
            synPositions.length = 0;
            synSizes.length = 0;
            impulsePhase = PHASE.IDLE;
            impulseProgress = 0;
            ambientTimer = 0;
            signalPhase = 'IDLE';
            dendriteMesh = null;
            axonMesh = null;
            synapsePoints = null;

            const color = nodeColor(project);
            uniforms.uSomaColor.value.copy(color);
            const somaRadius = map(project.repoCount, 1, 12, ...CONFIG.neural.somaRadiusRange);
            uniforms.uSomaRadius.value = somaRadius;

            /* -- soma -- */
            const somaGeo = new THREE.IcosahedronGeometry(somaRadius, 32);
            somaMesh = new THREE.Mesh(somaGeo, somaMaterial);
            somaMesh.userData.kind = 'soma';
            group.add(somaMesh);
            clickables.push(somaMesh);

            const incoming = edges.filter(e => e.b === project.id).map(e => byId.get(e.a));
            const outgoing = edges.filter(e => e.a === project.id).map(e => byId.get(e.b));

            /* -- add a pod + tube -- */
            function addPod(neighbor, angle, radius, type) {
                const jitterY = DataModel.rand(-4, 4);
                const pos = new THREE.Vector3(
                    Math.cos(angle) * radius,
                    jitterY,
                    Math.sin(angle) * radius
                );
                const from = (type === 'in') ? pos : ORIGIN;
                const to = (type === 'in') ? ORIGIN : pos;
                const geo = buildTubeGeo(from, to);
                (type === 'in' ? dendriteGeos : axonGeos).push(geo);

                const podRadius = map(neighbor.repoCount, 1, 12, ...CONFIG.neural.podRadiusRange);
                const baseColor = nodeColor(neighbor);
                const podMat = new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 1, toneMapped: false });
                const mesh = new THREE.Mesh(new THREE.SphereGeometry(podRadius, 12, 8), podMat);
                mesh.position.copy(pos);
                group.add(mesh);
                clickables.push(mesh);

                pods.push({ mesh, project: neighbor, type, localPos: pos.clone(), flash: 0, baseColor });

                /* -- synapse point -- */
                synPositions.push(pos.x, pos.y, pos.z);
                synSizes.push(Math.random());
            }

            incoming.forEach((neighbor, i) => {
                const a = (i / Math.max(1, incoming.length)) * Math.PI * 2 + Math.random() * 0.3;
                addPod(neighbor, a, CONFIG.neural.dendriteRadius, 'in');
            });
            outgoing.forEach((neighbor, i) => {
                const a = (i / Math.max(1, outgoing.length)) * Math.PI * 2 + Math.random() * 0.3;
                addPod(neighbor, a, CONFIG.neural.axonRadius, 'out');
            });

            /* -- merge branch geometries -- */
            const dendriteMat = makeBranchMaterial(false);
            const axonMat = makeBranchMaterial(true);

            if (dendriteGeos.length > 0) {
                const merged = window.mergeGeometries(dendriteGeos, false);
                dendriteMesh = new THREE.Mesh(merged, dendriteMat);
                group.add(dendriteMesh);
            }
            if (axonGeos.length > 0) {
                const merged = window.mergeGeometries(axonGeos, false);
                axonMesh = new THREE.Mesh(merged, axonMat);
                group.add(axonMesh);
            }
            dendriteGeos.forEach(g => g.dispose());
            axonGeos.forEach(g => g.dispose());

            /* -- synapse points -- */
            if (synPositions.length > 0) {
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute(synPositions, 3));
                g.setAttribute('aSize', new THREE.Float32BufferAttribute(synSizes, 1));
                synapsePoints = new THREE.Points(g, synMat);
                group.add(synapsePoints);
            }

            /* -- wireframe core inside soma -- */
            const coreGeo = new THREE.IcosahedronGeometry(somaRadius * 0.8, 8);
            const coreMat = new THREE.MeshBasicMaterial({
                color: CONFIG.colors.healthy,
                transparent: true, opacity: 0.08,
                blending: THREE.AdditiveBlending, wireframe: true
            });
            const coreMesh = new THREE.Mesh(coreGeo, coreMat);
            coreMesh.userData.persist = true;
            group.add(coreMesh);

            return { inCount: incoming.length, outCount: outgoing.length };
        }

        /* ---------------------------------------------------------------- */
        /*  FIRE                                                            */
        /* ---------------------------------------------------------------- */
        function fire() {
            if (impulsePhase !== PHASE.IDLE) return;
            impulsePhase = PHASE.DENDRITE_INFLOW;
            impulseProgress = 0;
            signalPhase = 'INCOMING STIMULUS';

            pods.forEach(p => {
                if (p.type !== 'out') return;
                const speed = CONFIG.signal.pulseSpeed / Math.max(p.localPos.length(), 1);
                pulses.activate(ORIGIN, p.localPos, speed, 0, () => { p.flash = 1; });
            });
        }

        /* ---------------------------------------------------------------- */
        /*  UPDATE                                                          */
        /* ---------------------------------------------------------------- */
        const tmpColor = new THREE.Color();

        function update(dt) {
            uniforms.uTime.value += dt;

            /* -- ambient auto-fire (incoming pressure triggers fire) -- */
            if (impulsePhase === PHASE.IDLE) {
                ambientTimer -= dt;
                if (ambientTimer <= 0) {
                    pods.forEach(p => {
                        if (p.type !== 'in') return;
                        if (Math.random() < p.project.pressure * CONFIG.signal.neuralAmbientRate * dt * 3) {
                            const speed = CONFIG.signal.pulseSpeed / Math.max(p.localPos.length(), 1);
                            pulses.activate(p.localPos, ORIGIN, speed, 0, () => fire());
                            p.flash = 1;
                        }
                    });
                    ambientTimer = 1.5;
                }
            }

            /* -- drive impulse state machine -- */
            if (impulsePhase !== PHASE.IDLE) {
                let speed = 1.0;
                if (impulsePhase === PHASE.DENDRITE_INFLOW) speed = 0.8;
                else if (impulsePhase === PHASE.SOMA_MERGE) speed = 2.5;
                else if (impulsePhase === PHASE.AXON_OUTFLOW) speed = 0.95;
                else if (impulsePhase === PHASE.REFRACTORY) speed = 0.5;

                impulseProgress += dt * speed;

                if (impulseProgress >= 1.0) {
                    impulseProgress = 0.0;
                    impulsePhase++;

                    if (impulsePhase > PHASE.REFRACTORY) {
                        impulsePhase = PHASE.IDLE;
                        signalPhase = 'IDLE';
                    }
                }

                uniforms.uPhase.value = impulsePhase;
                uniforms.uProgress.value = impulseProgress;
            } else {
                uniforms.uPhase.value = 0;
                uniforms.uProgress.value = 0;
            }

            /* -- bioelectric HUD values -- */
            switch (impulsePhase) {
                case PHASE.IDLE:
                    membraneV += (-70 - membraneV) * 0.1;
                    axonLoad += (2 - axonLoad) * 0.1;
                    syncCoh += (24 + Math.sin(uniforms.uTime.value * 2) * 5 - syncCoh) * 0.1;
                    signalPhase = 'RESTING';
                    break;
                case PHASE.DENDRITE_INFLOW:
                    membraneV += (-55 - membraneV) * 0.15;
                    syncCoh += (45 - syncCoh) * 0.15;
                    signalPhase = 'INCOMING STIMULUS';
                    break;
                case PHASE.SOMA_MERGE:
                    membraneV += (40 - membraneV) * 0.15;
                    syncCoh += (85 - syncCoh) * 0.15;
                    signalPhase = 'SOMA MERGE';
                    break;
                case PHASE.AXON_OUTFLOW:
                    membraneV += (20 - membraneV) * 0.15;
                    axonLoad += (98 - axonLoad) * 0.15;
                    syncCoh += (99 - syncCoh) * 0.15;
                    signalPhase = 'AXON OUTFLOW';
                    break;
                case PHASE.REFRACTORY:
                    membraneV += (-80 - membraneV) * 0.15;
                    axonLoad += (15 - axonLoad) * 0.15;
                    syncCoh += (15 - syncCoh) * 0.15;
                    signalPhase = 'REFRACTORY';
                    break;
            }

            /* -- pod flash decay -- */
            pods.forEach(p => {
                p.flash *= Math.pow(0.002, dt);
                tmpColor.copy(p.baseColor).multiplyScalar(1 + p.flash * 1.3);
                p.mesh.material.color.copy(tmpColor);
            });

            const live = pulses.update(dt);
            if (impulsePhase === PHASE.IDLE && live === 0) signalPhase = 'RESTING';
        }

        /* ---------------------------------------------------------------- */
        /*  OPACITY / PICK / ACCESSORS                                      */
        /* ---------------------------------------------------------------- */
        function setOpacity(v) {
            if (somaMesh) somaMesh.material.opacity = v;
            pods.forEach(p => { p.mesh.material.opacity = v; });
            if (dendriteMesh) dendriteMesh.material.opacity = v;
            if (axonMesh) axonMesh.material.opacity = v;
            if (synapsePoints) synapsePoints.material.opacity = v;
            group.children.forEach(child => {
                if (child.userData.persist && child.material) child.material.opacity = v * 0.6;
            });
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
            get signalPhase() { return signalPhase; },
            get impulsePhase() { return impulsePhase; },
            get membraneV() { return membraneV; },
            get axonLoad() { return axonLoad; },
            get syncCoh() { return syncCoh; }
        };
    }

    window.RendererNeural = { create: createNeuralRenderer };
})();
