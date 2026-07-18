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
            zone: 'windows'
        },
        {
            id: 'vps',
            title: 'VPS Zone',
            description: 'Infrastructure and deployment tooling. The engines and pipelines that keep the city running.',
            camera: { position: [380, 100, 60], target: [180, 30, 0] },
            zone: 'vps'
        },
        {
            id: 'cloud',
            title: 'Cloud Zone',
            description: 'Distributed services, simulators, and market tools — the elastic layer that scales with demand.',
            camera: { position: [-200, 100, 380], target: [0, 30, 180] },
            zone: 'cloud'
        },
        {
            id: 'cross',
            title: 'Cross-Platform Zone',
            description: 'Integration projects that bridge every part of the ecosystem. The nervous system of the city.',
            camera: { position: [-380, 100, -60], target: [-180, 30, 0] },
            zone: 'cross'
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

    function createTutorialTour(THREE, camera, controls, cameraRig) {
        var stepIndex = -1;
        var active = false;
        var overlay = null;
        var card = null;
        var overlayVisible = false;
        var zoneLabelCache = null;

        function buildDOM() {
            overlay = document.createElement('div');
            overlay.id = 'tour-overlay';
            overlay.innerHTML = '<div id="tour-card"></div>';
            document.body.appendChild(overlay);

            card = document.getElementById('tour-card');
        }

        function showCard(step) {
            if (!overlay || !card) return;
            overlayVisible = true;
            overlay.classList.add('visible');

            card.innerHTML = ''
                + '<div class="tour-card-title">' + step.title + '</div>'
                + '<div class="tour-card-desc">' + step.description + '</div>'
                + '<div class="tour-card-footer">'
                +   '<span class="tour-step-count">' + (stepIndex + 1) + ' / ' + TOUR_STEPS.length + '</span>'
                +   (step.isFinal
                ?     '<button class="tour-btn tour-btn-primary" id="tour-unlock-btn">Unlock Free Roam</button>'
                :     '<button class="tour-btn tour-btn-next" id="tour-next-btn">Next &rarr;</button>'
                )
                + '</div>';

            var nextBtn = document.getElementById('tour-next-btn');
            var unlockBtn = document.getElementById('tour-unlock-btn');

            if (nextBtn) {
                nextBtn.addEventListener('click', function () { advance(); });
            }
            if (unlockBtn) {
                unlockBtn.addEventListener('click', function () { end(); });
            }
        }

        function hideCard() {
            if (!overlay) return;
            overlayVisible = false;
            overlay.classList.remove('visible');
        }

        function advance() {
            if (!active) return;
            goToStep(stepIndex + 1);
        }

        function goToStep(index) {
            if (index >= TOUR_STEPS.length) { end(); return; }
            stepIndex = index;
            var step = TOUR_STEPS[stepIndex];

            hideCard();

            var fromPos = camera.position.clone();
            var fromTarget = controls.target.clone();
            var toPos = new THREE.Vector3(step.camera.position[0], step.camera.position[1], step.camera.position[2]);
            var toTarget = new THREE.Vector3(step.camera.target[0], step.camera.target[1], step.camera.target[2]);

            var duration = stepIndex === 0 ? 0.01 : 1.8;

            cameraRig.startTransition('tour', {
                duration: duration,
                camTo: toPos,
                targetTo: toTarget,
                onProgress: function (kind, t) {
                    if (t >= 0.5 && !overlayVisible && step.cardPersist !== false) {
                        showCard(step);
                    }
                },
                onComplete: function () {
                    if (step.cardPersist !== false && !overlayVisible) {
                        showCard(step);
                    }
                }
            });
        }

        function start() {
            if (active) return;
            active = true;
            if (!overlay) buildDOM();
            stepIndex = -1;
            advance();
        }

        function end() {
            if (!active) return;
            active = false;
            stepIndex = -1;
            hideCard();
            controls.enabled = true;
        }

        function isActive() { return active; }

        function handleKey(e) {
            if (e.key === 't' || e.key === 'T') {
                if (!active) { start(); return; }
            }
            if (e.key === 'Escape') {
                if (active) { end(); return; }
            }
            if ((e.key === 'Enter' || e.key === ' ') && active) {
                e.preventDefault();
                advance();
            }
        }

        function update(dt) {
        }

        return { start, end, advance, isActive, handleKey, update, goToStep };
    }

    window.TutorialTour = { create: createTutorialTour };
})();
