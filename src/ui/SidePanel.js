/* =========================================================================
   ui/SidePanel.js
   Futuristic wireframe sidepanel for project navigation.
   ========================================================================= */
(function () {
    function createSidePanel() {
        const panel = document.createElement('div');
        panel.id = 'sidepanel';
        panel.style.cssText = `
            position: fixed;
            top: 0; right: 0; bottom: 0;
            width: 340px;
            background: linear-gradient(180deg, rgba(2, 8, 18, 0.98) 0%, rgba(1, 4, 10, 0.99) 100%);
            border-left: 1px solid rgba(0, 229, 255, 0.15);
            box-shadow: -20px 0 60px rgba(0, 0, 0, 0.6), inset 1px 0 0 rgba(0, 229, 255, 0.05);
            z-index: 100;
            display: flex;
            flex-direction: column;
            font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', monospace;
            color: #e8f4f8;
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            backdrop-filter: blur(30px) saturate(150%);
        `;

        // Wireframe corner accents
        const corners = ['tl', 'tr', 'bl', 'br'].map(pos => {
            const el = document.createElement('div');
            el.style.cssText = `
                position: absolute; width: 24px; height: 24px; pointer-events: none;
                border: 1px solid rgba(0, 229, 255, 0.3);
                ${pos.includes('t') ? 'top: 0' : 'bottom: 0'};
                ${pos.includes('l') ? 'left: 0' : 'right: 0'};
            `;
            panel.appendChild(el);
            return el;
        });

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px 16px;
            border-bottom: 1px solid rgba(0, 229, 255, 0.1);
            display: flex; align-items: center; justify-content: space-between;
        `;
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:3px;height:20px;background:linear-gradient(180deg,#00e5ff,#ff0066);"></div>
                <div>
                    <div style="font-size:11px;letter-spacing:2px;color:#00e5ff;text-transform:uppercase;font-weight:600;">Project Registry</div>
                    <div style="font-size:9px;color:rgba(232,244,248,0.4);letter-spacing:1px;margin-top:2px;">NEURAL INDEX // V3.0</div>
                </div>
            </div>
            <button id="sidepanel-close" style="
                width:28px;height:28px;border:none;background:rgba(255,0,102,0.1);
                border:1px solid rgba(255,0,102,0.3);color:#ff0066;
                border-radius:6px;cursor:pointer;font-size:14px;display:flex;
                align-items:center;justify-content:center;transition:all 0.15s;
            ">✕</button>
        `;
        panel.appendChild(header);

        // Search/Filter
        const filterBar = document.createElement('div');
        filterBar.style.cssText = `
            padding: 16px 24px 8px;
            display:flex;flex-direction:column;gap:10px;
            border-bottom: 1px solid rgba(0, 229, 255, 0.05);
        `;
        filterBar.innerHTML = `
            <div style="position:relative;">
                <input type="text" id="sidepanel-search" placeholder="SEARCH PROJECTS..." style="
                    width:100%;padding:10px 14px 10px 36px;
                    background:rgba(255,255,255,0.03);
                    border:1px solid rgba(0,229,255,0.15);
                    border-radius:8px;color:#e8f4f8;font-size:12px;font-family:inherit;
                    outline:none;transition:border 0.15s,box-shadow 0.15s;
                ">
                <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(0,229,255,0.5);font-size:13px;">▸</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button data-filter="all" class="filter-btn active" style="
                    padding:6px 12px;background:rgba(0,229,255,0.15);
                    border:1px solid rgba(0,229,255,0.3);color:#00e5ff;
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">ALL</button>
                <button data-filter="engine" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">ENGINE</button>
                <button data-filter="project" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">PROJECT</button>
                <button data-filter="visualizer" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">VISUALIZER</button>
                <button data-filter="monitor" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">MONITOR</button>
                <button data-filter="simulator" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">SIMULATOR</button>
                <button data-filter="infrastructure" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">INFRA</button>
                <button data-filter="market-tool" class="filter-btn" style="
                    padding:6px 12px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.08);color:rgba(232,244,248,0.6);
                    border-radius:999px;font-size:10px;letter-spacing:1px;
                    cursor:pointer;transition:all 0.15s;font-family:inherit;
                ">MARKET</button>
            </div>
        `;
        panel.appendChild(filterBar);

        // Zone filters
        const zoneFilter = document.createElement('div');
        zoneFilter.style.cssText = `
            padding: 8px 24px;
            display:flex;gap:6px;flex-wrap:wrap;
            border-bottom: 1px solid rgba(0, 229, 255, 0.05);
        `;
        zoneFilter.innerHTML = `
            <span style="font-size:9px;color:rgba(232,244,248,0.3);letter-spacing:1px;margin-right:8px;">ZONE:</span>
            <button data-zone="all" class="zone-btn active" style="
                padding:4px 10px;background:rgba(0,229,255,0.1);
                border:1px solid rgba(0,229,255,0.25);color:#00e5ff;
                border-radius:999px;font-size:9px;letter-spacing:1px;
                cursor:pointer;transition:all 0.15s;font-family:inherit;
            ">ALL</button>
            <button data-zone="windows" class="zone-btn" style="
                padding:4px 10px;background:rgba(0,136,255,0.15);
                border:1px solid rgba(0,136,255,0.3);color:#0088ff;
                border-radius:999px;font-size:9px;letter-spacing:1px;
                cursor:pointer;transition:all 0.15s;font-family:inherit;
            ">WINDOWS</button>
            <button data-zone="vps" class="zone-btn" style="
                padding:4px 10px;background:rgba(0,255,136,0.15);
                border:1px solid rgba(0,255,136,0.3);color:#00ff88;
                border-radius:999px;font-size:9px;letter-spacing:1px;
                cursor:pointer;transition:all 0.15s;font-family:inherit;
            ">VPS</button>
            <button data-zone="cloud" class="zone-btn" style="
                padding:4px 10px;background:rgba(255,136,0,0.15);
                border:1px solid rgba(255,136,0,0.3);color:#ff8800;
                border-radius:999px;font-size:9px;letter-spacing:1px;
                cursor:pointer;transition:all 0.15s;font-family:inherit;
            ">CLOUD</button>
            <button data-zone="cross" class="zone-btn" style="
                padding:4px 10px;background:rgba(170,68,255,0.15);
                border:1px solid rgba(170,68,255,0.3);color:#aa44ff;
                border-radius:999px;font-size:9px;letter-spacing:1px;
                cursor:pointer;transition:all 0.15s;font-family:inherit;
            ">CROSS</button>
        `;
        panel.appendChild(zoneFilter);

        // Project list
        const listContainer = document.createElement('div');
        listContainer.style.cssText = `
            flex:1;overflow-y:auto;padding:16px 20px;
            scrollbar-width:thin;scrollbar-color:rgba(0,229,255,0.3) transparent;
        `;
        listContainer.innerHTML = `
            <div id="sidepanel-list" style="display:flex;flex-direction:column;gap:8px;"></div>
        `;
        panel.appendChild(listContainer);

        // Footer stats
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding:16px 24px;
            border-top:1px solid rgba(0,229,255,0.1);
            display:flex;justify-content:space-between;
            font-size:9px;color:rgba(232,244,248,0.4);
            letter-spacing:1px;
        `;
        footer.innerHTML = `
            <span id="sidepanel-count">0 PROJECTS</span>
            <span id="sidepanel-zone-stats"></span>
        `;
        panel.appendChild(footer);

        document.body.appendChild(panel);

        // State
        let projects = [];
        let filteredProjects = [];
        let currentTypeFilter = 'all';
        let currentZoneFilter = 'all';
        let searchQuery = '';
        let onSelectCallback = null;
        let onHoverCallback = null;
        let isOpen = false;

        // Toggle
        function toggle() {
            isOpen = !isOpen;
            panel.style.transform = isOpen ? 'translateX(0)' : 'translateX(100%)';
        }

        function open() {
            isOpen = true;
            panel.style.transform = 'translateX(0)';
        }

        function close() {
            isOpen = false;
            panel.style.transform = 'translateX(100%)';
        }

        // Set projects
        function setProjects(projectList) {
            projects = projectList;
            applyFilters();
        }

        function applyFilters() {
            let result = projects;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                result = result.filter(p =>
                    p.name.toLowerCase().includes(q) ||
                    p.id.toLowerCase().includes(q) ||
                    p.district.toLowerCase().includes(q) ||
                    p.type.toLowerCase().includes(q)
                );
            }

            if (currentTypeFilter !== 'all') {
                result = result.filter(p => p.type === currentTypeFilter);
            }

            if (currentZoneFilter !== 'all') {
                result = result.filter(p => p.zone === currentZoneFilter);
            }

            filteredProjects = result;
            renderList();
            updateFooter();
        }

        function renderList() {
            const list = panel.querySelector('#sidepanel-list');
            if (filteredProjects.length === 0) {
                list.innerHTML = `
                    <div style="padding:40px 20px;text-align:center;color:rgba(232,244,248,0.2);font-size:11px;">
                        <div style="margin-bottom:8px;">◉</div>
                        <div>NO PROJECTS MATCH</div>
                        <div style="font-size:9px;margin-top:4px;opacity:0.5;">ADJUST FILTERS OR SEARCH</div>
                    </div>
                `;
                return;
            }

            // Group by district
            const byDistrict = {};
            filteredProjects.forEach(p => {
                if (!byDistrict[p.district]) byDistrict[p.district] = [];
                byDistrict[p.district].push(p);
            });

            const districtOrder = [
                'Framework', 'Market', 'Monitoring', 'Simulation',
                'Infrastructure & Ops', 'Mythopoetic Narrative',
                'Investigation', 'Nature & Ecology', 'Visualization', 'Agents & AI'
            ];

            let html = '';
            districtOrder.forEach(district => {
                if (!byDistrict[district]) return;
                const items = byDistrict[district];
                html += `
                    <div class="district-group" style="margin-bottom:16px;">
                        <div style="
                            font-size:8px;letter-spacing:2px;
                            color:#00e5ff;opacity:0.7;margin-bottom:8px;
                            padding-left:4px;border-left:2px solid #00e5ff;
                            text-transform:uppercase;
                        ">${district}</div>
                        <div style="display:flex;flex-direction:column;gap:4px;">
                            ${items.map(p => createProjectItem(p)).join('')}
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;

            // Attach events
            list.querySelectorAll('.project-row').forEach(row => {
                const projectId = row.dataset.id;
                const project = projects.find(p => p.id === projectId);
                row.addEventListener('click', () => {
                    if (onSelectCallback) onSelectCallback(project);
                    // Highlight selection
                    list.querySelectorAll('.project-row').forEach(r => r.classList.remove('selected'));
                    row.classList.add('selected');
                });
                row.addEventListener('mouseenter', () => {
                    if (onHoverCallback) onHoverCallback(project);
                    row.style.borderLeftColor = '#ffff88';
                });
                row.addEventListener('mouseleave', () => {
                    if (onHoverCallback) onHoverCallback(null);
                    row.style.borderLeftColor = 'transparent';
                });
            });
        }

        function createProjectItem(p) {
            const zoneColors = {
                windows: '#0088ff', vps: '#00ff88', cloud: '#ff8800', cross: '#aa44ff'
            };
            const typeIcons = {
                engine: '◈', project: '●', visualizer: '◆',
                monitor: '▲', simulator: '▼', infrastructure: '■', 'market-tool': '◆'
            };
            const healthBar = Math.round(p.health * 100);
            const pressureBar = Math.round(p.pressure * 100);

            return `
                <div class="project-row" data-id="${p.id}" style="
                    display:flex;align-items:center;gap:10px;
                    padding:10px 12px;
                    background:rgba(255,255,255,0.02);
                    border:1px solid rgba(255,255,255,0.04);
                    border-radius:8px;
                    border-left:3px solid transparent;
                    cursor:pointer;
                    transition:all 0.15s;
                ">
                    <div style="
                        width:24px;height:24px;border-radius:6px;
                        background:${zoneColors[p.zone] || '#aa44ff'};
                        display:flex;align-items:center;justify-content:center;
                        font-size:11px;color:#050a10;font-weight:700;
                        flex-shrink:0;box-shadow:0 0 8px ${zoneColors[p.zone] || '#aa44ff'}40;
                    ">${typeIcons[p.type] || '●'}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-size:12px;font-weight:600;color:#e8f4f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</span>
                            <span style="font-size:8px;padding:2px 6px;background:rgba(255,255,255,0.05);border-radius:999px;color:rgba(232,244,248,0.5);letter-spacing:0.5px;">${p.type.toUpperCase()}</span>
                        </div>
                        <div style="display:flex;gap:12px;font-size:9px;color:rgba(232,244,248,0.4);">
                            <span>⌬ ${p.repoCount} repos</span>
                            <span>⟳ ${p.commitActivity}</span>
                            <span>★ ${p.stars}</span>
                        </div>
                        <div style="margin-top:6px;display:flex;gap:8px;">
                            <div style="flex:1;height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;">
                                <div style="width:${healthBar}%;height:100%;background:linear-gradient(90deg,#00e5ff,#00ff88);"></div>
                            </div>
                            <div style="flex:1;height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;">
                                <div style="width:${pressureBar}%;height:100%;background:linear-gradient(90deg,#ff0066,#ff8800);"></div>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
                        <span style="font-size:8px;color:rgba(232,244,248,0.3);font-family:monospace;">${p.id.slice(0,16)}…</span>
                        <span style="font-size:7px;color:${zoneColors[p.zone] || '#aa44ff'};letter-spacing:1px;text-transform:uppercase;">${p.zone}</span>
                    </div>
                </div>
            `;
        }

        function updateFooter() {
            const countEl = panel.querySelector('#sidepanel-count');
            const statsEl = panel.querySelector('#sidepanel-zone-stats');
            countEl.textContent = `${filteredProjects.length} / ${projects.length} PROJECTS`;

            const zoneCounts = {};
            projects.forEach(p => {
                zoneCounts[p.zone] = (zoneCounts[p.zone] || 0) + 1;
            });
            const stats = Object.entries(zoneCounts)
                .map(([z, c]) => `<span style="color:${zoneColors[z]};margin-left:12px;">${z.toUpperCase()}: ${c}</span>`)
                .join('');
            statsEl.innerHTML = stats;
        }

        const zoneColors = { windows: '#0088ff', vps: '#00ff88', cloud: '#ff8800', cross: '#aa44ff' };

        // Event listeners
        panel.querySelector('#sidepanel-close').addEventListener('click', close);
        panel.querySelector('#sidepanel-close').addEventListener('mouseenter', (e) => {
            e.target.style.background = 'rgba(255,0,102,0.3)';
            e.target.style.boxShadow = '0 0 12px rgba(255,0,102,0.4)';
        });
        panel.querySelector('#sidepanel-close').addEventListener('mouseleave', (e) => {
            e.target.style.background = 'rgba(255,0,102,0.1)';
            e.target.style.boxShadow = 'none';
        });

        panel.querySelector('#sidepanel-search').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applyFilters();
        });

        panel.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.filter-btn').forEach(b => {
                    b.style.background = 'rgba(255,255,255,0.03)';
                    b.style.borderColor = 'rgba(255,255,255,0.08)';
                    b.style.color = 'rgba(232,244,248,0.6)';
                    b.classList.remove('active');
                });
                btn.style.background = 'rgba(0,229,255,0.15)';
                btn.style.borderColor = 'rgba(0,229,255,0.3)';
                btn.style.color = '#00e5ff';
                btn.classList.add('active');
                currentTypeFilter = btn.dataset.filter;
                applyFilters();
            });
        });

        panel.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.zone-btn').forEach(b => {
                    const z = b.dataset.zone;
                    if (z === 'all') {
                        b.style.background = 'rgba(0,229,255,0.1)';
                        b.style.borderColor = 'rgba(0,229,255,0.25)';
                        b.style.color = '#00e5ff';
                    }
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                currentZoneFilter = btn.dataset.zone;
                applyFilters();
            });
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle();
            }
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        });

        return {
            panel,
            setProjects,
            onSelect: (cb) => { onSelectCallback = cb; },
            onHover: (cb) => { onHoverCallback = cb; },
            toggle,
            open,
            close,
            isOpen: () => isOpen,
            select: (project) => {
                // Find and click the project row
                const row = panel.querySelector(`.project-row[data-id="${project.id}"]`);
                if (row) row.click();
            }
        };
    }

    window.SidePanel = { create: createSidePanel };
})();