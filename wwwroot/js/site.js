

(function(){
  const datos   = window.__NODOS__ || [];
  const rootEl  = document.getElementById('orgchart');
  const buscador= document.getElementById('buscador');

  // === Utilidades por área ===
  function getVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  const areaColor = (area) => {
    const a = (area || '').toLowerCase();
    if (a.includes('base de datos')) return getVar('--area-bd');
    if (a.includes('desarrollo'))     return getVar('--area-dev');
    if (a === 't')                    return getVar('--area-t');
    if (a.includes('infra'))          return getVar('--area-infra');
    if (a.includes('operaciones'))    return getVar('--area-ops');
    return getVar('--area-ti');
  };
  const areaToken = (area) => {
    const a = (area || '').toLowerCase().trim();
    if (a.includes('base de datos')) return 'bd';
    if (a.includes('desarrollo'))     return 'dev';
    if (a === 't')                    return 't';
    if (a.includes('infra'))          return 'infra';
    if (a.includes('operaciones'))    return 'ops';
    return 'ti';
  };

  // === Índices y árbol ===
  const porId = new Map(datos.map(d => [d.id, {...d, hijos: []}]));
  let raiz = null;
  porId.forEach(node => {
    if (node.jefeId == null) { raiz = node; }
    else {
      const jefe = porId.get(node.jefeId);
      if (jefe) jefe.hijos.push(node);
    }
  });

  // === Agrupar por área ===
  function groupByArea(nodes){
    const map = new Map();
    for (const n of nodes){
      const key = (n.area || '').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    return map;
  }

  // === Clase css por área ===
  const areaClassMap = {
    'TI': 'area-ti',
    'Base de datos': 'area-bd',
    'Desarrollo': 'area-dev',
    'T': 'area-t',
    'Infraestructura': 'area-infra',
    'Operaciones': 'area-ops'
  };
  const areaClass = (areaName) => areaClassMap[areaName] || '';

  // === Auto-compactación y buffers por nivel ===
  function layoutChildren(childrenEl){
    if (!childrenEl) return;

    // Evitar que avatars/sombras crucen al vecino
    childrenEl.style.isolation = 'isolate';

    const containerWidth = childrenEl.clientWidth;
    const contentWidth   = childrenEl.scrollWidth;

    // Compactación escalonada (1..3)
    let compact = 0;
    if (contentWidth > containerWidth * 1.05) compact = 1;
    if (contentWidth > containerWidth * 1.15) compact = 2;
    if (contentWidth > containerWidth * 1.25) compact = 3;
    childrenEl.dataset.compactLevel = String(compact);

    const isNarrow = window.matchMedia('(max-width: 768px)').matches;

    // Ajustes por grupo
    childrenEl.querySelectorAll('.area-group').forEach(group => {
      const cardsRow = group.querySelector('.cards-row');
      if (!cardsRow) return;

      const nodes = cardsRow.querySelectorAll('.node').length;

      let minCols = 1;
      if (!isNarrow){
        if (nodes >= 4 && nodes <= 5) minCols = 2;
        else if (nodes >= 6) minCols = 3;
      } else {
        if (nodes >= 3) minCols = 2;
      }
      group.dataset.minCols = String(minCols);
      group.style.setProperty('--min-cols', minCols);

      // Buffer lateral adicional si el grupo es ancho
      const groupWidth = group.scrollWidth;
      if (groupWidth > containerWidth * 0.45){
        group.style.marginInline = 'calc(var(--area-gap) + var(--area-buffer))';
      } else {
        group.style.marginInline = 'var(--area-gap)';
      }

      // Colchón vertical entre filas
      group.style.marginBlock = 'var(--group-block-gap)';
    });
  }

  // === Enfoque de área (desenfocar las otras) ===
  function clearAreaFocus(){
    if (!rootEl) return;
    rootEl.classList.remove('area-focused', 'focus-ti', 'focus-bd', 'focus-dev', 'focus-t', 'focus-infra', 'focus-ops');
    rootEl.querySelectorAll('.area-group.is-area-focused').forEach(g => g.classList.remove('is-area-focused'));
  }
  function focusArea(token, groupEl){
    if (!rootEl) return;
    clearAreaFocus();
    rootEl.classList.add('area-focused', `focus-${token}`);
    if (groupEl) groupEl.classList.add('is-area-focused');
  }

  // Selección Liquid Glass
  let selectedCard = null;
  function setGlassPointer(card, e){
    const rect = card.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * 100 + '%';
    const gy = ((e.clientY - rect.top) / rect.height) * 100 + '%';
    card.style.setProperty('--gx', gx);
    card.style.setProperty('--gy', gy);
  }
  function selectCard(card){
    if (selectedCard) {
      selectedCard.classList.remove('is-selected');
      selectedCard.setAttribute('aria-selected', 'false');
    }
    selectedCard = card;
    card.classList.add('is-selected');
    card.setAttribute('aria-selected', 'true');

    // Enfocar el área del card
    const groupEl = card.closest('.area-group');
    const token = card.dataset.areaToken;
    if (groupEl && token) focusArea(token, groupEl);
  }

  // Helper dom
  function el(tag, className, text){
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  // Crear tarjeta persona
  function renderNodo(node){
    const card = document.createElement('div');
    card.className = 'node';
    card.dataset.id = node.id;
    card.dataset.areaToken = areaToken(node.area);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-selected', 'false');

    const strip = el('div','area-strip');
    strip.style.background = areaColor(node.area);

    const avatarWrap = el('div','avatar-wrap');
    const avatar = el('div','avatar');
    const foto = (node.foto || '').trim();
    if (foto) avatar.style.backgroundImage = `url("${foto}")`;
    else avatar.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node.nombre))}")`;
    avatarWrap.appendChild(avatar);

    const nombre = el('div','nombre', node.nombre);
    const puesto = el('div','puesto', node.puesto);
    const area   = el('div','area',   `Área: ${node.area}`);
    const email  = el('div','email',  node.email);

    const actions = el('div','actions');
    const btnInfo = el('button','btn','Ver detalle');
    btnInfo.addEventListener('click', () => { selectCard(card); abrirModal(node, card.dataset.areaToken); });
    actions.appendChild(btnInfo);

    card.append(strip, avatarWrap, nombre, puesto, area, email, actions);

    // Interacción Liquid Glass
    card.addEventListener('click', (e) => {
      if (e.target.closest('.toggle') || e.target.closest('.btn')) return;
      setGlassPointer(card, e);
      selectCard(card);
    });
    card.addEventListener('pointermove', (e) => {
      if (card.classList.contains('is-selected')) setGlassPointer(card, e);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { selectCard(card); e.preventDefault(); }
    });

    // Toggle hijos
    if (node.hijos && node.hijos.length){
      const toggle = el('div','toggle', `Mostrar ${node.hijos.length} subordinado(s)`);
      let abierto = false;

      const hijosBox = el('div','children');
      hijosBox.style.display = 'none';

      // Agrupar por área
      const grupos = groupByArea(node.hijos);
      for (const [areaName, nodesOfArea] of grupos.entries()){
        const groupEl = el('div', `area-group ${areaClass(areaName)}`);
        groupEl.dataset.areaToken = areaToken(areaName);

        const title = el('div','area-group-title', areaName);
        title.addEventListener('click', () => focusArea(groupEl.dataset.areaToken, groupEl));
        groupEl.appendChild(title);

        const row = el('div','cards-row');

        // Caso especial: jefe área "T" y todos "Subdirector" => 3 columnas
        const jefeEsT = (node.area || '').trim() === 'T';
        const hijosSonSubdirectores = nodesOfArea.every(n => (n.puesto || '').toLowerCase().includes('subdirector'));
        if (jefeEsT && hijosSonSubdirectores){
          groupEl.classList.add('area-subdir-group');
        }

        for (const h of nodesOfArea){
          row.appendChild(renderNodo(h));
        }

        groupEl.appendChild(row);
        hijosBox.appendChild(groupEl);
      }

      toggle.addEventListener('click', () => {
        abierto = !abierto;
        hijosBox.style.display = abierto ? '' : 'none';
        toggle.textContent = (abierto ? 'Ocultar' : 'Mostrar') + ` ${node.hijos.length} subordinado(s)`;

        if (abierto){
          // Ajustar layout anti‑choques al abrir
          requestAnimationFrame(() => layoutChildren(hijosBox));
        }
      });

      card.appendChild(toggle);
      card.appendChild(hijosBox);
    }

    return card;
  }

  // === Render del árbol (desde la raíz) ===
  function renderTree(){
    if (!rootEl){
      console.warn('No se encontró #orgchart');
      return;
    }
    rootEl.innerHTML = '';

    if (!raiz){
      rootEl.textContent = 'No hay datos para mostrar.';
      return;
    }

    const rootBranch = el('div','branch');
    // Dibujamos la raíz
    rootBranch.appendChild(renderNodo(raiz));
    rootEl.appendChild(rootBranch);

    // Si quieres abrir el primer nivel automáticamente, descomenta:
    // rootEl.querySelector('.toggle')?.click();
  }

  // === Click fuera limpia enfoque ===
  rootEl?.addEventListener('click', (e) => {
    if (!e.target.closest('.area-group') && !e.target.closest('.node')){
      clearAreaFocus();
    }
  });

  // === Re-compactar en resize (solo contenedores visibles) ===
  window.addEventListener('resize', () => {
    clearTimeout(window.__org_debounce);
    window.__org_debounce = setTimeout(() => {
      document.querySelectorAll('.children').forEach(el => {
        if (el.style.display !== 'none') layoutChildren(el);
      });
    }, 120);
  });

  // === Búsqueda (outline suave de coincidencias) ===
  buscador?.addEventListener('input', (e) => {
    const q = (e.target.value || '').trim().toLowerCase();
    if (!q){
      document.querySelectorAll('.node').forEach(n => n.style.outline = '');
      return;
    }
    document.querySelectorAll('.node').forEach(n => {
      const id = Number(n.dataset.id);
      const d = porId.get(id);
      const texto = [d?.nombre, d?.puesto, d?.area, d?.email].join(' ').toLowerCase();
      n.style.outline = texto.includes(q) ? `2px solid ${getVar('--accent')}` : '';
    });
  });

  // === Modal mejorado + FIX cierre robusto ===
  const dialog     = document.getElementById('detalleModal');
  const modalCard  = document.getElementById('modalCard');
  const modalNombre= document.getElementById('modalNombre');
  const modalPuesto= document.getElementById('modalPuesto');
  const modalArea  = document.getElementById('modalArea');
  const modalEmail = document.getElementById('modalEmail');
  const modalAvatar= document.getElementById('modalAvatar');
  const badgeDot   = document.getElementById('modalBadgeDot');

  function abrirModal(node, token){
    modalNombre.textContent = node.nombre;
    modalPuesto.textContent = node.puesto;
    modalArea.textContent   = node.area;
    modalEmail.textContent  = node.email;
    const foto = (node.foto || '').trim();
    modalAvatar.style.backgroundImage = foto
      ? `url("${foto}")`
      : `url("data:image/svg+xml;utf8,${encodeURIComponent(placeholderSVG(node.nombre))}")`;
    modalCard?.setAttribute('data-area-token', token || areaToken(node.area));
    if (badgeDot){
      const color = areaColor(node.area);
      badgeDot.style.background = color;
      badgeDot.style.boxShadow = `0 0 16px ${color}66`;
    }
    dialog.showModal();
    document.body.classList.add('modal-open');
  }

  let closing = false;
  function cerrarModal(){
    if (closing) return;
    closing = true;
    try { dialog?.close(); } catch {}
    document.body.classList.remove('modal-open');
    clearAreaFocus();
    setTimeout(() => { closing = false; }, 50);
  }

  if (dialog){
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      clearAreaFocus();
    });
    dialog.addEventListener('cancel', () => {
      document.body.classList.remove('modal-open');
      clearAreaFocus();
    });
    dialog.addEventListener('mousedown', (e) => {
      const inside = e.target.closest('#modalCard');
      if (!inside){
        cerrarModal();
        e.preventDefault();
        e.stopPropagation();
      }
    });
    dialog.addEventListener('click', (e) => {
      const inside = e.target.closest('#modalCard');
      if (!inside){
        cerrarModal();
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      cerrarModal();
    }
  });

  // Exponer para botones HTML
  window.cerrarModal = cerrarModal;

  // === Placeholder avatar SVG ===
  function placeholderSVG(nombre){
       const initials = (nombre || 'NA')
      .split(' ')
      .map(s => s[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
    const bg = '#232428';
    const fg = '#b3b7c5';
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
        <rect width="100%" height="100%" fill="${bg}"/>
        <text x="50%" y="54%" font-size="36" fill="${fg}" font-family="Segoe UI, Roboto, Arial"
              text-anchor="middle" dominant-baseline="middle">${initials}</text>
      </svg>
    `;
  }

  // === Init ===
  renderTree();


})();