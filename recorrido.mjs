#!/usr/bin/env node
// Recorrido de una petición: muestra, capa por capa, cómo viaja una petición por TU hexágono.
//
//   node recorrido.mjs        (necesita tus etapas 1, 2 y 3; la del archivo, para el final)
//
// No da puntos ni toca el marcador: sirve para VER lo que construiste.
// Arma tu API a mano (con tus casos de uso y tus repositorios), manda unas peticiones de verdad
// y anota quién llamó a quién. Después repite todo con el otro almacén y compara.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ErrorDeDominio } from './src/dominio/evaluacion.js';
import { METODOS_DEL_PUERTO } from './src/aplicacion/puerto-repositorio.js';

const conColor = process.stdout.isTTY && !process.env.NO_COLOR;
const pintar = (codigo, texto) => (conColor ? `\x1b[${codigo}m${texto}\x1b[0m` : texto);
const sinColor = (texto) => texto.replace(/\x1b\[[\d;]*m/g, '');
// Los mismos colores de la presentación: dominio azul, puertos verde, adaptadores naranja.
const capa = (nombre, codigo) => ({ nombre, pintar: (t = nombre) => pintar(codigo, t) });
const HTTP = capa('HTTP', '33');
const CASO = capa('caso de uso', '36');
const PUERTO = capa('puerto', '32');
const DOMINIO = capa('DOMINIO', '34;1');
const adaptador = (nombre) => pintar('33', `«${nombre}»`);
const tenue = (t) => pintar('2', t);
const negrita = (t) => pintar('1', t);

const corto = (valor, max) => {
  const texto = valor === undefined ? '' : JSON.stringify(valor);
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
};
const argumentos = (args) => args.map((a) => corto(a, 40)).join(', ');
const resultado = (valor) => (Array.isArray(valor) ? `${valor.length} evaluaci${valor.length === 1 ? 'ón' : 'ones'}` : corto(valor, 44) || 'nada');
const faltaEtapa = (error) => Number(/TODO etapa (\d)/.exec(String(error?.message))?.[1]) || null;

class RecorridoDetenido extends Error {}

/** Mensaje claro cuando todavía falta una etapa. */
function salirFaltaEtapa(etapa) {
  const nombres = { 1: 'los casos de uso', 2: 'los repositorios', 3: 'la API HTTP' };
  console.log(`\nTodavía no se puede recorrer: falta la etapa ${etapa} (${nombres[etapa] ?? 'una de las primeras'}).`);
  console.log('Termina las etapas 1, 2 y 3 (compruébalas con  npm run verificar -- 1 2 3 ) y vuelve a correr este archivo.\n');
  process.exit(0);
}

/** Importa tu código y comprueba que estén las tres primeras etapas. */
async function cargar() {
  const { crearCasosDeUso } = await import('./src/aplicacion/casos-de-uso.js');
  const { crearRepositorioMemoria } = await import('./src/adaptadores/salida/repositorio-memoria.js');
  const { crearRepositorioArchivo } = await import('./src/adaptadores/salida/repositorio-archivo.js');
  const { crearApi, crearRutas } = await import('./src/adaptadores/entrada/http.js');
  try {
    crearCasosDeUso({ repositorio: crearRepositorioMemoria() }).listar();
  } catch (error) {
    const etapa = faltaEtapa(error);
    if (etapa) salirFaltaEtapa(etapa);
    throw error;
  }
  if (crearRutas({}).length === 0) salirFaltaEtapa(3);
  return { crearCasosDeUso, crearRepositorioMemoria, crearRepositorioArchivo, crearApi };
}

const VEREDICTO_DEL_DOMINIO = { crear: 'aceptó la evaluación nueva', calificar: 'aceptó la nota', resumen: 'calculó el resumen' };
const ESCRIBE = ['guardar', 'eliminar'];

const PETICIONES = [
  {
    titulo: 'Una petición válida',
    metodo: 'POST', ruta: '/evaluaciones', cuerpo: { nombre: 'Parcial 1', peso: 30 },
    fijate: () => 'El dominio solo DECIDE: no guarda nada ni sabe que existe un almacén. Guardar lo hizo el adaptador, que además le puso el id.',
  },
  {
    titulo: 'Una petición que rompe una regla del negocio',
    metodo: 'POST', ruta: '/evaluaciones', cuerpo: { nombre: 'Taller', peso: 0 },
    fijate: (t) =>
      t.guardo
        ? '⚠ Se llamó a guardar aunque el dominio rechazó. Revisa tu caso de uso: ¿guarda antes de validar?'
        : 'guardar NUNCA se llamó: el dominio frenó la operación antes de tocar el almacén. La ruta no validó nada, solo tradujo el código del dominio a un estado HTTP.',
  },
  {
    titulo: 'Una regla que necesita saber qué hay guardado',
    metodo: 'POST', ruta: '/evaluaciones', cuerpo: { nombre: 'Parcial 1', peso: 20 },
    fijate: () => 'Para saber si el nombre ya existía, el caso de uso leyó la lista por el puerto y se la dio al dominio. El dominio decide; no consulta nada por su cuenta.',
  },
  {
    titulo: 'Calificar: buscar, decidir, guardar',
    metodo: 'PATCH', ruta: '/evaluaciones/1', cuerpo: { nota: 4.5 },
    fijate: () => 'El caso de uso busca (obtener), el dominio califica (devuelve una copia) y el puerto guarda. Cada capa hizo una sola cosa.',
  },
  {
    titulo: 'Un cálculo del negocio',
    metodo: 'GET', ruta: '/resumen',
    fijate: () => 'El resumen lo calcula el dominio. El caso de uso solo le dio los datos; la ruta solo los entregó.',
  },
];

/** Un recorrido completo con un almacén. `mostrar` imprime en vivo; siempre devuelve las líneas (en texto plano). */
async function recorrer({ crearCasosDeUso, crearApi }, repositorioReal, nombreAdaptador, { mostrar }) {
  repositorioReal.listar(); // si todavía falta la etapa 2, falla aquí con un mensaje claro
  const lineas = [];
  const emitir = (quien, flecha, destino, detalle = '', nota = '') => {
    const cabeza = `${quien.pintar(quien.nombre.padEnd(11))} ${flecha} ${destino ? destino.pintar(destino.nombre.padEnd(11)) : ' '.repeat(11)} ${detalle}`;
    const completa = nota ? `${cabeza}  ${nota}` : cabeza;
    lineas.push(sinColor(completa).replaceAll(`«${nombreAdaptador}»`, '«almacén»'));
    if (!mostrar) return;
    if (sinColor(completa).length <= 112) console.log(`   ${completa}`);
    else console.log(`   ${cabeza}\n   ${' '.repeat(27)}${nota}`);
  };

  let veredicto = null; // lo que el dominio decide en el caso de uso en curso, hasta que se anota
  const anotarVeredicto = () => {
    if (!veredicto) return;
    emitir(DOMINIO, '✓ ', null, veredicto);
    veredicto = null;
  };

  // El PUERTO, vigilado: cada llamada del caso de uso al repositorio queda anotada.
  const repositorio = new Proxy(repositorioReal, {
    get(objetivo, nombre) {
      const original = objetivo[nombre];
      if (!METODOS_DEL_PUERTO.includes(nombre)) return original;
      return (...args) => {
        if (ESCRIBE.includes(nombre)) anotarVeredicto(); // si va a escribir, el dominio ya dio el visto bueno
        const llamada = `${nombre}(${argumentos(args)})`;
        try {
          const devuelto = original.apply(objetivo, args);
          emitir(CASO, '─▶', PUERTO, llamada, `⇒ ${adaptador(nombreAdaptador)}: ${resultado(devuelto)}`);
          return devuelto;
        } catch (error) {
          emitir(CASO, '─▶', PUERTO, llamada, `⇒ ${adaptador(nombreAdaptador)} lanzó ${error.codigo ?? error.name}`);
          throw error;
        }
      };
    },
  });

  // El CASO DE USO, vigilado: se anota cuando la ruta lo llama y qué devuelve (o qué error sube).
  let error = null;
  const casos = new Proxy(crearCasosDeUso({ repositorio }), {
    get(objetivo, nombre) {
      const original = objetivo[nombre];
      if (typeof original !== 'function') return original;
      return (...args) => {
        emitir(HTTP, '─▶', CASO, `${nombre}(${argumentos(args)})`);
        veredicto = VEREDICTO_DEL_DOMINIO[nombre] ?? null;
        try {
          const devuelto = original.apply(objetivo, args);
          anotarVeredicto();
          emitir(CASO, '◀─', HTTP, `devuelve ${corto(devuelto, 60)}`);
          return devuelto;
        } catch (e) {
          error = e;
          if (e instanceof ErrorDeDominio) {
            veredicto = null;
            emitir(DOMINIO, '✗ ', null, `rechazó: ${e.codigo} — «${e.message}»`);
            emitir(CASO, '◀─', HTTP, 'el error sube tal cual, sin tocarlo');
          } else {
            emitir(CASO, '◀─', HTTP, `lanzó un error que no es del dominio: ${e.message}`);
          }
          throw e;
        }
      };
    },
  });

  const servidor = crearApi(casos);
  await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    let n = 0;
    for (const peticion of PETICIONES) {
      n += 1;
      if (mostrar) {
        console.log(`\n${negrita(`${n}. ${peticion.titulo}`)}`);
        console.log(`   ${negrita('▶')} ${peticion.metodo} ${peticion.ruta}${peticion.cuerpo ? `  ${corto(peticion.cuerpo, 70)}` : ''}`);
      }
      lineas.push(`${peticion.metodo} ${peticion.ruta} ${corto(peticion.cuerpo, 70)}`);
      error = null;
      veredicto = null;
      const antes = lineas.length;
      const respuesta = await fetch(base + peticion.ruta, {
        method: peticion.metodo,
        headers: { 'content-type': 'application/json' },
        body: peticion.cuerpo ? JSON.stringify(peticion.cuerpo) : undefined,
      });
      const texto = await respuesta.text();
      if (error instanceof ErrorDeDominio) {
        emitir(HTTP, '◀─', null, `traduce ${error.codigo} → ${respuesta.status} y responde`, tenue('(la ruta no decide nada: solo traduce)'));
      } else {
        emitir(HTTP, '◀─', null, `responde ${respuesta.status}`);
      }
      if (mostrar) console.log(`   ${tenue(`→ ${peticion.fijate({ guardo: lineas.slice(antes).some((l) => l.includes('guardar(')) })}`)}`);
      if (n === 1 && respuesta.status !== 201) {
        throw new RecorridoDetenido(`la primera petición (una evaluación válida) debía dar 201 y dio ${respuesta.status}${texto ? ` («${texto.slice(0, 120)}»)` : ''}`);
      }
    }
  } finally {
    servidor.close();
  }
  return lineas;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
console.log(`\n${negrita('Recorrido de una petición por tu hexágono')}`);
console.log(
  `${tenue('Cada línea dice quién llamó a quién. Colores: ')}${HTTP.pintar('adaptador de entrada')}${tenue(' · ')}${CASO.pintar('caso de uso')}${tenue(' · ')}` +
    `${PUERTO.pintar('puerto')}${tenue(' · ')}${adaptador('adaptador de salida')}${tenue(' · ')}${DOMINIO.pintar('dominio')}`,
);

const piezas = await cargar();
let enMemoria;
try {
  enMemoria = await recorrer(piezas, piezas.crearRepositorioMemoria(), 'memoria', { mostrar: true });
} catch (error) {
  if (!(error instanceof RecorridoDetenido)) throw error;
  console.log(`\n${error.message}.\nRevisa las etapas 1 y 3 con  npm run verificar -- 1 3  y vuelve a correr este archivo.\n`);
  process.exit(0);
}

console.log(`\n${negrita('¿Y si cambiamos de almacén?')}`);
const carpeta = mkdtempSync(join(tmpdir(), 'recorrido-'));
try {
  let enArchivo;
  try {
    enArchivo = await recorrer(piezas, piezas.crearRepositorioArchivo(join(carpeta, 'evaluaciones.json')), 'archivo', { mostrar: false });
  } catch (error) {
    if (faltaEtapa(error)) console.log('   Todavía no tienes el adaptador de archivo (etapa 2). Cuando lo termines, vuelve a correr esto y comparamos los dos.');
    else if (error instanceof RecorridoDetenido) console.log(`   Con el adaptador de archivo, ${error.message}.\n   Revisa la etapa 2 con  npm run verificar -- 2 .`);
    else console.log(`   Con el adaptador de archivo hubo un error: ${error.message}\n   Revisa la etapa 2 con  npm run verificar -- 2 .`);
  }
  if (enArchivo) {
    const peticiones = enMemoria.filter((l) => /^(GET|POST|PATCH|DELETE) /.test(l)).length;
    const diferencia = enMemoria.findIndex((linea, i) => linea !== enArchivo[i]);
    if (diferencia === -1 && enMemoria.length === enArchivo.length) {
      console.log(`   Repetimos las mismas ${peticiones} peticiones, ahora con el adaptador ${adaptador('archivo')} (en una carpeta temporal).`);
      console.log(`   ${pintar('32', '✓')} Mismas llamadas, mismas respuestas. Cambió UNA sola cosa: el adaptador.`);
      console.log('     El dominio, los casos de uso y la API ni se enteraron: eso es lo que compra el puerto.');
    } else {
      const i = diferencia === -1 ? Math.min(enMemoria.length, enArchivo.length) : diferencia;
      console.log(`   ${pintar('31', '✗')} Los dos almacenes no se comportaron igual (deberían ser intercambiables). Primera diferencia:`);
      console.log(`     memoria: ${enMemoria[i] ?? '(termina antes)'}\n     archivo: ${enArchivo[i] ?? '(termina antes)'}`);
      console.log('     Las pruebas de contrato (npm run verificar -- 2) dicen qué debe cumplir cualquier adaptador.');
    }
  }
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}

console.log(`\n${negrita('Para pensar (y para contárselo a tu equipo)')}`);
console.log('  1. En la petición 2, ¿quién decidió que el peso 0 no vale: la ruta, el caso de uso o el dominio? ¿Quién lo convirtió en 422?');
console.log('  2. Si mañana el almacén fuera una base de datos, ¿qué archivos tocarías? ¿Cuáles NO?');
console.log('  3. ¿Qué pasaría si src/dominio/evaluacion.js importara «node:fs»? ¿Qué etapa lo detectaría?');
console.log('  4. El caso de uso llamó al almacén, pero en su código no importa ningún adaptador. ¿Cómo le llegó el repositorio? (Pista: etapa 4)\n');
