/* =========================================================================
   shared/hud.js
   Owns the HUD DOM. Critically: the action button is created ONCE and only
   ever has its text/dataset/display mutated. Earlier versions rebuilt the
   whole panel (including the button) via innerHTML every animation frame,
   which silently breaks click handling — the button element receiving
   mousedown was gone by the time mouseup fired. Stats text is diffed before
   writing so we're not touching the DOM 60x/sec for no reason either.
   ========================================================================= */
(function () {
    function createHUD() {
        const viewTag = document.getElementById('view-tag');
        const stats = document.getElementById('hud-stats');
        const action = document.getElementById('hud-action');
        let lastStatsHTML = '';
        let handlers = { onGoNeural: null, onExitNeural: null, onToggleZone: null };

        action.addEventListener('click', () => {
            if (action.dataset.action === 'go-neural' && handlers.onGoNeural) handlers.onGoNeural();
            if (action.dataset.action === 'exit-neural' && handlers.onExitNeural) handlers.onExitNeural();
            if (action.dataset.action === 'toggle-zone' && handlers.onToggleZone) handlers.onToggleZone();
        });

        function bindActions(h) { handlers = { ...handlers, ...h }; }

        function setStats(html) {
            if (html === lastStatsHTML) return;
            stats.innerHTML = html;
            lastStatsHTML = html;
        }

        function setAction(label, name) {
            if (!label) { action.style.display = 'none'; return; }
            action.style.display = 'block';
            action.textContent = label;
            action.dataset.action = name;
        }

        function renderCityEmpty() {
            viewTag.textContent = 'CITY';
            setStats(`<div class="empty">Click a building to select it, then go neural to enter its signal network.</div>`);
            setAction(null);
        }

        function renderCitySelected(p, signalPhase, edition) {
            viewTag.textContent = 'CITY';
            const editionBadge = edition === 'laboratory' ? ' <span style="color: var(--gold); font-size: 7px;">[LAB]</span>' : '';
            setStats(`
                <div class="row"><span>Name</span><span>${p.name}${editionBadge}</span></div>
                <div class="row"><span>Type</span><span>${p.type}</span></div>
                <div class="row"><span>District</span><span>${p.district}</span></div>
                <div class="row"><span>Zone</span><span>${p.zone.toUpperCase()}</span></div>
                <div class="row"><span>Health</span><span>${Math.round(p.health * 100)}%</span></div>
                <div class="row"><span>Pressure</span><span>${Math.round(p.pressure * 100)}%</span></div>
                <div class="row"><span>Activity</span><span>${p.commitActivity}%</span></div>
                <div class="row"><span>Signal</span><span>${signalPhase}</span></div>
            `);
            setAction('Go Neural →', 'go-neural');
        }

        function renderNeural(p, inCount, outCount, signalPhase, edition) {
            viewTag.textContent = 'NEURAL';
            const editionBadge = edition === 'laboratory' ? ' <span style="color: var(--gold); font-size: 7px;">[LAB]</span>' : '';
            setStats(`
                <div class="row"><span>Node</span><span>${p.name}${editionBadge}</span></div>
                <div class="row"><span>District</span><span>${p.district}</span></div>
                <div class="row"><span>Zone</span><span>${p.zone.toUpperCase()}</span></div>
                <div class="row"><span>Dendrites</span><span>${inCount} in</span></div>
                <div class="row"><span>Axons</span><span>${outCount} out</span></div>
                <div class="row"><span>Health</span><span>${Math.round(p.health * 100)}%</span></div>
                <div class="row"><span>Pressure</span><span>${Math.round(p.pressure * 100)}%</span></div>
                <div class="row"><span>Signal</span><span>${signalPhase}</span></div>
                <div class="empty" style="margin-top:6px;">Click the soma to fire · click a linked node to explore it.</div>
            `);
            setAction('← Back to City', 'exit-neural');
        }

        function setTransitionTag() { viewTag.textContent = '···'; }

        return { bindActions, renderCityEmpty, renderCitySelected, renderNeural, setTransitionTag };
    }

    window.HUD = { createHUD };
})();