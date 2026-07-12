/* =========================================================================
   shared/cameraRig.js
   Owns exactly one thing: tweening the camera (and crossfading two render
   groups) between a "from" and "to" framing. Renderer-agnostic — it knows
   nothing about buildings or neurons, only positions, targets and opacity
   callbacks.
   ========================================================================= */
(function () {
    function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function createCameraRig(THREE, camera, controls) {
        let transition = null;

        function isTransitioning() { return !!transition; }

        // kind: 'dive' | 'surface' | 'switch'
        // opts: { duration, camTo, targetTo, onSwap?, onComplete?, onProgress(kind, t, ease) }
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

        function update(dt) {
            if (!transition) return;
            transition.t += dt / transition.duration;
            const t = Math.min(transition.t, 1);
            const ease = easeInOutQuad(t);
            camera.position.lerpVectors(transition.camFrom, transition.camTo, ease);
            controls.target.lerpVectors(transition.targetFrom, transition.targetTo, ease);

            if (transition.onProgress) transition.onProgress(transition.kind, t, ease, transition);

            if (t >= 1) {
                const cb = transition.onComplete;
                transition = null;
                controls.enabled = true;
                if (cb) cb();
            }
        }

        return { startTransition, update, isTransitioning };
    }

    window.CameraRig = { createCameraRig, easeInOutQuad };
})();