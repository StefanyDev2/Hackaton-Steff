/* Marcador de la clase · núcleo (sin DOM).
 * Lee el progreso.json de cada equipo y calcula los puntos: los de cada etapa más 3, 2 o 1 por llegar primero, segundo o tercero.
 * Los datos vienen de repositorios ajenos: se validan, se recortan y los puntos de cada etapa se toman de AQUÍ, no del archivo. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.MarcadorNucleo = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Las etapas del hackatón. Los puntos canónicos son estos (un progreso.json adulterado no los cambia). */
  const ETAPAS = [
    { n: 0, corto: '0', titulo: 'Contenedor listo', puntos: 10, extra: false },
    { n: 1, corto: '1', titulo: 'Casos de uso', puntos: 15, extra: false },
    { n: 2, corto: '2', titulo: 'Adaptadores de salida', puntos: 15, extra: false },
    { n: 3, corto: '3', titulo: 'La API HTTP', puntos: 20, extra: false },
    { n: 4, corto: '4', titulo: 'Composición', puntos: 15, extra: false },
    { n: 5, corto: '5', titulo: 'Imagen', puntos: 25, extra: false },
    { n: 6, corto: 'E6', titulo: 'Extra: volumen', puntos: 10, extra: true },
    { n: 7, corto: 'E7', titulo: 'Extra: dos motores', puntos: 10, extra: true },
  ];
  const BONIFICACION = [3, 2, 1];
  const MAXIMO_BASE = ETAPAS.filter((e) => !e.extra).reduce((s, e) => s + e.puntos, 0);

  // ------------------------------------------------------------------ fuentes: repositorios de GitHub
  const RE_USUARIO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
  const RE_REPO = /^[A-Za-z0-9._-]{1,100}$/;
  const RE_RAMA = /^[A-Za-z0-9._/-]{1,100}$/;

  function analizarToken(token) {
    const t = token.trim();
    let usuario;
    let repo;
    let rama = null;
    const url = t.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/tree\/([^\s#?]+?))?\/?(?:[#?].*)?$/i);
    if (url) {
      [, usuario, repo, rama] = url;
    } else {
      const corto = t.match(/^([^/\s@]+)\/([^/\s@]+?)(?:\.git)?(?:@(\S+))?$/);
      if (!corto) return { error: 'No parece «usuario/repositorio».' };
      [, usuario, repo, rama] = corto;
    }
    rama = rama || 'HEAD';
    if (!RE_USUARIO.test(usuario)) return { error: `«${usuario}» no es un usuario de GitHub válido.` };
    if (!RE_REPO.test(repo) || repo === '.' || repo === '..') return { error: `«${repo}» no es un nombre de repositorio válido.` };
    if (!RE_RAMA.test(rama) || rama.includes('..')) return { error: `«${rama}» no es una rama válida.` };
    return { repo: `${usuario}/${repo}`, rama, clave: `${usuario}/${repo}@${rama}`.toLowerCase() };
  }

  /** Texto libre (un repositorio por línea, o separados por comas) → { fuentes, errores }. */
  function analizarRepositorios(texto) {
    const fuentes = [];
    const errores = [];
    const vistas = new Set();
    for (const linea of String(texto ?? '').split(/\r?\n/)) {
      const sinComentario = linea.replace(/(^|\s)#.*$/, '');
      for (const token of sinComentario.split(/[\s,;]+/).filter(Boolean)) {
        const r = analizarToken(token);
        if (r.error) errores.push({ texto: token.slice(0, 80), motivo: r.error });
        else if (!vistas.has(r.clave)) {
          vistas.add(r.clave);
          fuentes.push(r);
        }
      }
    }
    return { fuentes, errores };
  }

  function urlDeProgreso(fuente) {
    const rama = fuente.rama.split('/').map(encodeURIComponent).join('/');
    return `https://raw.githubusercontent.com/${fuente.repo}/${rama}/progreso.json`;
  }

  // ------------------------------------------------------------------ validación
  const esObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const texto = (x, max = 50) =>
    typeof x === 'string'
      ? // eslint-disable-next-line no-control-regex
        x.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
      : '';
  const fechaValida = (x) => typeof x === 'string' && !Number.isNaN(Date.parse(x));

  /** ¿Es un progreso.json usable? Devuelve la lista de problemas (vacía si está bien). */
  function validarProgreso(obj) {
    if (!esObjeto(obj)) return ['El archivo no contiene un objeto JSON.'];
    if (obj.esquema !== 1) return [typeof obj.esquema === 'number' && obj.esquema > 1 ? 'Lo escribió una versión más nueva del verificador: actualiza el marcador.' : 'No parece un progreso.json del verificador (falta «esquema»: 1).'];
    const problemas = [];
    if (!esObjeto(obj.etapas)) problemas.push('Falta «etapas».');
    else {
      for (const [clave, e] of Object.entries(obj.etapas)) {
        if (!/^[0-7]$/.test(clave)) problemas.push(`Etapa desconocida: «${texto(clave, 10)}».`);
        else if (!esObjeto(e) || typeof e.ok !== 'boolean') problemas.push(`La etapa ${clave} no tiene «ok» verdadero o falso.`);
        else if (e.ok && !fechaValida(e.primeraVez)) problemas.push(`La etapa ${clave} está completa pero sin una «primeraVez» válida.`);
      }
    }
    return problemas;
  }

  /** Un equipo normalizado a partir de su progreso.json. */
  function construirEquipo({ fuente, progreso }) {
    const etapas = {};
    for (const e of ETAPAS) {
      const dato = progreso.etapas?.[e.n];
      etapas[e.n] = dato && dato.ok === true && fechaValida(dato.primeraVez) ? { ok: true, primeraVez: dato.primeraVez, evidencia: texto(dato.evidencia, 60) } : { ok: false };
    }
    return {
      clave: fuente.clave,
      nombre: texto(progreso.equipo, 40) || fuente.etiqueta || 'Equipo sin nombre',
      integrantes: Array.isArray(progreso.integrantes) ? progreso.integrantes.map((i) => texto(i, 30)).filter(Boolean).slice(0, 6) : [],
      fuente: fuente.etiqueta,
      actualizado: fechaValida(progreso.actualizado) ? progreso.actualizado : null,
      etapas,
    };
  }

  /** Si dos equipos se llaman igual, añade de dónde salió cada uno. */
  function desambiguar(equipos) {
    const cuenta = new Map();
    for (const e of equipos) cuenta.set(e.nombre.toLowerCase(), (cuenta.get(e.nombre.toLowerCase()) ?? 0) + 1);
    return equipos.map((e) => (cuenta.get(e.nombre.toLowerCase()) > 1 ? { ...e, nombre: `${e.nombre} (${e.fuente})` } : e));
  }

  // ------------------------------------------------------------------ el marcador
  /**
   * Para cada etapa, los equipos que la completaron se ordenan por la hora de la PRIMERA vez; los tres primeros ganan 3, 2 y 1.
   * Total = puntos de las etapas completadas + bonificaciones. Desempate: quien llegó antes a su última etapa.
   */
  function calcularMarcador(equipos) {
    const bonificacion = new Map(); // clave de equipo → { [etapa]: { posicion, puntos } }
    for (const e of equipos) bonificacion.set(e.clave, {});
    for (const etapa of ETAPAS) {
      const llegaron = equipos
        .filter((e) => e.etapas[etapa.n].ok)
        .sort((a, b) => Date.parse(a.etapas[etapa.n].primeraVez) - Date.parse(b.etapas[etapa.n].primeraVez) || a.nombre.localeCompare(b.nombre, 'es'));
      llegaron.forEach((e, i) => {
        bonificacion.get(e.clave)[etapa.n] = { posicion: i + 1, puntos: BONIFICACION[i] ?? 0 };
      });
    }
    const filas = equipos.map((e) => {
      const hechas = ETAPAS.filter((et) => e.etapas[et.n].ok);
      const base = hechas.reduce((s, et) => s + et.puntos, 0);
      const bono = hechas.reduce((s, et) => s + (bonificacion.get(e.clave)[et.n]?.puntos ?? 0), 0);
      const ultima = hechas.length ? Math.max(...hechas.map((et) => Date.parse(e.etapas[et.n].primeraVez))) : null;
      return { equipo: e, base, bono, total: base + bono, completadas: hechas.length, ultima, bonificacion: bonificacion.get(e.clave) };
    });
    filas.sort((a, b) => b.total - a.total || (a.ultima ?? Infinity) - (b.ultima ?? Infinity) || a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'));
    let puesto = 0;
    filas.forEach((f, i) => {
      const anterior = filas[i - 1];
      puesto = anterior && anterior.total === f.total && anterior.ultima === f.ultima ? puesto : i + 1;
      f.puesto = puesto;
    });
    return filas;
  }

  // ------------------------------------------------------------------ formato
  const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—');

  // ------------------------------------------------------------------ datos de ejemplo (para ensayar el marcador)
  const NOMBRES_EJEMPLO = ['Los Hexágonos', 'Puerto Seguro', 'Núcleo Duro', 'Adaptadores S.A.', 'Capa Cero', 'Dependencia Inversa', 'Puertos y Datos', 'Centro de Mando'];
  // minutos desde el inicio en que cada equipo completó cada etapa (null = todavía no)
  const AVANCE_EJEMPLO = [
    [4, 14, 22, 36, 41, 58, null, null],
    [6, 12, 27, 33, 47, 62, 70, null],
    [9, 18, 25, 44, 52, null, null, null],
    [3, 21, 34, 49, null, null, null, null],
    [12, 16, 30, null, null, null, null, null],
    [7, 24, null, null, null, null, null, null],
    [15, 28, 39, 57, null, null, null, null],
    [null, 19, null, null, null, null, null, null],
  ];

  /** Devuelve [{ etiqueta, progreso }] con el mismo formato que leería de los repositorios. `inicio` = ms de la hora de partida. */
  function datosDeEjemplo(inicio = Date.now() - 75 * 60000) {
    return NOMBRES_EJEMPLO.map((nombre, i) => {
      const etapas = {};
      let ultima = inicio;
      ETAPAS.forEach((et, j) => {
        const minutos = AVANCE_EJEMPLO[i][j];
        if (minutos === null) return;
        const cuando = new Date(inicio + minutos * 60000).toISOString();
        ultima = Math.max(ultima, inicio + minutos * 60000);
        etapas[et.n] = { titulo: et.titulo, puntos: et.puntos, extra: et.extra, ok: true, primeraVez: cuando, ultima: cuando, comprobaciones: '1/1', evidencia: 'ejemplo' };
      });
      return { etiqueta: `ejemplo-${i + 1}`, progreso: { esquema: 1, equipo: nombre, integrantes: [], actualizado: new Date(ultima).toISOString(), etapas } };
    });
  }

  return { ETAPAS, BONIFICACION, MAXIMO_BASE, analizarRepositorios, urlDeProgreso, validarProgreso, construirEquipo, desambiguar, calcularMarcador, hora, texto, datosDeEjemplo };
});
