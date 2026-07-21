(function () {
    var TOUR_STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to BrainCity',
            description: 'A living atlas of systems, projects &mdash; a networked metropolis where every building is a project and every cable is a dependency.',
            camera: { position: [280, 240, 280], target: [0, 20, 0] },
            cardPersist: true
        },
        {
            id: 'overview',
            title: 'The Big Picture',
            description: 'The city is divided into four execution zones. Each zone hosts projects of a different nature, connected by dependencies that pulse with signal traffic.',
            camera: { position: [0, 520, 480], target: [0, 0, 0] },
        },
        {
            id: 'windows',
            title: 'Windows Zone',
            description: 'User-facing systems live here — monitors, visualizers, and dashboards that keep the city observable.',
            camera: { position: [180, 100, -300], target: [0, 30, -180] },
        },
        {
            id: 'vps',
            title: 'VPS Zone',
            description: 'Infrastructure and deployment tooling. The engines and pipelines that keep the city running.',
            camera: { position: [380, 100, 60], target: [180, 30, 0] },
        },
        {
            id: 'cloud',
            title: 'Cloud Zone',
            description: 'Distributed services, simulators, and market tools — the elastic layer that scales with demand.',
            camera: { position: [-200, 100, 380], target: [0, 30, 180] },
        },
        {
            id: 'cross',
            title: 'Cross-Platform Zone',
            description: 'Integration projects that bridge every part of the ecosystem. The nervous system of the city.',
            camera: { position: [-380, 100, -60], target: [-180, 30, 0] },
        },
        {
            id: 'neural',
            title: 'Neural Mode',
            description: 'Click any building to select it, then hit <strong>Go Neural</strong> to dive into its signal network — a firing brain of dendrites, axons, and synapse pods.',
            camera: { position: [40, 60, 120], target: [0, 20, 0] },
        },
        {
            id: 'finale',
            title: 'Ready to Explore',
            description: 'Drag to orbit &bull; Scroll to zoom &bull; Click a building to select &bull; Press <strong>S</strong> for State Engine &bull; <strong>Esc</strong> surfaces from any mode.',
            camera: { position: [280, 240, 280], target: [0, 20, 0] },
            cardPersist: true,
            isFinal: true
        }
    ];

    var CAR_WAYPOINTS = [
        { pos: [0, 2, 0], target: [0, 0, -30], label: 'Central Hub', desc: 'The Central Hub &mdash; all four execution zones converge at this intersection.' },
        { pos: [0, 2, -60], target: [0, 0, -100], label: 'Southbound', desc: 'Heading south on the Windows Radial &mdash; the main artery connecting zones to the hub.' },
        { pos: [30, 2, -130], target: [30, 0, -170], label: 'Windows Zone', desc: 'Entering the Windows Zone &mdash; monitors, visualizers, and dashboards that keep the city observable.' },
        { pos: [-20, 2, -175], target: [0, 0, -195], label: 'Windows Blocks', desc: 'District blocks with grid addresses &mdash; every building has a zone, block, and plot.' },
        { pos: [-50, 2, -140], target: [-60, 0, -100], label: 'Windows Eastbound', desc: 'Eastbound through the Windows neighborhoods toward the VPS corridor.' },
        { pos: [40, 2, -90], target: [80, 0, -50], label: 'Crossing to VPS', desc: 'North-east toward the VPS Zone &mdash; infrastructure and deployment engines.' },
        { pos: [130, 2, -10], target: [170, 0, 0], label: 'VPS Zone', desc: 'The VPS Zone &mdash; pipelines and engines keeping the city running.' },
        { pos: [180, 2, 30], target: [190, 0, 50], label: 'VPS Blocks', desc: 'Infrastructure tooling blocks &mdash; servers, containers, and orchestration.' },
        { pos: [140, 2, 80], target: [100, 0, 100], label: 'Northbound to Cloud', desc: 'Northbound toward the Cloud Zone &mdash; elastic services and distributed systems.' },
        { pos: [20, 2, 140], target: [0, 0, 180], label: 'Cloud Zone', desc: 'The Cloud Zone &mdash; simulators, market tools, and the elastic layer.' },
        { pos: [-30, 2, 175], target: [-40, 0, 190], label: 'Cloud Blocks', desc: 'Distributed compute blocks &mdash; scaling on demand across the city.' },
        { pos: [-90, 2, 130], target: [-120, 0, 100], label: 'West to Cross-Platform', desc: 'West toward the Cross-Platform Zone &mdash; where everything connects.' },
        { pos: [-160, 2, 20], target: [-180, 0, 0], label: 'Cross-Platform Zone', desc: 'Integration projects bridging every corner of the ecosystem.' },
        { pos: [-140, 2, -40], target: [-100, 0, -60], label: 'Cross-Platform Blocks', desc: 'The nervous system of the city &mdash; cross-cutting projects that tie zones together.' },
        { pos: [-30, 2, -10], target: [0, 0, 0], label: 'Returning Home', desc: 'Back to the Central Hub. Explore freely &mdash; drag to orbit, click a building to begin.' }
    ];

    function createTutorialTour(THREE, camera, controls, cameraRig) {
        var stepIndex = -1;
        var active = false;
        var carMode = false;
        var overlay = null;
        var card = null;
        var overlayVisible = false;
        var scene = null;

        function buildDOM() {
            overlay = document.createElement('div');
            overlay.id = 'tour-overlay';
            overlay.innerHTML = '<div id="tour-card"></div>';
            document.body.appendChild(overlay);
            card = document.getElementById('tour-card');
        }

        function showCard(step, isCar) {
            if (!overlay || !card) return;
            overlayVisible = true;
            overlay.classList.add('visible');

            if (isCar) {
                card.innerHTML = ''
                    + '<div class="tour-card-title">' + step.label + '</div>'
                    + '<div class="tour-card-desc">' + step.desc + '</div>'
                    + '<div class="tour-card-footer">'
                    +   '<span class="tour-step-count">' + (stepIndex + 1) + ' / ' + CAR_WAYPOINTS.length + '</span>'
                    +   '<button class="tour-btn tour-btn-next" id="tour-resume-btn">Drive On &rarr;</button>'
                    + '</div>';
                var resumeBtn = document.getElementById('tour-resume-btn');
                if (resumeBtn) resumeBtn.addEventListener('click', function () { hideCard(); cameraRig.resumeDrive(); });
            } else if (step.isFinal) {
                card.innerHTML = ''
                    + '<div class="tour-card-title">' + step.title + '</div>'
                    + '<div class="tour-card-desc">' + step.description + '</div>'
                    + '<div class="tour-card-footer">'
                    +   '<span class="tour-step-count">' + (stepIndex + 1) + ' / ' + TOUR_STEPS.length + '</span>'
                    +   '<button class="tour-btn tour-btn-primary" id="tour-unlock-btn">Unlock Free Roam</button>'
                    + '</div>';
                var unlockBtn = document.getElementById('tour-unlock-btn');
                if (unlockBtn) unlockBtn.addEventListener('click', function () { end(); });
            } else {
                card.innerHTML = ''
                    + '<div class="tour-card-title">' + step.title + '</div>'
                    + '<div class="tour-card-desc">' + step.description + '</div>'
                    + '<div class="tour-card-footer">'
                    +   '<span class="tour-step-count">' + (stepIndex + 1) + ' / ' + TOUR_STEPS.length + '</span>'
                    +   '<button class="tour-btn tour-btn-next" id="tour-next-btn">Next &rarr;</button>'
                    + '</div>';
                var nextBtn = document.getElementById('tour-next-btn');
                if (nextBtn) nextBtn.addEventListener('click', function () { advance(); });
            }
        }

        function hideCard() {
            if (!overlay) return;
            overlayVisible = false;
            overlay.classList.remove('visible');
        }

        function advance() {
            if (!active || carMode) return;
            goToStep(stepIndex + 1);
        }

        function goToStep(index) {
            if (index >= TOUR_STEPS.length) { end(); return; }
            stepIndex = index;
            var step = TOUR_STEPS[stepIndex];
            hideCard();

            var toPos = new THREE.Vector3(step.camera.position[0], step.camera.position[1], step.camera.position[2]);
            var toTarget = new THREE.Vector3(step.camera.target[0], step.camera.target[1], step.camera.target[2]);
            var duration = stepIndex === 0 ? 0.01 : 1.8;

            cameraRig.startTransition('tour', {
                duration: duration,
                camTo: toPos,
                targetTo: toTarget,
                onComplete: function () {
                    if (step.cardPersist !== false && !overlayVisible) {
                        if (stepIndex === 0) {
                            showWelcomeCard();
                        } else {
                            showCard(step, false);
                        }
                    }
                }
            });
        }

        function showWelcomeCard() {
            if (!overlay || !card) return;
            overlayVisible = true;
            overlay.classList.add('visible');
            card.innerHTML = ''
                + '<div class="tour-card-title">' + TOUR_STEPS[0].title + '</div>'
                + '<div class="tour-card-desc">' + TOUR_STEPS[0].description + '</div>'
                + '<div class="tour-card-footer" style="flex-direction:column;gap:8px;">'
                +   '<button class="tour-btn tour-btn-next" id="tour-start-btn" style="width:100%;">Start Step-by-Step Tour</button>'
                +   '<button class="tour-btn tour-btn-primary" id="tour-car-btn" style="width:100%;">Take the Tour Car &rarr;</button>'
                +   '<button class="tour-btn" id="tour-dismiss-btn" style="width:100%;background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);">Dismiss</button>'
                + '</div>';

            document.getElementById('tour-start-btn').addEventListener('click', function () { hideCard(); setTimeout(function () { goToStep(1); }, 300); });
            document.getElementById('tour-car-btn').addEventListener('click', function () { hideCard(); setTimeout(function () { startCarMode(); }, 300); });
            document.getElementById('tour-dismiss-btn').addEventListener('click', function () { end(); });
        }

        function startCarMode() {
            if (!active) return;
            carMode = true;
            stepIndex = 0;

            var pathPoints = CAR_WAYPOINTS.map(function (wp) {
                return new THREE.Vector3(wp.pos[0], wp.pos[1], wp.pos[2]);
            });

            var labels = CAR_WAYPOINTS.map(function (wp) {
                return { label: wp.label, desc: wp.desc };
            });

            cameraRig.startDrive({
                path: pathPoints,
                speed: 35,
                offset: { back: 10, up: 5 },
                scene: scene,
                labels: labels,
                onWaypoint: function (index, label) {
                    stepIndex = index;
                    showCard(label, true);
                    cameraRig.pauseDrive();
                },
                onComplete: function () {
                    carMode = false;
                    end();
                }
            });
        }

        function start() {
            if (active) return;
            active = true;
            carMode = false;
            if (!overlay) buildDOM();
            stepIndex = -1;
            goToStep(0);
        }

        function end() {
            if (!active) return;
            if (carMode) cameraRig.cancelDrive();
            active = false;
            carMode = false;
            stepIndex = -1;
            hideCard();
            controls.enabled = true;
        }

        function setScene(s) { scene = s; }

        function isActive() { return active; }

        function isCarMode() { return carMode; }

        function handleKey(e) {
            if (e.key === 't' || e.key === 'T') {
                if (!active) { start(); return; }
            }
            if (e.key === 'Escape') {
                if (active) { end(); return; }
            }
            if ((e.key === 'Enter' || e.key === ' ') && active && !carMode) {
                e.preventDefault();
                advance();
            }
        }

        function update(dt) {
        }

        return { start, end, advance, isActive, isCarMode, handleKey, update, goToStep, setScene };
    }

    window.TutorialTour = { create: createTutorialTour };
})();
