(function () {
    function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function createCameraRig(THREE, camera, controls) {
        let transition = null;
        let drive = null;

        function isTransitioning() { return !!(transition || drive); }

        function startTransition(kind, opts) {
            transition = {
                kind, t: 0, duration: opts.duration,
                camFrom: camera.position.clone(), camTo: opts.camTo,
                targetFrom: controls.target.clone(), targetTo: opts.targetTo,
                onSwap: opts.onSwap || null, swapped: false,
                onProgress: opts.onProgress || null,
                onComplete: opts.onComplete || null
            };
            controls.enabled = false;
        }

        function startDrive(opts) {
            var path = opts.path;
            var speed = opts.speed || 40;
            var offset = opts.offset || { back: 18, up: 8 };
            var onWaypoint = opts.onWaypoint || null;
            var onComplete = opts.onComplete || null;
            var labels = opts.labels || [];

            var spline = new THREE.CatmullRomCurve3(path);
            var totalLength = spline.getLength();
            var t = 0;
            var currentWaypoint = -1;

            function createCar() {
                var carGroup = new THREE.Group();

                var bodyMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false });
                var darkMat = new THREE.MeshBasicMaterial({ color: 0x005577, toneMapped: false });
                var wheelMat = new THREE.MeshBasicMaterial({ color: 0x111122, toneMapped: false });

                var chassis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 5.5), bodyMat);
                chassis.position.y = 0.4;
                carGroup.add(chassis);

                var cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.8), darkMat);
                cabin.position.set(0, 1.0, -0.2);
                carGroup.add(cabin);

                var hood = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 1.8), darkMat);
                hood.position.set(0, 0.75, 1.4);
                carGroup.add(hood);

                function addWheel(x, z) {
                    var wheel = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8),
                        wheelMat
                    );
                    wheel.rotation.z = Math.PI / 2;
                    wheel.position.set(x, -0.3, z);
                    carGroup.add(wheel);
                }
                addWheel(-1.7, -1.6);
                addWheel(1.7, -1.6);
                addWheel(-1.7, 1.6);
                addWheel(1.7, 1.6);

                var glow = new THREE.Mesh(
                    new THREE.SphereGeometry(3.0, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.15, toneMapped: false })
                );
                glow.position.y = 0.6;
                carGroup.add(glow);

                var headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
                var leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), headlightMat);
                leftLight.position.set(-0.8, 0.55, 2.75);
                carGroup.add(leftLight);
                var rightLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), headlightMat);
                rightLight.position.set(0.8, 0.55, 2.75);
                carGroup.add(rightLight);

                var trail = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 6, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00, toneMapped: false })
                );
                trail.position.z = -2.9;
                trail.position.y = -0.1;
                carGroup.add(trail);

                return carGroup;
            }

            var car = createCar();
            if (opts.scene) opts.scene.add(car);

            var pathPoints = spline.getPoints(200);

            var firstPos = pathPoints[0];
            var firstTangent = spline.getTangent(0).normalize();
            var firstOffset = new THREE.Vector3()
                .copy(firstTangent).multiplyScalar(-offset.back)
                .add(new THREE.Vector3(0, offset.up, 0));
            camera.position.copy(firstPos.clone().add(firstOffset));
            var initLookAhead = firstPos.clone().add(firstTangent.clone().multiplyScalar(25));
            controls.target.set(initLookAhead.x, 4, initLookAhead.z);

            drive = {
                t: 0, speed: speed / totalLength,
                spline: spline,
                car: car, pathPoints: pathPoints,
                totalLength: totalLength,
                offset: offset,
                onWaypoint: onWaypoint,
                onComplete: onComplete,
                labels: labels,
                currentWaypoint: currentWaypoint,
                paused: false
            };
            controls.enabled = false;
        }

        function pauseDrive() { if (drive) drive.paused = true; }
        function resumeDrive() { if (drive) drive.paused = false; }
        function cancelDrive() {
            if (drive) {
                if (drive.car && drive.car.parent) drive.car.parent.remove(drive.car);
                drive = null;
                controls.enabled = true;
            }
        }

        function update(dt) {
            if (transition) {
                transition.t += dt / transition.duration;
                var t = Math.min(transition.t, 1);
                var ease = easeInOutQuad(t);
                camera.position.lerpVectors(transition.camFrom, transition.camTo, ease);
                controls.target.lerpVectors(transition.targetFrom, transition.targetTo, ease);
                if (transition.onProgress) transition.onProgress(transition.kind, t, ease, transition);
                if (t >= 1) {
                    var cb = transition.onComplete;
                    transition = null;
                    controls.enabled = true;
                    if (cb) cb();
                }
                return;
            }

            if (drive && !drive.paused) {
                drive.t += dt * drive.speed;
                if (drive.t >= 1) {
                    drive.t = 1;
                    if (drive.car && drive.car.parent) drive.car.parent.remove(drive.car);
                    var cb = drive.onComplete;
                    drive = null;
                    controls.enabled = true;
                    if (cb) cb();
                    return;
                }

                var pos = drive.spline.getPoint(drive.t);
                var tangent = drive.spline.getTangent(drive.t).normalize();

                if (drive.car) {
                    drive.car.position.copy(pos);
                    var lookTarget = pos.clone().add(tangent);
                    drive.car.lookAt(lookTarget);
                    // gentle road bob
                    drive.car.position.y += Math.sin(drive.t * Math.PI * 8) * 0.15;
                }

                // Camera follows behind; look forward+up so the car stays in frame and buildings fill the view
                var camOffset = new THREE.Vector3()
                    .copy(tangent).multiplyScalar(-drive.offset.back)
                    .add(new THREE.Vector3(0, drive.offset.up, 0));
                var camPos = pos.clone().add(camOffset);
                camera.position.lerp(camPos, 0.06);

                var lookAhead = pos.clone().add(tangent.clone().multiplyScalar(25));
                var lookTarget = new THREE.Vector3(lookAhead.x, 4, lookAhead.z);
                controls.target.lerp(lookTarget, 0.15);

                // Check waypoints
                var waypointIndex = Math.floor(drive.t * (drive.labels.length));
                if (waypointIndex !== drive.currentWaypoint && waypointIndex < drive.labels.length) {
                    drive.currentWaypoint = waypointIndex;
                    if (drive.onWaypoint) drive.onWaypoint(waypointIndex, drive.labels[waypointIndex]);
                }
            }
        }

        return { startTransition, startDrive, pauseDrive, resumeDrive, update, isTransitioning };
    }

    window.CameraRig = { createCameraRig, easeInOutQuad };
})();
