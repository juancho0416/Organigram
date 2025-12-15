// site.js (V8.5: Con Tooltip de Resumen Rápido - Lógica de Búsqueda Modular CORREGIDA)

(function(){
    const datos   = window.__NODOS__ || [];
    const rootElModular  = document.getElementById('org-view');
    const rootElTree     = document.getElementById('org-chart-tree');
    const buscador= document.getElementById('buscador');
    const breadcrumbEl = document.getElementById('breadcrumb');
    const toggleBtn = document.getElementById('toggleViewBtn');
    
    // Contenedor del Tooltip
    const tooltipEl = document.getElementById('quickTooltip'); 
    
    const modalElementos = {
        dialog: document.getElementById('detalleModal'),
        modalCard: document.getElementById('modalCard'),
        modalNombre: document.getElementById('modalNombre'),
        modalPuesto: document.getElementById('modalPuesto'),
        modalArea: document.getElementById('modalArea'),
        modalEmail: document.getElementById('modalEmail'),
        modalAvatar: document.getElementById('modalAvatar'),
        badgeDot: document.getElementById('modalBadgeDot')
    };

    let currentChiefId = null; 
    let currentViewMode = 'modular'; 

    // === Utilidades y Construcción del Árbol ===
    function getVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    const areaColor = (area) => { 
        const a = (area || '').toLowerCase();
        if (a.includes('base de datos')) return getVar('--area-bd');
        if (a.includes('desarrollo'))     return getVar('--area-dev');
        if (a === 't')                    return getVar('--area-t');
        if (a.includes('infra'))          return getVar('--area-infra');
        if (a.includes('operaciones'))    return getVar('--area-ops');
        return getVar('--area-ti');
    };
    const areaToken = (area) => {
        const a = (area || '').toLowerCase().trim();
        if (a.includes('base de datos')) return 'bd';
        if (a.includes('desarrollo'))     return 'dev';
        if (a === 't')                    return 't';
        if (a.includes('infra'))          return 'infra';
        if (a.includes('operaciones'))    return 'ops';
        return 'ti';
    };
    const areaClass = (areaName) => `area-${areaToken(areaName)}`;
    
    function placeholderSVG(nombre){
        const initials = (nombre || 'NA').split(' ').map(s => s[0]?.toUpperCase() || '').slice(0, 2).join('');
        const bg = '#e2e8f0';
        const fg = '#6b7280';
        return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="54%" font-size="36" fill="${fg}" font-family="Segoe UI, Roboto, Arial" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    }
    function el(tag, className, text){
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text != null) e.textContent = text;
        return e;
    }
    
    const porId = new Map(datos.map(d => [d.id, {...d, hijos: [], jefe: null}]));
    let raiz = null;
    porId.forEach(node => {
        if (node.jefeId == null) { raiz = node; }
        else {
            const jefe = porId.get(node.jefeId);
            if (jefe) {
                jefe.hijos.push(node);
                node.jefe = jefe;
            }
        }
    });

    function groupByArea(nodes){
        const map = new Map();
        for (const n of nodes){
            const key = (n.area || 'General').trim();
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(n);
        }
        return map;
    }

    // === Lógica del Tooltip V8.5 ===

    function createTooltipContent(node) {
        let content = el('div');
        
        const header = el('div', 'tooltip-header', node.nombre);
        header.style.color = areaColor(node.area);
        
        content.appendChild(header);
        
        const details = [
            { label: 'Puesto', value: node.puesto },
            { label: 'Área', value: node.area },
            { label: 'Email', value: node.email || 'N/A' },
        ];

        details.forEach(d => {
            const group = el('div', 'tooltip-detail-group');
            const label = el('span', 'tooltip-label', d.label);
            const value = el('span', 'tooltip-value', d.value);
            group.append(label, value);
            content.appendChild(group);
        });

        return content;
    }

    function showTooltip(node, targetElement) {
        if (!tooltipEl) return;
        
        tooltipEl.innerHTML = '';
        tooltipEl.appendChild(createTooltipContent(node));
        
        const rect = targetElement.getBoundingClientRect();
        
        const viewportWidth = window.innerWidth;
        const tooltipWidth = 280; 
        
        let x, y = rect.top + window.scrollY;

        if (rect.right + tooltipWidth + 20 < viewportWidth) {
            x = rect.right + 10;
        } else if (rect.left - tooltipWidth - 10 > 0) {
            x = rect.left - tooltipWidth - 10;
        } else {
            x = rect.left; 
        }

        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
        tooltipEl.style.display = 'block';
        tooltipEl.classList.add('is-visible');
    }

    function hideTooltip() {
        if (tooltipEl) {
            tooltipEl.classList.remove('is-visible');
            setTimeout(() => {
                if (!tooltipEl.classList.contains('is-visible')) {
                    tooltipEl.style.display = 'none';
                }
            }, 250); 
        }
    }
    
    function applyTooltipEvents(element, node) {
        element.addEventListener('mouseover', (e) => {
            if (e.target.closest('button')) return;
            showTooltip(node, element);
        });
        element.addEventListener('mouseout', hideTooltip);
    }

    // === Renderizado Modular ===
    
    function renderSubordinateModule(node){ 
        const module = el('div', `subordinate-module ${areaClass(node.area)}`);
        module.dataset.id = node.id;
        module.setAttribute('role', 'listitem');
        module.setAttribute('tabindex', '0');

        const strip = el('div', 'strip');
        strip.style.background = areaColor(node.area);

        const content = el('div', 'content');
        const info = el('div', 'info');
        const nombre = el('div', 'name', node.nombre);
        const puesto = el('div', 'title', node.puesto);
        info.append(nombre, puesto);

        const avatar = el('div', 'avatar');
        const foto = (node.foto || '').trim();
        avatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node.nombre))}")`;

        content.append(avatar, info);
        const actions = el('div', 'actions');
        
        if (node.hijos && node.hijos.length > 0) {
            const btnDrill = el('button', 'btn-drill', `Ver ${node.hijos.length} Subordinados`);
            btnDrill.addEventListener('click', (e) => {
                e.stopPropagation();
                renderOrgView(node.id);
            });
            actions.appendChild(btnDrill);
        } else {
            const noSubs = el('span', 'no-subs', 'Sin subordinados');
            actions.appendChild(noSubs);
        }

        const btnDetail = el('button', 'btn-detail', 'Detalle');
        btnDetail.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModal(node, areaToken(node.area));
        });
        actions.appendChild(btnDetail);

        module.append(strip, content, actions);

        module.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                renderOrgView(node.id);
            }
        });

        // V8.5: Aplicar eventos de tooltip
        applyTooltipEvents(module, node); 
        
        return module;
    }

    function renderBreadcrumb(nodeId){ 
        const path = [];
        let current = porId.get(nodeId);
        while(current) {
            path.unshift(current);
            current = current.jefe;
        }

        breadcrumbEl.innerHTML = '';
        path.forEach((n, index) => {
            const li = el('li', 'breadcrumb-item');
            const count = n.hijos.length > 0 ? ` (${n.hijos.length})` : '';
            const link = el('a', 'breadcrumb-link', n.nombre + count); 
            link.href = '#';
            link.dataset.id = n.id;
            
            if (index < path.length - 1) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    renderOrgView(n.id);
                });
            } else {
                li.classList.add('is-active');
            }
            li.appendChild(link);

            if (index < path.length - 1) {
                const sep = el('span', 'separator', '›');
                li.appendChild(sep);
            }
            breadcrumbEl.appendChild(li);
        });
    }

    function renderChiefModule(chiefNode) { 
        const container = document.getElementById('current-chief-module');
        container.innerHTML = '';
        if (!chiefNode) return;

        const card = el('div', `chief-card ${areaClass(chiefNode.area)}`);
        card.dataset.id = chiefNode.id;

        const avatar = el('div', 'chief-avatar');
        const foto = (chiefNode.foto || '').trim();
        avatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(chiefNode.nombre))}")`;
        
        const info = el('div', 'chief-info');
        const nombre = el('h3', 'chief-name', chiefNode.nombre);
        const puesto = el('div', 'chief-title', chiefNode.puesto);
        const area = el('div', 'chief-area', chiefNode.area);
        const email = el('div', 'chief-email', chiefNode.email);

        const totalSubs = chiefNode.hijos.length;
        const countEl = el('span', 'subordinate-count', `Reporta directamente a ${totalSubs} persona(s)`);

        info.append(nombre, puesto, area, email, countEl);

        const actions = el('div', 'chief-actions');
        const btnDetail = el('button', 'btn btn-detail-chief', 'Ver Perfil Detallado');
        btnDetail.addEventListener('click', () => abrirModal(chiefNode, areaToken(chiefNode.area)));
        actions.appendChild(btnDetail);

        if (chiefNode.jefe) {
            const btnUp = el('button', 'btn btn-up', `Volver a ${chiefNode.jefe.nombre}`);
            btnUp.addEventListener('click', () => renderOrgView(chiefNode.jefeId));
            actions.appendChild(btnUp);
        }

        card.append(avatar, info, actions);
        container.appendChild(card);
    }

    function renderSubordinateList(chiefNode) { 
        const listContainer = document.getElementById('subordinate-list');
        listContainer.innerHTML = '';
        
        if (!chiefNode || !chiefNode.hijos || chiefNode.hijos.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Este colaborador no tiene subordinados directos.</p>';
            return;
        }

        const grupos = groupByArea(chiefNode.hijos);
        listContainer.setAttribute('role', 'list');
        
        for (const [areaName, nodesOfArea] of grupos.entries()){
            const groupSection = el('section', 'area-group-section');
            const title = el('h4', 'area-group-title', `${areaName} (${nodesOfArea.length})`);
            
            const areaModules = el('div', 'area-modules'); 
            
            nodesOfArea.forEach(node => {
                areaModules.appendChild(renderSubordinateModule(node));
            });
            
            groupSection.append(title, areaModules);
            listContainer.appendChild(groupSection);
        }
    }
    
    function renderOrgView(nodeId){ 
        const node = porId.get(nodeId);
        if (!node) return;

        currentChiefId = nodeId;
        
        renderBreadcrumb(nodeId);
        renderChiefModule(node);
        renderSubordinateList(node);
        
        buscador.value = '';
        rootElModular.classList.remove('search-mode');
        hideTooltip(); 
    }

    // =======================================
    // === VISTA DE ÁRBOL (Diagrama) LÓGICA ===
    // =======================================

    function renderTreeNode(node){
        const branch = el('div', 'branch'); 
        branch.dataset.id = node.id;
        branch.dataset.areaToken = areaToken(node.area);
        
        const card = el('div', 'node');
        card.setAttribute('role', 'treeitem');
        card.setAttribute('tabindex', '0');
        
        const avatar = el('div','avatar');
        const foto = (node.foto || '').trim();
        avatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node.nombre))}")`;

        const info = el('div', 'info');
        const nombre = el('div','nombre', node.nombre);
        const puesto = el('div','puesto', node.puesto);
        const area   = el('div','area',   node.area); 
        info.append(nombre, puesto, area);

        const actions = el('div','actions');
        
        const btnDetail = el('button','btn btn-info','Detalle');
        btnDetail.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            abrirModal(node, areaToken(node.area)); 
        });
        
        actions.append(btnDetail); 
        
        card.append(avatar, info, actions); 
        branch.appendChild(card);
        
        // V8.5: Aplicar eventos de tooltip al nodo del árbol
        applyTooltipEvents(card, node);

        // Lógica de Despliegue/Colapso
        if (node.hijos && node.hijos.length){
            card.classList.add('has-children');
            
            const toggleIcon = el('div', 'toggle-icon');
            card.appendChild(toggleIcon);

            const childrenContainer = el('div','children');
            childrenContainer.style.display = 'none'; 
            card.dataset.expanded = 'false';

            node.hijos.forEach(h => {
                childrenContainer.appendChild(renderTreeNode(h));
            });
            
            branch.appendChild(childrenContainer);

            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-info')) return;
                
                const isExpanded = card.dataset.expanded === 'true';
                
                childrenContainer.style.display = isExpanded ? 'none' : 'flex'; 
                card.dataset.expanded = isExpanded ? 'false' : 'true';
                
                toggleIcon.style.transform = `translateX(-50%) translateY(50%) rotate(${isExpanded ? '0deg' : '90deg'})`;
                
                e.stopPropagation();
            });
        }
        return branch;
    }

    function renderTree(){ 
        if (!rootElTree){ console.warn('No se encontró #org-chart-tree'); return; }
        rootElTree.innerHTML = '';
        if (!raiz){ rootElTree.textContent = 'No hay datos para mostrar.'; return; }

        const rootBranch = renderTreeNode(raiz);
        rootBranch.classList.add('root-branch');
        rootElTree.appendChild(rootBranch);
        
        if (raiz.hijos && raiz.hijos.length > 0) {
            const rootCard = document.querySelector(`#org-chart-tree .root-branch > .node`);
            if (rootCard && rootCard.dataset.expanded === 'false') {
                rootCard.click();
            }
        }
    }
    
    function searchTree(query){ 
        const accent = getVar('--accent');
        const q = query.toLowerCase();

        // 1. Limpiar y Colapsar
        document.querySelectorAll('#org-chart-tree .branch .node').forEach(card => {
            card.classList.remove('is-matched');
            card.style.boxShadow = 'none';

            if (card.dataset.expanded === 'true') {
                 const childrenContainer = card.nextElementSibling;
                 if (childrenContainer) {
                    childrenContainer.style.display = 'none'; 
                    card.dataset.expanded = 'false';
                 }
            }
        });

        if (q.length === 0) return;

        let foundNodes = []; 
        
        document.querySelectorAll('#org-chart-tree .branch').forEach(b => {
            const card = b.querySelector('.node');
            const id = Number(b.dataset.id);
            const d = porId.get(id);
            
            const texto = [d?.nombre, d?.puesto, d?.area, d?.email].join(' ').toLowerCase();

            if (texto.includes(q)) {
                card.style.boxShadow = `0 0 0 3px ${accent}`;
                card.classList.add('is-matched');
                foundNodes.push(d.id); 
                
                // Apertura Automática de Ancestros
                let current = d.jefe;
                while (current) {
                    const jefeCard = document.querySelector(`#org-chart-tree .branch[data-id="${current.id}"] .node`);
                    if (jefeCard && jefeCard.dataset.expanded === 'false') {
                         jefeCard.click(); 
                    }
                    current = current.jefe;
                }
            }
        });
    }
    
    // =======================================
    // === GESTIÓN DE VISTAS Y MODAL ===
    // =======================================

    window.toggleView = function(){ 
        hideTooltip(); // Ocultar el tooltip al cambiar de vista
        if (currentViewMode === 'modular'){
            currentViewMode = 'tree';
            rootElModular.style.display = 'none';
            rootElTree.style.display = 'flex';
            breadcrumbEl.style.display = 'none';
            toggleBtn.textContent = 'Ver Modular ';
            renderTree();
            if (buscador.value.length > 0) searchTree(buscador.value);
        } else {
            currentViewMode = 'modular';
            rootElModular.style.display = 'block';
            rootElTree.style.display = 'none';
            breadcrumbEl.style.display = 'flex';
            toggleBtn.textContent = 'Ver Diagrama ';
            renderOrgView(currentChiefId || raiz.id);
        }
    }

    buscador?.addEventListener('input', (e) => { 
        hideTooltip(); // Ocultar el tooltip al iniciar la búsqueda
        const q = (e.target.value || '').trim();
        
        document.querySelectorAll('.subordinate-module').forEach(m => m.classList.remove('is-matched'));

        if (currentViewMode === 'modular') {
            // LÓGICA DE BÚSQUEDA MODULAR CORREGIDA
            if (q.length > 0) {
                rootElModular.classList.add('search-mode');
                const results = datos.filter(d => 
                    [d.nombre, d.puesto, d.area, d.email].join(' ').toLowerCase().includes(q.toLowerCase())
                );
                
                renderSearchResults(results, q);
                
                results.forEach(d => {
                    const moduleEl = document.querySelector(`#subordinate-list .subordinate-module[data-id="${d.id}"]`);
                    if (moduleEl) moduleEl.classList.add('is-matched');
                });
                
            } else {
                rootElModular.classList.remove('search-mode');
                renderOrgView(currentChiefId || raiz.id); 
            }
        } else if (currentViewMode === 'tree') {
            searchTree(q);
        }
    });

    function renderSearchResults(results, query){ 
        const listContainer = document.getElementById('subordinate-list');
        listContainer.innerHTML = '';
        
        if (results.length === 0) {
            listContainer.innerHTML = `<p class="empty-state">No se encontraron resultados para "${query}".</p>`;
            document.getElementById('current-chief-module').innerHTML = ''; 
            return;
        }

        const title = el('h4', 'area-group-title', `Resultados de Búsqueda (${results.length})`);
        const areaModules = el('div', 'area-modules search-results-modules');
        
        results.forEach(node => {
            const module = renderSubordinateModule(node);
            if (node.jefe) {
                const btnGoToChief = el('button', 'btn-detail', `Ir a Jefe: ${node.jefe.nombre}`);
                btnGoToChief.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderOrgView(node.jefeId);
                });
                module.querySelector('.actions').prepend(btnGoToChief);
            }
            areaModules.appendChild(module);
        });

        document.getElementById('current-chief-module').innerHTML = `<h3 class="chief-name">Búsqueda Global</h3>`;
        listContainer.append(title, areaModules);
    }

    // Modal
    function abrirModal(node, token){ 
        const m = modalElementos;
        m.modalNombre.textContent = node.nombre;
        m.modalPuesto.textContent = node.puesto;
        m.modalArea.textContent   = node.area;
        m.modalEmail.textContent  = node.email;
        const foto = (node.foto || '').trim();
        m.modalAvatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node.nombre))}")`;
        
        m.modalCard?.setAttribute('data-area-token', token || areaToken(node.area));
        
        if (m.badgeDot){
            const color = areaColor(node.area);
            m.badgeDot.style.background = color;
            m.badgeDot.style.boxShadow = `0 0 16px ${color}66`;
        }
        
        m.dialog.showModal();
        document.body.classList.add('modal-open');
    }

    window.cerrarModal = function(){ 
        modalElementos.dialog?.close();
        document.body.classList.remove('modal-open');
    }

    if (modalElementos.dialog){ 
        modalElementos.dialog.addEventListener('close', window.cerrarModal);
        modalElementos.dialog.addEventListener('cancel', window.cerrarModal);
        modalElementos.dialog.addEventListener('click', (e) => {
            const rect = modalElementos.dialog.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right ||
                e.clientY < rect.top || e.clientY > rect.bottom) {
                window.cerrarModal();
            }
        });
    }

    // Init
    if (raiz) {
        renderOrgView(raiz.id);
    }
})();