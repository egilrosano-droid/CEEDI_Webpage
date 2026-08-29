(function () {
  const PAGE_SIZE = 6;
  const grid = document.getElementById('testimonios-grid');
  const emptyEl = document.getElementById('testimonios-empty');
  const moreBtn = document.getElementById('testimonios-more');
  const form = document.getElementById('form-testimonio');
  const statusEl = document.getElementById('testimonio-status');
  const countEl = document.getElementById('testimonio-count');
  const textoEl = document.getElementById('testimonio-texto');
  const waLink = document.getElementById('testimonio-wa');

  if (!grid) return;

  let allItems = [
    {
      "id": "t001",
      "nombre": "Familia R.",
      "rol": "padre",
      "relacion": "Papá de alumno de Club de Tareas",
      "texto": "Desde que mi hijo asiste al club, entrega tareas con más orden y llega más seguro a la escuela. El trato es cercano y profesional.",
      "anio": "2025"
    },
    {
      "id": "t002",
      "nombre": "Exalumna CEEDI",
      "rol": "exalumno",
      "relacion": "Exalumna y mamá de alumna actual",
      "texto": "Estudié aquí de niña y hoy traigo a mi hija al club de tareas. Confío en la misma dedicación y cariño que me acompañaron a mí.",
      "anio": "2026"
    }
  ];
  let filter = 'todos';
  let visible = PAGE_SIZE;

  const ROL_LABEL = {
    padre: 'Familia',
    madre: 'Familia',
    tutor: 'Familia',
    familia: 'Familia',
    exalumno: 'Exalumno/a',
    exalumna: 'Exalumno/a',
    ambos: 'Exalumno/a y familia'
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeRol(rol) {
    const r = String(rol || '').toLowerCase();
    if (r === 'ambos') return 'ambos';
    if (r === 'exalumno' || r === 'exalumna') return 'exalumno';
    return 'familia';
  }

  function matchesFilter(item) {
    const rol = normalizeRol(item.rol);
    if (filter === 'todos') return true;
    if (filter === 'exalumno') return rol === 'exalumno' || rol === 'ambos';
    if (filter === 'familia') return rol === 'familia' || rol === 'ambos';
    return true;
  }

  function filteredItems() {
    return allItems.filter(matchesFilter);
  }

  function render() {
    const items = filteredItems();
    const slice = items.slice(0, visible);

    grid.innerHTML = slice.map(function (item) {
      const rolKey = normalizeRol(item.rol);
      const badge = ROL_LABEL[item.rol] || ROL_LABEL[rolKey] || 'Comunidad';
      const relacion = item.relacion ? '<p class="testimonio-relacion">' + escapeHtml(item.relacion) + '</p>' : '';
      const anio = item.anio ? '<span class="testimonio-anio">' + escapeHtml(item.anio) + '</span>' : '';
      return (
        '<article class="testimonio-card" data-rol="' + escapeHtml(rolKey) + '">' +
          '<div class="testimonio-meta">' +
            '<span class="testimonio-badge">' + escapeHtml(badge) + '</span>' +
            anio +
          '</div>' +
          '<blockquote class="testimonio-texto">“' + escapeHtml(item.texto) + '”</blockquote>' +
          '<p class="testimonio-nombre">' + escapeHtml(item.nombre) + '</p>' +
          relacion +
        '</article>'
      );
    }).join('');

    emptyEl.hidden = items.length > 0;
    moreBtn.hidden = items.length <= visible;
  }

  function setFilter(next) {
    filter = next;
    visible = PAGE_SIZE;
    document.querySelectorAll('.testimonios-filter').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-filter') === filter);
    });
    render();
  }

  document.querySelectorAll('.testimonios-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setFilter(btn.getAttribute('data-filter'));
    });
  });

  moreBtn.addEventListener('click', function () {
    visible += PAGE_SIZE;
    render();
  });

  fetch('data/testimonios.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('No se pudo cargar testimonios');
      return res.json();
    })
    .then(function (data) {
      if (Array.isArray(data) && data.length > 0) {
        allItems = data.slice().reverse();
      }
      render();
    })
    .catch(function () {
      render();
    });

  if (textoEl && countEl) {
    textoEl.addEventListener('input', function () {
      countEl.textContent = String(textoEl.value.length);
    });
  }

  function buildWhatsAppUrl() {
    const nombre = (document.getElementById('testimonio-nombre') || {}).value || '';
    const rol = (document.getElementById('testimonio-rol') || {}).value || '';
    const relacion = (document.getElementById('testimonio-relacion') || {}).value || '';
    const anio = (document.getElementById('testimonio-anio') || {}).value || '';
    const texto = (document.getElementById('testimonio-texto') || {}).value || '';
    const msg = [
      'Hola, quiero enviar un testimonio para la página del CEEDI.',
      'Nombre: ' + nombre,
      'Rol: ' + rol,
      relacion ? 'Relación: ' + relacion : '',
      anio ? 'Año: ' + anio : '',
      '',
      'Testimonio:',
      texto
    ].filter(Boolean).join('\n');
    return 'https://wa.me/525666661250?text=' + encodeURIComponent(msg);
  }

  if (waLink) {
    waLink.addEventListener('click', function (e) {
      const nombre = (document.getElementById('testimonio-nombre') || {}).value.trim();
      const texto = (document.getElementById('testimonio-texto') || {}).value.trim();
      const rol = (document.getElementById('testimonio-rol') || {}).value;
      if (!nombre || !texto || !rol) {
        e.preventDefault();
        if (statusEl) {
          statusEl.textContent = 'Completa nombre, rol y testimonio antes de enviar por WhatsApp.';
        }
        return;
      }
      waLink.href = buildWhatsAppUrl();
    });
  }

  if (form && statusEl) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('enviado') === '1' || window.location.hash.indexOf('enviado=1') !== -1) {
      statusEl.textContent = '¡Gracias! Recibimos tu testimonio. Lo revisaremos y lo publicaremos pronto.';
    }

    form.addEventListener('submit', function () {
      statusEl.textContent = 'Enviando tu testimonio…';
    });
  }

  render();
})();
