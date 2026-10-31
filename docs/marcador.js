/* Marcador del hackatón · interfaz.
 * Lee progreso.json de los repositorios de los equipos (o de archivos sueltos) y dibuja la clasificación y la tabla de etapas.
 * Todo lo que viene de fuera se escribe con textContent: nunca se interpreta como HTML. */
(function () {
  'use strict';

  const M = window.MarcadorNucleo;
  const $ = (selector, raiz = document) => raiz.querySelector(selector);

  function el(etiqueta, atributos = {}, ...hijos) {
    const nodo = document.createElement(etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) {
      if (valor === false || valor === null || valor === undefined) continue;
      if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
      else nodo.setAttribute(clave, valor === true ? '' : String(valor));
    }
    for (const hijo of hijos.flat()) {
      if (hijo === null || hijo === undefined || hijo === false) continue;
      nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
    }
    return nodo;
  }

  const estado = { equipos: [], problemas: [], origen: null, leidos: 0, pedidos: 0, cargando: false, ultimaCarga: null, temporizador: null };

  // ------------------------------------------------------------------ dibujar
  function dibujar() {
    const hay = estado.equipos.length > 0;
    $('#resultados').hidden = !hay;
    $('#vacio').hidden = hay || estado.cargando;
    dibujarEstado();
    if (!hay) return;
    $('#banner-ejemplo').hidden = estado.origen !== 'ejemplo';
    const filas = M.calcularMarcador(estado.equipos);
    dibujarResumen(filas);
    dibujarPodio(filas);
    dibujarTabla(filas);
  }

  function dibujarEstado() {
    const nodos = [];
    if (estado.origen === 'repos' && estado.pedidos) {
      nodos.push(el('p', { class: estado.leidos === estado.pedidos ? 'bien' : 'mal' }, `${estado.leidos} de ${estado.pedidos} repositorios leídos.`));
    }
    if (estado.problemas.length) {
      nodos.push(el('ul', { class: 'problemas' }, estado.problemas.map((p) => el('li', {}, el('span', { 'aria-hidden': 'true' }, '✗ '), el('code', {}, p.origen), ' — ', p.motivo))));
    }
    $('#estado').replaceChildren(...nodos);
  }

  function dibujarResumen(filas) {
    const completadas = filas.reduce((s, f) => s + f.completadas, 0);
    $('#resumen').replaceChildren(
      el('span', {}, el('b', {}, filas.length), filas.length === 1 ? ' equipo' : ' equipos'),
      el('span', {}, el('b', {}, completadas), ' etapas completadas'),
      el('span', {}, 'actualizado a las ', el('b', {}, M.hora(new Date(estado.ultimaCarga ?? Date.now()).toISOString()))),
    );
  }

  const MEDALLAS = { 1: 'Primer lugar', 2: 'Segundo lugar', 3: 'Tercer lugar' };
  function dibujarPodio(filas) {
    const podio = filas.filter((f) => f.puesto <= 3 && f.total > 0).slice(0, 5);
    $('#podio').replaceChildren(
      ...podio.map((f) =>
        el(
          'li',
          { class: `puesto p${f.puesto}` },
          el('span', { class: 'lugar' }, `${f.puesto}.º`),
          el('span', { class: 'quien' }, f.equipo.nombre),
          el('span', { class: 'pts' }, el('b', {}, f.total), ' pts'),
          el('span', { class: 'solo-lectores' }, MEDALLAS[f.puesto]),
        ),
      ),
    );
    $('#podio').hidden = podio.length === 0;
  }

  function dibujarTabla(filas) {
    const cabecera = el(
      'tr',
      {},
      el('th', { scope: 'col', class: 'num' }, '#'),
      el('th', { scope: 'col' }, 'Equipo'),
      el('th', { scope: 'col', class: 'num' }, 'Puntos'),
      ...M.ETAPAS.map((e) => el('th', { scope: 'col', class: `etapa${e.extra ? ' extra' : ''}`, title: `${e.titulo} · ${e.puntos} puntos` }, e.corto)),
      el('th', { scope: 'col', class: 'num' }, 'Última'),
    );
    const cuerpo = el('tbody', {});
    for (const f of filas) {
      const celdas = M.ETAPAS.map((e) => {
        const dato = f.equipo.etapas[e.n];
        if (!dato.ok) return el('td', { class: `etapa vacia${e.extra ? ' extra' : ''}` }, el('span', { class: 'solo-lectores' }, 'pendiente'));
        const bono = f.bonificacion[e.n];
        return el(
          'td',
          { class: `etapa hecha${e.extra ? ' extra' : ''}`, title: `${e.titulo}: ${M.hora(dato.primeraVez)}${dato.evidencia ? ` · ${dato.evidencia}` : ''}` },
          el('span', { class: 'marca' }, '✓'),
          el('span', { class: 'hora' }, M.hora(dato.primeraVez)),
          bono && bono.puntos ? el('span', { class: `bono b${bono.posicion}` }, `+${bono.puntos}`) : null,
        );
      });
      cuerpo.append(
        el(
          'tr',
          { class: f.puesto <= 3 && f.total > 0 ? `top p${f.puesto}` : null },
          el('td', { class: 'num puesto-n' }, f.total > 0 ? String(f.puesto) : '—'),
          el('td', { class: 'equipo' }, el('span', {}, f.equipo.nombre), f.equipo.integrantes.length ? el('small', {}, f.equipo.integrantes.join(', ')) : null),
          el('td', { class: 'num total' }, el('b', {}, f.total), f.bono ? el('small', {}, ` (${f.base} + ${f.bono})`) : null),
          ...celdas,
          el('td', { class: 'num' }, f.ultima ? M.hora(new Date(f.ultima).toISOString()) : '—'),
        ),
      );
    }
    $('#tabla').replaceChildren(el('thead', {}, cabecera), cuerpo);
  }

  // ------------------------------------------------------------------ cargar
  async function leerJSON(url) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 15000);
    try {
      // Sin cabeceras propias: una que no sea «simple» obliga a una petición previa que raw.githubusercontent.com rechaza.
      const respuesta = await fetch(`${url}?t=${Date.now()}`, { signal: control.signal });
      if (!respuesta.ok) return { http: respuesta.status };
      const texto = await respuesta.text();
      if (texto.length > 300000) return { error: 'El archivo es demasiado grande para ser un progreso.json.' };
      try {
        return { datos: JSON.parse(texto) };
      } catch {
        return { error: 'No es un JSON válido.' };
      }
    } catch (error) {
      return { error: error.name === 'AbortError' ? 'GitHub tardó demasiado en responder.' : 'No se pudo conectar con GitHub (¿hay internet?).' };
    } finally {
      clearTimeout(reloj);
    }
  }

  function motivoHttp(codigo, rama) {
    if (codigo === 404) return `No encuentro progreso.json en la rama «${rama}». ¿El repositorio es público? ¿Ya corrieron npm run verificar y subieron el archivo con git push?`;
    if (codigo === 403 || codigo === 429) return 'GitHub está limitando las lecturas: espera un minuto.';
    return `GitHub respondió ${codigo}.`;
  }

  async function cargarDesdeRepos(silencioso = false) {
    const { fuentes, errores } = M.analizarRepositorios($('#repos').value);
    estado.problemas = errores.map((e) => ({ origen: e.texto, motivo: e.motivo }));
    if (!fuentes.length) {
      estado.equipos = [];
      estado.origen = null;
      estado.pedidos = 0;
      if (!errores.length) estado.problemas.push({ origen: 'repositorios', motivo: 'Escribe al menos un repositorio, como usuario/hackaton-equipo-1.' });
      dibujar();
      return;
    }
    estado.cargando = true;
    $('#cargar').disabled = true;
    if (!silencioso) $('#estado').replaceChildren(el('p', { class: 'cargando' }, `Leyendo ${fuentes.length} ${fuentes.length === 1 ? 'repositorio' : 'repositorios'}…`));
    const resultados = await Promise.all(
      fuentes.map(async (fuente) => {
        const r = await leerJSON(M.urlDeProgreso(fuente));
        if (r.http) return { fuente, problema: motivoHttp(r.http, fuente.rama) };
        if (r.error) return { fuente, problema: r.error };
        const malos = M.validarProgreso(r.datos);
        return malos.length ? { fuente, problema: malos[0] } : { fuente, progreso: r.datos };
      }),
    );
    const equipos = [];
    for (const r of resultados) {
      if (r.problema) estado.problemas.push({ origen: r.fuente.repo, motivo: r.problema });
      else equipos.push(M.construirEquipo({ fuente: { etiqueta: r.fuente.repo, clave: r.fuente.clave }, progreso: r.progreso }));
    }
    estado.equipos = M.desambiguar(equipos);
    estado.origen = 'repos';
    estado.pedidos = fuentes.length;
    estado.leidos = equipos.length;
    estado.cargando = false;
    estado.ultimaCarga = Date.now();
    $('#cargar').disabled = false;
    escribirHash(fuentes);
    dibujar();
  }

  async function cargarDesdeArchivos(lista) {
    const equipos = [];
    const problemas = [];
    for (const archivo of lista) {
      if (archivo.size > 300000) {
        problemas.push({ origen: archivo.name, motivo: 'El archivo es demasiado grande para ser un progreso.json.' });
        continue;
      }
      try {
        const progreso = JSON.parse(await archivo.text());
        const malos = M.validarProgreso(progreso);
        if (malos.length) problemas.push({ origen: archivo.name, motivo: malos[0] });
        else equipos.push(M.construirEquipo({ fuente: { etiqueta: archivo.name, clave: `archivo:${archivo.name.toLowerCase()}` }, progreso }));
      } catch {
        problemas.push({ origen: archivo.name, motivo: 'No es un JSON válido.' });
      }
    }
    estado.problemas = problemas;
    estado.equipos = M.desambiguar(equipos);
    estado.origen = 'archivos';
    estado.pedidos = 0;
    estado.ultimaCarga = Date.now();
    dibujar();
  }

  function cargarEjemplo() {
    estado.problemas = [];
    estado.equipos = M.desambiguar(M.datosDeEjemplo().map((d) => M.construirEquipo({ fuente: { etiqueta: d.etiqueta, clave: d.etiqueta }, progreso: d.progreso })));
    estado.origen = 'ejemplo';
    estado.pedidos = 0;
    estado.ultimaCarga = Date.now();
    dibujar();
  }

  // ------------------------------------------------------------------ enlace y actualización automática
  function escribirHash(fuentes) {
    const valor = fuentes.map((f) => (f.rama === 'HEAD' ? f.repo : `${f.repo}@${f.rama}`)).join(',');
    try {
      history.replaceState(null, '', `${location.pathname}${location.search}#r=${encodeURIComponent(valor).replace(/%2C/g, ',').replace(/%2F/g, '/').replace(/%40/g, '@')}`);
    } catch {
      /* algunos entornos no permiten cambiar la dirección */
    }
  }
  function leerHash() {
    const m = /(?:^#|&)r=([^&]*)/.exec(location.hash);
    if (!m) return '';
    try {
      return decodeURIComponent(m[1]).split(',').join('\n');
    } catch {
      return '';
    }
  }
  async function copiarEnlace() {
    const { fuentes } = M.analizarRepositorios($('#repos').value);
    if (fuentes.length) escribirHash(fuentes);
    const aviso = $('#aviso-copiado');
    try {
      await navigator.clipboard.writeText(location.href);
      aviso.textContent = 'Enlace copiado.';
    } catch {
      aviso.textContent = 'Copia la dirección del navegador.';
    }
    setTimeout(() => (aviso.textContent = ''), 3500);
  }

  function programarActualizacion() {
    clearInterval(estado.temporizador);
    if ($('#auto').checked) {
      estado.temporizador = setInterval(() => {
        if (estado.origen === 'repos' && !estado.cargando) cargarDesdeRepos(true);
      }, 30000);
    }
  }

  // ------------------------------------------------------------------ arranque
  $('#cargar').addEventListener('click', () => cargarDesdeRepos());
  $('#ejemplo').addEventListener('click', cargarEjemplo);
  $('#copiar').addEventListener('click', copiarEnlace);
  $('#auto').addEventListener('change', programarActualizacion);
  $('#archivos').addEventListener('change', (evento) => {
    if (evento.target.files.length) cargarDesdeArchivos([...evento.target.files]);
    evento.target.value = '';
  });
  programarActualizacion();
  const guardado = leerHash();
  if (guardado) {
    $('#repos').value = guardado;
    cargarDesdeRepos();
  } else {
    dibujar();
  }
})();
