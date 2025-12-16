(function(){
    // === Variables de Inicialización y DOM ===
    const datos = window.__NODOS__ || [];
    const rootElModular = document.getElementById('org-view');
    const areaResultsView = document.getElementById('area-results-view'); 
    const treeContainer = document.getElementById('org-chart-tree-container'); 
    const rootElTree = document.getElementById('org-chart-tree');
    
    const buscador = document.getElementById('buscador');
    const breadcrumbEl = document.getElementById('breadcrumb');
    const toggleBtn = document.getElementById('toggleViewBtn');
    const tooltipEl = document.getElementById('quickTooltip'); 
    
    // FILTROS
    const filterPanel = document.getElementById('filterPanel');
    const filterOverlay = document.getElementById('filterOverlay');
    const filterOptionsContainer = document.getElementById('filterOptionsContainer');
    let currentFilters = {}; 
    let isFilterActive = false; 
    
    // PANNING & ZOOM VARIABLES
    let isDragging = false;
    let startX;
    let startY;
    let scrollLeft;
    let scrollTop;
    let scale = 1.0;
    const SCALE_STEP = 0.15;
    const MIN_SCALE = 0.4;
    const MAX_SCALE = 2.0;

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

    // === Utilidades y Construcción del Árbol de Datos ===
    function getVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    
    function getNodeValue(node, prop, defaultText = 'N/A') {
        if (prop === 'area') defaultText = 'General';
        
        const value = node?.[prop];
        return (value !== null && value !== undefined && value.toString().trim() !== '') 
               ? value.toString().trim() 
               : defaultText;
    }

    const areaColor = (area) => { 
        const a = (getNodeValue({area}, 'area')).toLowerCase();
        if (a.includes('base de datos')) return getVar('--area-bd');
        if (a.includes('desarrollo'))     return getVar('--area-dev');
        if (a === 't')                    return getVar('--area-t');
        if (a.includes('infra'))          return getVar('--area-infra');
        if (a.includes('operaciones'))    return getVar('--area-ops');
        return getVar('--area-ti');
    };
    const areaToken = (area) => {
        const a = (getNodeValue({area}, 'area')).toLowerCase().trim();
        if (a.includes('base de datos')) return 'bd';
        if (a.includes('desarrollo'))     return 'dev';
        if (a === 't')                    return 't';
        if (a.includes('infra'))          return 'infra';
        if (a.includes('operaciones'))    return 'ops';
        return 'ti';
    };
    const areaClass = (areaName) => `area-${areaToken(areaName)}`;
    
    function placeholderSVG(node){
        const nombre = getNodeValue(node, 'nombre', 'NA');
        const initials = nombre.split(' ').map(s => s[0]?.toUpperCase() || '').slice(0, 2).join('');
        const bg = areaColor(getNodeValue(node, 'area')) || '#e2e8f0'; 
        const fg = '#ffffff'; 
        return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="54%" font-size="36" fill="${fg}" font-family="Segoe UI, Roboto, Arial" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    }
    
    function el(tag, className, text){
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text != null) e.textContent = text;
        return e;
    }
    
    // CREACIÓN DEL MAPA DE NODOS (ESENCIAL)
    const porId = new Map(datos.map(d => [d.id, {...d, hijos: [], jefe: null}]));
    let raices = []; 

    porId.forEach(node => {
        if (node.jefeId == null) { 
            raices.push(node); 
        }
        else {
            const jefe = porId.get(node.jefeId);
            if (jefe) {
                jefe.hijos.push(node);
                node.jefe = jefe;
            }
        }
    });

    let raiz = raices.length > 0 ? raices[0] : null;

    if (raices.length > 1) {
        console.warn(`Se detectaron ${raices.length} nodos raíz. Usando solo el primero (ID: ${raiz.id}).`);
    } else if (raices.length === 0 && datos.length > 0) {
        console.error("No se detectó ningún nodo raíz (jefeId=null). Esto podría indicar un ciclo o datos inconsistentes.");
    }

    function groupByArea(nodes){
        const map = new Map();
        for (const n of nodes){
            const key = getNodeValue(n, 'area', 'General');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(n);
        }
        return map;
    }

    // === Lógica de Tooltip y Modal ===
    function applyTooltipEvents(element, node) {
        element.addEventListener('mouseover', (e) => {
            if (e.target.closest('button')) return;
            showTooltip(node, element);
        });
        element.addEventListener('mouseout', hideTooltip);
    }
    
    function showTooltip(node, targetElement) {
        if (!tooltipEl || !node) return;
        
        tooltipEl.innerHTML = '';
        
        function createTooltipContent(node) {
            let content = el('div');
            const header = el('div', 'tooltip-header', getNodeValue(node, 'nombre'));
            header.style.color = areaColor(getNodeValue(node, 'area'));
            content.appendChild(header);
            const details = [
                { label: 'Puesto', value: getNodeValue(node, 'puesto', 'Sin Puesto') },
                { label: 'Área', value: getNodeValue(node, 'area', 'General') },
                { label: 'Email', value: getNodeValue(node, 'email', 'Sin Email') },
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

    function abrirModal(node, token){ 
        const m = modalElementos;
        if (!node) return;

        m.modalNombre.textContent = getNodeValue(node, 'nombre');
        m.modalPuesto.textContent = getNodeValue(node, 'puesto', 'Sin Puesto');
        m.modalArea.textContent   = getNodeValue(node, 'area', 'General');
        m.modalEmail.textContent  = getNodeValue(node, 'email', 'Sin Email');

        const foto = (node.foto || '').trim();
        m.modalAvatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node))}")`;
        
        m.modalCard?.setAttribute('data-area-token', token || areaToken(getNodeValue(node, 'area')));
        
        if (m.badgeDot){
            const color = areaColor(getNodeValue(node, 'area'));
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


    // === LÓGICA DE FILTROS ESTRUCTURADA ===
    
    function getUniqueValues(property) {
        const values = new Set();
        datos.forEach(d => {
            const val = getNodeValue(d, property, 'General');
            if (val) values.add(val);
        });
        let areaValues = Array.from(values).sort();
        const generalIndex = areaValues.indexOf('General');
        if (generalIndex > -1) {
            areaValues.splice(generalIndex, 1);
            areaValues.push('General');
        }
        return areaValues; 
    }

    function generateFilterPanelHTML() {
        filterOptionsContainer.innerHTML = '';
        
        const prop = 'area'; 
        const values = getUniqueValues(prop);
        
        if (values.length > 1 || (values.length === 1 && values[0] !== 'General')) { 
            const group = el('div', 'filter-group');
            group.dataset.property = prop;
            group.innerHTML = `<h4>Selecciona las Áreas a Visualizar</h4>`;

            values.forEach(val => {
                const option = el('div', 'filter-option');
                const id = `filter-${prop}-${val.replace(/[\s\W]+/g, '-')}`; 
                
                const checkbox = el('input');
                checkbox.type = 'checkbox';
                checkbox.id = id;
                checkbox.value = val;
                checkbox.checked = currentFilters[prop] && currentFilters[prop].includes(val);
                checkbox.dataset.property = prop;
                
                const label = el('label', null, val);
                label.setAttribute('for', id);
                
                option.append(checkbox, label);
                group.appendChild(option);
            });
            filterOptionsContainer.appendChild(group);
        } else {
             filterOptionsContainer.innerHTML = '<p class="empty-state">No hay suficientes áreas para filtrar.</p>';
        }
    }

    window.toggleFilterPanel = function() {
        const isOpen = filterPanel.classList.toggle('is-open');
        filterOverlay.classList.toggle('is-visible', isOpen);
        
        if (isOpen) {
            generateFilterPanelHTML();
        }
    }

    window.applyFilters = function() {
        currentFilters = {};
        let selectedCount = 0;
        
        document.querySelectorAll('.filter-option input:checked').forEach(checkbox => {
            const prop = checkbox.dataset.property;
            const val = checkbox.value;
            
            if (!currentFilters[prop]) currentFilters[prop] = [];
            currentFilters[prop].push(val);
            selectedCount++;
        });
        
        window.toggleFilterPanel();
        
        isFilterActive = selectedCount > 0;
        
        if (currentViewMode === 'tree') {
            filterTreeNodes();
        }
        else if (isFilterActive) {
            renderAreaResultsView();
        } else {
            // Volver a la vista modular normal si se quitan los filtros
            currentViewMode = 'modular';
            rootElModular.style.display = 'block';
            areaResultsView.style.display = 'none';
            treeContainer.style.display = 'none'; 
            breadcrumbEl.style.display = 'flex';
            toggleBtn.textContent = 'Ver Diagrama ';
            
            // Renderiza el jefe actual con el valor del buscador intacto
            renderOrgView(currentChiefId || raiz?.id, false); 
        }
    }

    window.clearFilters = function() {
        currentFilters = {};
        isFilterActive = false;
        document.querySelectorAll('.filter-option input').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        window.toggleFilterPanel();
        
        currentViewMode = 'modular';
        rootElModular.style.display = 'block';
        areaResultsView.style.display = 'none';
        treeContainer.style.display = 'none'; 
        breadcrumbEl.style.display = 'flex';
        toggleBtn.textContent = 'Ver Diagrama ';
        // Renderiza el jefe actual con el valor del buscador intacto
        renderOrgView(currentChiefId || raiz?.id, false);
    }
    
    function isNodeFilteredOut(node) {
        if (!isFilterActive) return false;

        if (!currentFilters['area'] || currentFilters['area'].length === 0) return true;

        return !currentFilters['area'].includes(getNodeValue(node, 'area', 'General')); 
    }
    
    // === LÓGICA DE VISTA DE RESULTADOS DE ÁREA (FILTRO) ===

    function renderAreaResultsView() {
        currentViewMode = 'area-results';
        rootElModular.style.display = 'none';
        treeContainer.style.display = 'none';
        areaResultsView.style.display = 'block';
        breadcrumbEl.style.display = 'none'; 
        buscador.value = ''; // Limpiamos buscador en vista de resultados de área

        areaResultsView.innerHTML = '';
        const filteredAreas = currentFilters['area'] || [];
        
        if (filteredAreas.length === 0) {
            areaResultsView.innerHTML = '<p class="empty-state">Selecciona al menos un área para ver los resultados.</p>';
            return;
        }

        const filteredNodes = datos.filter(node => filteredAreas.includes(getNodeValue(node, 'area', 'General')));
        const groups = groupByArea(filteredNodes);
        
        if (filteredNodes.length === 0) {
            areaResultsView.innerHTML = '<p class="empty-state">No se encontraron miembros que coincidan con las áreas seleccionadas.</p>';
            return;
        }

        groups.forEach((nodes, areaName) => {
            const container = el('div', 'area-group-container');
            container.style.borderTopColor = areaColor(areaName);

            const header = el('div', 'area-results-header');
            const title = el('h3', null, areaName);
            const count = el('span', 'count', `${nodes.length} Miembros`);
            header.append(title, count);
            container.appendChild(header);

            const grid = el('div', 'area-members-grid');
            
            nodes.forEach(node => {
                const module = renderSubordinateModule(node); 
                module.classList.remove('is-filtered-out');
                
                // En esta vista, el click lleva a la vista modular normal
                module.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) { 
                        currentViewMode = 'modular'; 
                        renderOrgView(node.id, true); // Limpiamos buscador al hacer drill-down
                    }
                });

                grid.appendChild(module);
            });
            
            container.appendChild(grid);
            areaResultsView.appendChild(container);
        });
        
        document.getElementById('current-chief-module').innerHTML = '';
        document.getElementById('subordinate-list').innerHTML = '';
    }

    // === Renderizado Modular ===
    
    function renderSubordinateModule(node){ 
        const module = el('div', `subordinate-module ${areaClass(getNodeValue(node, 'area'))}`);
        module.dataset.id = node.id;
        module.setAttribute('role', 'listitem');
        module.setAttribute('tabindex', '0');

        const strip = el('div', 'strip');
        strip.style.background = areaColor(getNodeValue(node, 'area'));

        const content = el('div', 'content');
        const info = el('div', 'info');
        const nombre = el('div', 'name', getNodeValue(node, 'nombre'));
        const puesto = el('div', 'title', getNodeValue(node, 'puesto', 'Sin Puesto'));
        info.append(nombre, puesto);

        const avatar = el('div', 'avatar');
        const foto = (node.foto || '').trim();
        avatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node))}")`;

        content.append(avatar, info);
        const actions = el('div', 'actions');
        
        if (node.hijos && node.hijos.length > 0) {
            const btnDrill = el('button', 'btn-drill', `Ver ${node.hijos.length} Subordinados`);
            btnDrill.addEventListener('click', (e) => {
                e.stopPropagation();
                // Al hacer drill, limpiamos la búsqueda
                renderOrgView(node.id, true); 
            });
            actions.appendChild(btnDrill);
        } else {
            const noSubs = el('span', 'no-subs', 'Sin subordinados');
            actions.appendChild(noSubs);
        }

        const btnDetail = el('button', 'btn-detail', 'Detalle');
        btnDetail.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModal(node, areaToken(getNodeValue(node, 'area')));
        });
        actions.appendChild(btnDetail);

        module.append(strip, content, actions);

        module.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                // Si haces click en el módulo, hacemos drill-down
                renderOrgView(node.id, true);
            }
        });

        applyTooltipEvents(module, node); 
        
        return module;
    }

    window.renderOrgView = function(nodeId, clearSearch = true){ 
        const node = porId.get(nodeId);
        if (!node) { 
            if (rootElModular.style.display !== 'none' && !raiz) {
                document.getElementById('subordinate-list').innerHTML = '<p class="empty-state">No se encontraron datos de inicio. Verifique `nodos.js`.</p>';
            }
            return;
        }

        currentChiefId = nodeId;
        
        rootElModular.style.display = 'block';
        treeContainer.style.display = 'none';
        areaResultsView.style.display = 'none';

        renderBreadcrumb(nodeId);
        
        if (clearSearch) {
            // Limpiamos el buscador y renderizamos la vista normal
            buscador.value = '';
            rootElModular.classList.remove('search-mode');
            renderChiefModule(node);
            renderSubordinateList(node); 
        } else {
             // NO limpiamos el buscador. Asumimos que venimos de una acción que no debe interrumpir la búsqueda.
             // Aquí solo mostramos el jefe actual y la lista de subordinados, sin afectar el modo búsqueda
             renderChiefModule(node);
             renderSubordinateList(node);
             
             // Si el buscador tiene valor, aplicamos la búsqueda (que ahora es global)
             if(buscador.value) searchModular(buscador.value); 
        }

        hideTooltip(); 
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
            const link = el('a', 'breadcrumb-link', getNodeValue(n, 'nombre') + count); 
            link.href = '#';
            link.dataset.id = n.id;
            
            if (index < path.length - 1) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Al navegar en el breadcrumb, limpiamos la búsqueda
                    renderOrgView(n.id, true); 
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
        
        // No renderizamos el Chief Module si estamos en modo búsqueda
        if (rootElModular.classList.contains('search-mode')) return;

        const card = el('div', `chief-card ${areaClass(getNodeValue(chiefNode, 'area'))}`);
        card.dataset.id = chiefNode.id;

        const avatar = el('div', 'chief-avatar');
        const foto = (chiefNode.foto || '').trim();
        avatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(chiefNode))}")`;
        
        const info = el('div', 'chief-info');
        const nombre = el('h3', 'chief-name', getNodeValue(chiefNode, 'nombre'));
        const puesto = el('div', 'chief-title', getNodeValue(chiefNode, 'puesto', 'Sin Puesto'));
        const area = el('div', 'chief-area', getNodeValue(chiefNode, 'area', 'General'));
        const email = el('div', 'chief-email', getNodeValue(chiefNode, 'email', 'Sin Email'));

        const totalSubs = chiefNode.hijos.length;
        const countEl = el('span', 'subordinate-count', `Reporta directamente a ${totalSubs} persona(s)`);

        info.append(nombre, puesto, area, email, countEl);

        const actions = el('div', 'chief-actions');
        const btnDetail = el('button', 'btn btn-detail-chief', 'Ver Perfil Detallado');
        btnDetail.addEventListener('click', () => abrirModal(chiefNode, areaToken(getNodeValue(chiefNode, 'area'))));
        actions.appendChild(btnDetail);

        if (chiefNode.jefe) {
            const btnUp = el('button', 'btn btn-up', `Volver a ${getNodeValue(chiefNode.jefe, 'nombre')}`);
            btnUp.addEventListener('click', () => renderOrgView(chiefNode.jefeId, true)); // Limpiamos búsqueda al subir
            actions.appendChild(btnUp);
        }

        card.append(avatar, info, actions);
        container.appendChild(card);
    }

    function renderSubordinateList(chiefNode) { 
        const listContainer = document.getElementById('subordinate-list');
        listContainer.innerHTML = '';
        
        // BORRAMOS el mensaje de 'No se encontraron resultados' si existe
        document.getElementById('search-no-results')?.remove();
        
        // Si estamos en modo búsqueda, la lista se renderiza con searchModular
        if (rootElModular.classList.contains('search-mode')) return;

        if (!chiefNode) return;

        const grupos = groupByArea(chiefNode.hijos); 
        listContainer.setAttribute('role', 'list');
        let hasVisibleSubs = false;
        
        if (chiefNode.hijos.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Este colaborador no tiene subordinados directos.</p>';
            return;
        }

        for (const [areaName, nodesOfArea] of grupos.entries()){
            const groupSection = el('section', 'area-group-section');
            groupSection.dataset.area = areaName; 

            const title = el('h4', 'area-group-title', `${areaName} (${nodesOfArea.length})`);
            
            const areaModules = el('div', 'area-modules'); 
            let groupHasVisibleSubs = false;
            
            nodesOfArea.forEach(node => {
                const module = renderSubordinateModule(node); 
                
                // Mantenemos la lógica de filtros de área (is-filtered-out)
                if (isNodeFilteredOut(node)) {
                    module.classList.add('is-filtered-out');
                } else {
                    groupHasVisibleSubs = true;
                    hasVisibleSubs = true;
                }
                areaModules.appendChild(module);
            });
            
            groupSection.append(title, areaModules);
            
            listContainer.appendChild(groupSection);
        }
        
        if (!hasVisibleSubs && chiefNode.hijos.length > 0 && isFilterActive) {
            listContainer.innerHTML = '<p class="empty-state">No hay subordinados directos que coincidan con los filtros aplicados.</p>';
        }
    }

    // === LÓGICA DE BÚSQUEDA MODULAR (CORREGIDA PARA BÚSQUEDA GLOBAL) ===

    function searchModular(query) {
        const q = query.toLowerCase().trim();
        const listContainer = document.getElementById('subordinate-list');
        const chiefContainer = document.getElementById('current-chief-module');
        
        // Limpiamos el mensaje de no resultados previo y el contenido de la lista
        document.getElementById('search-no-results')?.remove();
        listContainer.innerHTML = '';
        
        if (q.length === 0) {
            rootElModular.classList.remove('search-mode');
            // Si no hay consulta, volvemos a renderizar la vista del jefe actual
            window.renderOrgView(currentChiefId || raiz?.id, false); 
            return;
        }

        // Activamos el modo búsqueda
        rootElModular.classList.add('search-mode');
        
        // Ocultamos el módulo del jefe actual en modo búsqueda
        chiefContainer.innerHTML = ''; 
        
        const matchedNodes = [];

        // 1. BUSCAR EN TODOS LOS NODOS (usando 'porId' que contiene todos los datos)
        porId.forEach(d => {
            const texto = [
                getNodeValue(d, 'nombre', ''), 
                getNodeValue(d, 'puesto', ''), 
                getNodeValue(d, 'area', ''), 
                getNodeValue(d, 'email', '')
            ].join(' ').toLowerCase();

            // Incluimos solo los nodos que NO están filtrados por área, si los filtros están activos
            const isFilteredByArea = isFilterActive && isNodeFilteredOut(d);
            
            if (texto.includes(q) && !isFilteredByArea) {
                matchedNodes.push(d);
            }
        });

        // 2. MOSTRAR RESULTADOS GLOBALES AGRUPADOS POR ÁREA
        if (matchedNodes.length > 0) {
            const grupos = groupByArea(matchedNodes);
            listContainer.setAttribute('role', 'list');

            for (const [areaName, nodesOfArea] of grupos.entries()){
                const groupSection = el('section', 'area-group-section');
                groupSection.dataset.area = areaName; 

                const title = el('h4', 'area-group-title', `${areaName} (${nodesOfArea.length} Coincidencias)`);
                
                const areaModules = el('div', 'area-modules'); 
                
                nodesOfArea.forEach(node => {
                    const module = renderSubordinateModule(node); 
                    // Aseguramos que las acciones estén visibles y que el botón de Drill-down funcione
                    const actions = module.querySelector('.actions');
                    if(actions) actions.style.display = 'flex'; 

                    areaModules.appendChild(module);
                });
                
                groupSection.append(title, areaModules);
                listContainer.appendChild(groupSection);
            }
        } else {
            // 3. Mostrar mensaje de no resultados
            const noResults = el('p', 'empty-state search-no-results', `No se encontraron resultados para "${query}".`);
            noResults.id = 'search-no-results';
            listContainer.appendChild(noResults);
        }
    }


    // =======================================
    // === VISTA DE ÁRBOL (Lazy Loading & Panning/Zoom) ===
    // =======================================

    function applyScale() {
        if (rootElTree) {
            rootElTree.style.transform = `scale(${scale})`;
        }
    }

    window.zoomIn = function() {
        scale = Math.min(MAX_SCALE, scale + SCALE_STEP);
        applyScale();
    }

    window.zoomOut = function() {
        scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
        applyScale();
    }

    window.centerView = function() {
        scale = 1.0;
        applyScale();

        setTimeout(() => {
            if (!rootElTree || !treeContainer) return;
            
            const treeWidth = rootElTree.scrollWidth;
            const containerWidth = treeContainer.clientWidth;
            
            // Centrar horizontalmente (scroll)
            const centerScroll = (treeWidth / 2) - (containerWidth / 2);
            treeContainer.scrollLeft = centerScroll;
            treeContainer.scrollTop = 0;
        }, 100);
    }
    
    function loadChildren(node, childrenContainer) {
        if (childrenContainer.dataset.loaded === 'true') return;
        
        node.hijos.forEach(h => {
            childrenContainer.appendChild(renderTreeNode(h));
        });
        
        childrenContainer.dataset.loaded = 'true';
        
        if (isFilterActive) {
            filterTreeNodes();
        }
    }

    function renderTreeNode(node){ 
        const branch = el('div', 'branch'); 
        branch.dataset.id = node.id;
        branch.dataset.areaToken = areaToken(getNodeValue(node, 'area'));
        
        const card = el('div', 'node');
        card.setAttribute('role', 'treeitem');
        card.setAttribute('tabindex', '0');
        
        const avatar = el('div','avatar');
        const foto = (node.foto || '').trim();
        avatar.style.backgroundImage = foto
            ? `url("${foto}")`
            : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node))}")`;

        const info = el('div', 'info');
        const nombre = el('div','nombre', getNodeValue(node, 'nombre'));
        const puesto = el('div','puesto', getNodeValue(node, 'puesto', 'Sin Puesto'));
        const area   = el('div','area',   getNodeValue(node, 'area', 'General')); 
        info.append(nombre, puesto, area);

        const actions = el('div','actions');
        
        const btnDetail = el('button','btn btn-info','Detalle');
        btnDetail.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            abrirModal(node, areaToken(getNodeValue(node, 'area'))); 
        });
        
        actions.append(btnDetail); 
        
        card.append(avatar, info, actions); 
        branch.appendChild(card);
        
        applyTooltipEvents(card, node);

        if (node.hijos && node.hijos.length){
            card.classList.add('has-children');
            
            const toggleIcon = el('div', 'toggle-icon');
            card.appendChild(toggleIcon);

            const childrenContainer = el('div','children');
            childrenContainer.style.display = 'none'; 
            childrenContainer.dataset.loaded = 'false'; 
            card.dataset.expanded = 'false';

            branch.appendChild(childrenContainer);

            card.addEventListener('click', (e) => {
                e.stopPropagation(); 

                if (e.target.closest('.btn-info')) return;
                
                // Evitar colapsar/expandir si se está arrastrando (panning)
                if (isDragging) return; 
                
                const isExpanded = card.dataset.expanded === 'true';
                
                if (!isExpanded && childrenContainer.dataset.loaded === 'false') {
                    loadChildren(node, childrenContainer);
                }
                
                childrenContainer.style.display = isExpanded ? 'none' : 'flex'; 
                card.dataset.expanded = isExpanded ? 'false' : 'true';
                
                // Ajustar la rotación del icono toggle
                toggleIcon.style.transform = `translateX(-50%) translateY(50%) rotate(${isExpanded ? '0deg' : '90deg'})`;
            });
        }
        return branch;
    }

    window.renderTree = function(){ 
        if (!rootElTree){ console.warn('No se encontró #org-chart-tree'); return; }
        rootElTree.innerHTML = '';
        
        // Limpiamos resultados de búsqueda modular
        document.getElementById('search-no-results')?.remove();

        if (!raiz){ rootElTree.textContent = 'No hay datos para mostrar.'; return; }

        const rootBranch = renderTreeNode(raiz);
        rootBranch.classList.add('root-branch');
        rootElTree.appendChild(rootBranch);
        
        const rootCard = document.querySelector(`#org-chart-tree .root-branch > .node`);
        if (rootCard && rootCard.dataset.expanded === 'false') {
            // Forzar la carga inicial de los hijos de la raíz
            rootCard.click(); 
        }
        
        // === AGREGAR CONTROLES DE ZOOM Y PANNING ===
        const controlsContainer = document.querySelector('.tree-controls');
        if (controlsContainer) {
            controlsContainer.innerHTML = '';
            const btnZoomIn = el('button', 'btn btn-zoom', '+');
            btnZoomIn.title = 'Acercar (Zoom In)';
            btnZoomIn.onclick = window.zoomIn;
            
            const btnZoomOut = el('button', 'btn btn-zoom', '–');
            btnZoomOut.title = 'Alejar (Zoom Out)';
            btnZoomOut.onclick = window.zoomOut;
            
            const btnCenter = el('button', 'btn btn-zoom btn-center', '◎');
            btnCenter.title = 'Centrar Vista';
            btnCenter.onclick = window.centerView;

            controlsContainer.append(btnZoomIn, btnZoomOut, btnCenter);
        }
        
        window.centerView();
    }
    
    function filterTreeNodes() {
        const isFiltering = isFilterActive;
        
        document.querySelectorAll('#org-chart-tree .branch .node').forEach(card => {
            card.classList.remove('is-filtered-out');
        });

        if (!isFiltering) return; 

        document.querySelectorAll('#org-chart-tree .branch').forEach(b => {
            const card = b.querySelector('.node');
            const id = Number(b.dataset.id);
            const nodeData = porId.get(id);
            
            if (!nodeData || !card) return;

            if (isNodeFilteredOut(nodeData)) {
                card.classList.add('is-filtered-out');
            } else {
                // Si el nodo coincide, aseguramos que sus ancestros sean visibles
                let current = nodeData.jefe;
                while (current) {
                    const jefeCard = document.querySelector(`#org-chart-tree .branch[data-id="${current.id}"] .node`);
                    if (jefeCard) {
                        jefeCard.classList.remove('is-filtered-out'); 
                    }
                    current = current.jefe;
                }
            }
        });
    }

    function searchTree(query){ 
        const accent = getVar('--accent');
        const q = query.toLowerCase();

        // 1. Limpiar todos los resaltados y el estado de 'is-matched'
        document.querySelectorAll('#org-chart-tree .branch .node').forEach(card => {
            card.classList.remove('is-matched');
            card.style.boxShadow = 'none';
        });

        if (q.length === 0) {
            return;
        }

        let firstMatchCard = null;
        
        // 2. Iterar para buscar y expandir
        porId.forEach(d => {
            const card = document.querySelector(`#org-chart-tree .branch[data-id="${d.id}"] .node`);
            if (!card) return;

            const texto = [
                getNodeValue(d, 'nombre', ''), 
                getNodeValue(d, 'puesto', ''), 
                getNodeValue(d, 'area', ''), 
                getNodeValue(d, 'email', '')
            ].join(' ').toLowerCase();

            if (texto.includes(q)) {
                
                // Aplicar estilos de coincidencia
                const isFiltered = card.classList.contains('is-filtered-out');
                
                if (!isFiltered) {
                    card.style.boxShadow = `0 0 0 3px ${accent}`;
                }
                card.classList.add('is-matched');
                
                if (!firstMatchCard) firstMatchCard = card; 

                // Expandir todos los ancestros para hacer visible el nodo
                let current = d.jefe;
                while (current) {
                    const jefeBranch = document.querySelector(`#org-chart-tree .branch[data-id="${current.id}"]`);
                    const jefeCard = jefeBranch?.querySelector('.node');
                    const childrenContainer = jefeBranch?.querySelector('.children');
                    
                    if (jefeCard && jefeCard.dataset.expanded === 'false') {
                        // Forzar expansión 
                        childrenContainer.style.display = 'flex'; 
                        jefeCard.dataset.expanded = 'true';
                        
                        // Rotación del icono
                        const toggleIcon = jefeCard.querySelector('.toggle-icon');
                        if (toggleIcon) {
                             toggleIcon.style.transform = 'translateX(-50%) translateY(50%) rotate(90deg)';
                        }
                        
                        // Asegurar que los hijos están cargados (lazy load)
                        if (childrenContainer.dataset.loaded === 'false') {
                             loadChildren(current, childrenContainer);
                        }
                    }
                    current = current.jefe;
                }
            }
        });

        // 3. Desplazarse al primer resultado
        if (firstMatchCard) {
            firstMatchCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }


    // === CONEXIÓN DE EVENTOS (al final del código) ===

    // 1. Manejador de la búsqueda
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const query = e.target.value;
            // Solo se permite la búsqueda en Modular y Tree View
            if (currentViewMode === 'tree') {
                // Aseguramos que el árbol esté visible y renderizado para buscar
                if (treeContainer.style.display === 'none') {
                    window.renderTree();
                }
                searchTree(query);
            } else if (currentViewMode === 'modular') {
                searchModular(query); 
            }
        });
    }

    // 2. Evento para cambiar entre vistas
    toggleBtn?.addEventListener('click', () => {
        if (currentViewMode === 'modular' || currentViewMode === 'area-results') {
            currentViewMode = 'tree';
            rootElModular.style.display = 'none';
            areaResultsView.style.display = 'none';
            treeContainer.style.display = 'block';
            breadcrumbEl.style.display = 'none';
            toggleBtn.textContent = 'Ver Módulos ';
            window.renderTree(); // Llama a la renderización del árbol
            if (buscador.value) searchTree(buscador.value); // Reaplicar búsqueda si existe
        } else if (currentViewMode === 'tree') {
            currentViewMode = 'modular';
            rootElModular.style.display = 'block';
            treeContainer.style.display = 'none';
            areaResultsView.style.display = 'none';
            breadcrumbEl.style.display = 'flex';
            toggleBtn.textContent = 'Ver Diagrama ';
            // Mantiene el chief y aplica la búsqueda si el campo no está vacío
            window.renderOrgView(currentChiefId || raiz?.id, false); 
        }
    });
    
    // --- Panning (Arrastre) para la vista de árbol ---
    if (treeContainer) {
        treeContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node') || e.target.closest('.tree-controls')) return;
            isDragging = true;
            treeContainer.classList.add('is-panning');
            startX = e.pageX - treeContainer.offsetLeft;
            startY = e.pageY - treeContainer.offsetTop;
            scrollLeft = treeContainer.scrollLeft;
            scrollTop = treeContainer.scrollTop;
            e.preventDefault(); 
        });

        treeContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            treeContainer.classList.remove('is-panning');
        });

        treeContainer.addEventListener('mouseup', () => {
            isDragging = false;
            treeContainer.classList.remove('is-panning');
        });

        treeContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - treeContainer.offsetLeft;
            const y = e.pageY - treeContainer.offsetTop;
            const walkX = (x - startX) * 1.5; // Ajustar velocidad de arrastre
            const walkY = (y - startY) * 1.5; 
            treeContainer.scrollLeft = scrollLeft - walkX;
            treeContainer.scrollTop = scrollTop - walkY;
        });
    }


    // --- Inicialización (Al cargar la página) ---

    if (raiz) {
        window.renderOrgView(raiz.id);
    } else {
        document.getElementById('org-view').innerHTML = '<p class="empty-state">No se encontraron datos para construir el organigrama.</p>';
    }

})();