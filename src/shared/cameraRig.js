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
                var body = new THREE.Mesh(
                    new THREE.SphereGeometry(1.8, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false })
                );
                body.position.y = -0.5;
                carGroup.add(body);
                var glow = new THREE.Mesh(
                    new THREE.SphereGeometry(2.5, 8, 6),
                    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25, toneMapped: false })
                );
                carGroup.add(glow);
                var trail = new THREE.Mesh(
                    new THREE.SphereGeometry(0.6, 6, 4),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00, toneMapped: false })
                );
                trail.position.z = 2.5;
                trail.position.y = -0.8;
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
            controls.target.set(firstPos.x, 0, firstPos.z);

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
                    // Bob
                    drive.car.position.y += Math.sin(drive.t * Math.PI * 8) * 0.3;
                }

                // Camera positioned above-behind, looking DOWN at the city
                var camOffset = new THREE.Vector3()
                    .copy(tangent).multiplyScalar(-drive.offset.back)
                    .add(new THREE.Vector3(0, drive.offset.up, 0));
                var camPos = pos.clone().add(camOffset);
                camera.position.lerp(camPos, 0.06);

                var lookTarget = new THREE.Vector3(pos.x, 0, pos.z);
                controls.target.lerp(lookTarget, 0.06);

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
