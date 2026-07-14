/* =========================================================================
   main.js
   Orchestrator. Wires the data model + renderers + camera rig + HUD
   + State Evolution Engine together. Supports Public and Laboratory editions.
   ========================================================================= */
(function () {
    async function init() {
        const THREE = window.THREE;
        const CONFIG = DataModel.CONFIG;
        const ZONES = DataModel.ZONES;
        const VISIBILITY = DataModel.VISIBILITY;

        // Detect edition from URL or Netlify context
        const isLaboratory = window.location.hostname === 'localhost' ||
                            window.location.search.includes('edition=lab') ||
                            (window.netlifyIdentity && window.netlifyIdentity.currentUser());

        const edition = isLaboratory ? 'laboratory' : 'public';
        console.log(`BrainCity v3 - ${edition.toUpperCase()} EDITION`);

        // Determine visibility filter based on edition
        const allowedVisibilities = edition === 'laboratory'
            ? [VISIBILITY.PUBLIC, VISIBILITY.INTERNAL, VISIBILITY.PRIVATE]
            : [VISIBILITY.PUBLIC];

        // Load project data
        let rawProjects;
        try {
            const source = edition === 'laboratory' ? 'private' : 'public';
            rawProjects = await DataModel.loadProjects(source);
        } catch (error) {
            console.warn('Falling back to generated projects:', error);
            rawProjects = DataModel.generateProjects();
        }

        // Build filtered graph
        const graph = DataModel.buildGraph(rawProjects, {
            visibility: allowedVisibilities,
            zones: []
        });

        /* ---------------- SCENE_SETUP ---------------- */
        const scene = new THREE.Scene();
        // Dark theme background
        scene.fog = new THREE.FogExp2(0x01040a, 0.0008);
        scene.background = new THREE.Color(0x01040a);

        const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far);
        camera.position.set(280, 240, 280);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.body.appendChild(renderer.domElement);

        const composer = new window.EffectComposer(renderer);
        composer.addPass(new window.RenderPass(scene, camera));
        const bloomPass = new window.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold
        );
        composer.addPass(bloomPass);

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });

        /* ---------------- CONTROLS ---------------- */
        const controls = new window.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 30;
        controls.maxDistance = 1100;
        controls.maxPolarAngle = Math.PI / 2 - 0.02;
        controls.target.set(0, 20, 0);

        /* ---------------- RENDERERS + SHARED SYSTEMS ---------------- */
        const city = RendererCity.create(THREE, scene, graph, CONFIG);
        const neural = RendererNeural.create(THREE, scene, graph, CONFIG);
        const stateEngine = StateEvolutionEngine.create(THREE, scene, graph, CONFIG);
        const cameraRig = CameraRig.createCameraRig(THREE, camera, controls);
        const hud = HUD.createHUD();

        /* ---------------- SIDE PANEL ---------------- */
        const sidePanel = SidePanel.create();
        sidePanel.setProjects(graph.projects);
        sidePanel.onSelect((project) => {
            selectedProject = project;
            city.select(project);
        });
        sidePanel.onHover((projectId) => {
            city.setHover(projectId);
        });

        /* ---------------- STATE_MACHINE ---------------- */
        let appState = 'city'; // 'city' | 'transition' | 'neural' | 'state'
        let selectedProject = null;
        let savedCityCam = null;
        let currentMode = 'city'; // 'city' | 'neural' | 'state'

        function enterNeural(project, fromCity) {
            selectedProject = project;
            if (fromCity) {
                if (appState !== 'city') return;
                savedCityCam = { pos: camera.position.clone(), target: controls.target.clone() };
                const { inCount, outCount } = neural.focusOn(project);
                neural.group.visible = true;
                neural.setOpacity(0);
                const camTo = new THREE.Vector3(...CONFIG.neural.home).add(new THREE.Vector3(45, 22, 60));
                appState = 'transition';
                currentMode = 'neural';
                cameraRig.startTransition('dive', {
                    duration: CONFIG.transitionDuration.dive,
                    camTo, targetTo: new THREE.Vector3(...CONFIG.neural.home),
                    onProgress: (kind, t) => {
                        city.setOpacity(THREE.MathUtils.clamp(1 - t / 0.6, 0, 1));
                        neural.setOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                    },
                    onComplete: () => { appState = 'neural'; city.group.visible = false; }
                });
            } else {
                if (appState !== 'neural') return;
                appState = 'transition';
                cameraRig.startTransition('switch', {
                    duration: CONFIG.transitionDuration.switch,
                    camTo: camera.position.clone(), targetTo: controls.target.clone(),
                    onProgress: (kind, t) => {
                        neural.setOpacity(Math.max(0, 1 - Math.sin(Math.min(t, 1) * Math.PI)));
                    },
                    onSwap: () => { neural.focusOn(project); neural.setOpacity(0); },
                    onComplete: () => { appState = 'neural'; neural.setOpacity(1); }
                });
            }
        }

        function exitNeural() {
            if (appState !== 'neural' || !savedCityCam) return;
            city.group.visible = true;
            appState = 'transition';
            currentMode = 'city';
            cameraRig.startTransition('surface', {
                duration: CONFIG.transitionDuration.surface,
                camTo: savedCityCam.pos, targetTo: savedCityCam.target,
                onProgress: (kind, t) => {
                    neural.setOpacity(THREE.MathUtils.clamp(1 - t / 0.6, 0, 1));
                    city.setOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                },
                onComplete: () => { appState = 'city'; neural.group.visible = false; }
            });
        }

        function enterStateEngine() {
            if (appState !== 'city') return;
            savedCityCam = { pos: camera.position.clone(), target: controls.target.clone() };
            stateEngine.group.visible = true;
            stateEngine.setOpacity(0);
            const camTo = new THREE.Vector3(...CONFIG.neural.home).add(new THREE.Vector3(60, 30, 80));
            appState = 'transition';
            currentMode = 'state';
            cameraRig.startTransition('dive', {
                duration: CONFIG.transitionDuration.dive,
                camTo, targetTo: new THREE.Vector3(...CONFIG.neural.home),
                onProgress: (kind, t) => {
                    city.setOpacity(THREE.MathUtils.clamp(1 - t / 0.6, 0, 1));
                    stateEngine.setOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                },
                onComplete: () => { appState = 'state'; city.group.visible = false; }
            });
        }

        function exitStateEngine() {
            if (appState !== 'state' || !savedCityCam) return;
            city.group.visible = true;
            appState = 'transition';
            currentMode = 'city';
            cameraRig.startTransition('surface', {
                duration: CONFIG.transitionDuration.surface,
                camTo: savedCityCam.pos, targetTo: savedCityCam.target,
                onProgress: (kind, t) => {
                    stateEngine.setOpacity(THREE.MathUtils.clamp(1 - t / 0.6, 0, 1));
                    city.setOpacity(THREE.MathUtils.clamp((t - 0.35) / 0.65, 0, 1));
                },
                onComplete: () => { appState = 'city'; stateEngine.group.visible = false; }
            });
        }

        hud.bindActions({
            onGoNeural: () => { if (selectedProject) enterNeural(selectedProject, true); },
            onExitNeural: exitNeural,
            onToggleZone: enterStateEngine,
            onExitState: exitStateEngine
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (appState === 'neural') exitNeural();
                else if (appState === 'state') exitStateEngine();
            }
            if (e.key === 's' && appState === 'city') enterStateEngine();
        });

/* ---------------- pointer -> pick ---------------- */
        const raycaster = new THREE.Raycaster();
        const pointerNDC = new THREE.Vector2();
        let pointerDownPos = null;
        let pointerDownTime = 0;

        // Hover tracking
        renderer.domElement.addEventListener('pointermove', (e) => {
            if (appState !== 'city') return;
            pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
            pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointerNDC, camera);
            const hit = city.pickAt(raycaster);
            if (hit) {
                city.setHover(hit.id);
            } else {
                city.setHover(null);
            }
        });

        renderer.domElement.addEventListener('pointerdown', (e) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
            pointerDownTime = performance.now();
        });

        renderer.domElement.addEventListener('pointerup', (e) => {
            if (!pointerDownPos) return;
            const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            const elapsedMs = performance.now() - pointerDownTime;
            pointerDownPos = null;
            if (moved > 5 || elapsedMs > 400 || appState === 'transition') return;

            pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
            pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointerNDC, camera);

            if (appState === 'city') {
                const hit = city.pickAt(raycaster);
                if (hit) {
                    selectedProject = hit;
                    city.select(hit);
                    sidePanel.select(hit);
                    // Focus camera on selected building
                    const pos = hit.position;
                    const h = hit.height || 40;
                    const dist = Math.max(h * 2.5, 100);
                    const camTo = new THREE.Vector3(pos.x + dist, h * 1.5 + 20, pos.z + dist);
                    const targetTo = new THREE.Vector3(pos.x, h * 0.5, pos.z);
                    cameraRig.startTransition('focus', {
                        duration: 0.8,
                        camTo, targetTo,
                        onComplete: () => { controls.enabled = true; }
                    });
                } else {
                    selectedProject = null;
                    city.clearSelection();
                }
            } else if (appState === 'neural') {
                const hit = neural.pickAt(raycaster);
                if (!hit) return;
                if (hit.type === 'soma') neural.fire();
                else if (hit.type === 'pod') enterNeural(hit.project, false);
            } else if (appState === 'state') {
                const dims = stateEngine.getAllDimensions();
                // Click handling for state engine dimensions could be added here
            }
        });

        /* ---------------- Edition badge ---------------- */
        const editionBadge = document.createElement('div');
        editionBadge.id = 'edition-badge';
        editionBadge.style.cssText = `
            position: absolute; bottom: 16px; left: 16px; z-index: 10;
            font-size: 9px; letter-spacing: 1px; color: var(--gold);
            background: var(--panel-bg); padding: 6px 10px;
            border: 1px solid var(--panel-border); border-radius: 8px;
            backdrop-filter: blur(18px) saturate(160%);
        `;
        editionBadge.textContent = edition === 'laboratory' ? 'LABORATORY EDITION' : 'PUBLIC EDITION';
        document.body.appendChild(editionBadge);

        /* ---------------- ANIMATION_LOOP ---------------- */
        const clock = new THREE.Clock();
        let elapsed = 0;

        function renderHUD() {
            if (appState === 'transition') { hud.setTransitionTag(); return; }
            if (appState === 'city') {
                if (selectedProject) hud.renderCitySelected(selectedProject, city.signalPhase, edition);
                else hud.renderCityEmpty();
            } else if (appState === 'neural' && neural.focus) {
                const inCount = neural.pods.filter(p => p.type === 'in').length;
                const outCount = neural.pods.filter(p => p.type === 'out').length;
                hud.renderNeural(neural.focus, inCount, outCount, neural.signalPhase, edition);
            } else if (appState === 'state') {
                hud.setTransitionTag();
                const stats = document.getElementById('hud-stats');
                const dims = stateEngine.getAllDimensions();
                stats.innerHTML = `
                    <div class="row"><span>Mode</span><span>STATE EVOLUTION</span></div>
                    <div class="empty" style="margin-top:6px;">${dims.map(d => `<div>${d.name}: ${Math.round((d.value||0)*100)}%</div>`).join('')}</div>
                `;
                hud.setAction('← Back to City', 'exit-state');
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.05);
            elapsed += dt;

            controls.update();
            cameraRig.update(dt);
            if (appState === 'city' || appState === 'transition') city.update(dt, elapsed);
            if (appState === 'neural' || appState === 'transition') neural.update(dt);
            if (appState === 'state') stateEngine.update(dt);
            renderHUD();

            composer.render();
        }
        animate();
    }

    if (window.THREE) init();
    else window.addEventListener('citybrain:three-ready', init, { once: true });
})();