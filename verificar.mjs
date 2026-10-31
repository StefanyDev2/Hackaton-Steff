#!/usr/bin/env node
/**
 * EL VERIFICADOR DEL HACKATÓN
 *
 *   npm run verificar                 las etapas 0 a 5
 *   npm run verificar -- 1 2          solo las etapas 1 y 2 (más rápido mientras trabajas)
 *   npm run verificar -- extras       los dos extras (6: volumen · 7: dos motores)
 *   npm run verificar -- todo         todo
 *
 * Cada etapa que pasa queda anotada en progreso.json, con la hora de la PRIMERA vez que pasó. Sube ese archivo
 * (git add progreso.json && git commit && git push) y el marcador de la clase lo lee de tu repositorio.
 * El docente puede repetir este mismo verificador en tu repositorio: un resultado que no se reproduce no cuenta.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { limpiarTodo } from './pruebas/contenedores.mjs';
import { RAIZ } from './pruebas/ayudas.mjs';

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const pintar = (codigo, texto) => (color ? `\x1b[${codigo}m${texto}\x1b[0m` : texto);
const verde = (t) => pintar('32', t);
const rojo = (t) => pintar('31', t);
const gris = (t) => pintar('90', t);
const negrita = (t) => pintar('1', t);

const BASE = [0, 1, 2, 3, 4, 5];
const EXTRAS = [6, 7];
const argumentos = process.argv.slice(2).map((a) => a.toLowerCase());
let numeros = BASE;
if (argumentos.includes('todo')) numeros = [...BASE, ...EXTRAS];
else if (argumentos.includes('extras')) numeros = EXTRAS;
else if (argumentos.length) numeros = argumentos.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 7);
if (!numeros.length) {
  console.error('Uso: npm run verificar [-- 1 2 3 | extras | todo]');
  process.exit(2);
}

const leerJSON = (ruta, porDefecto) => {
  try {
    return existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : porDefecto;
  } catch {
    return porDefecto;
  }
};
const equipo = leerJSON(join(RAIZ, 'equipo.json'), {});
const previo = leerJSON(join(RAIZ, 'progreso.json'), { etapas: {} });
const progreso = {
  esquema: 1,
  equipo: equipo.equipo ?? '',
  integrantes: equipo.integrantes ?? [],
  actualizado: new Date().toISOString(),
  entorno: { node: process.version, sistema: `${os.platform()} ${os.arch()}` },
  etapas: previo.etapas ?? {},
};

if (!progreso.equipo) console.log(rojo('Falta el nombre del equipo en equipo.json: el marcador no sabrá quiénes son.\n'));
console.log(negrita(`Equipo: ${progreso.equipo || '(sin nombre)'}`) + gris(`  ·  Node ${process.version}\n`));

try {
  for (const numero of numeros) {
    const { etapa } = await import(`./pruebas/etapa${numero}.mjs`);
    process.stdout.write(negrita(`ETAPA ${numero} · ${etapa.titulo}`) + gris(`  (${etapa.puntos} puntos${etapa.extra ? ', extra' : ''})\n`));
    let salida;
    try {
      salida = await etapa.comprobar();
    } catch (error) {
      // lo más común: el archivo del estudiante tiene un error de sintaxis o no exporta lo que se espera
      salida = { resultados: [{ nombre: 'se puede cargar y ejecutar el código de la etapa', ok: false, mensaje: String(error.message).split('\n')[0] }], evidencia: '' };
    }
    const resultados = Array.isArray(salida) ? salida : salida.resultados;
    const evidencia = Array.isArray(salida) ? '' : (salida.evidencia ?? '');
    for (const r of resultados) {
      console.log(`  ${r.ok ? verde('✓') : rojo('✗')} ${r.nombre}`);
      if (!r.ok) console.log(gris(`      ${r.mensaje}`));
    }
    const pasan = resultados.filter((r) => r.ok).length;
    const ok = resultados.length > 0 && pasan === resultados.length;
    console.log(ok ? verde(`  → ETAPA ${numero}: ¡completa! +${etapa.puntos} puntos\n`) : rojo(`  → ETAPA ${numero}: ${pasan} de ${resultados.length} comprobaciones\n`));

    const ahora = new Date().toISOString();
    const antes = progreso.etapas[numero] ?? {};
    progreso.etapas[numero] = {
      titulo: etapa.titulo,
      puntos: etapa.puntos,
      extra: Boolean(etapa.extra),
      ok,
      primeraVez: ok ? (antes.primeraVez ?? ahora) : (antes.primeraVez ?? null),
      ultima: ahora,
      comprobaciones: `${pasan}/${resultados.length}`,
      evidencia,
    };
  }
} finally {
  await limpiarTodo();
}

const total = Object.values(progreso.etapas).filter((e) => e.ok).reduce((s, e) => s + e.puntos, 0);
writeFileSync(join(RAIZ, 'progreso.json'), JSON.stringify(progreso, null, 2) + '\n');
console.log(negrita(`Llevas ${total} puntos`) + gris(' (el marcador de la clase suma, además, 3, 2 o 1 por llegar primero, segundo o tercero a cada etapa)'));
console.log(gris('Guardado en progreso.json. Para que cuente:  git add progreso.json && git commit -m "Etapa lista" && git push'));
process.exit(0);
