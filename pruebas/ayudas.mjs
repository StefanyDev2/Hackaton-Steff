// Ayudas compartidas por las pruebas de las etapas (puedes leerlas; no hace falta tocarlas).
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Importa un módulo de tu proyecto por su ruta relativa a la raíz: importar('src/aplicacion/casos-de-uso.js'). */
export const importar = (rutaRelativa) => import(pathToFileURL(join(RAIZ, rutaRelativa)).href);

const resumirError = (error) => String(error?.message ?? error).split('\n').slice(0, 3).join(' ').slice(0, 240);

/** Un informe: cada `probar` anota si la comprobación pasó (y, si no, por qué). */
export function nuevoInforme() {
  const resultados = [];
  return {
    resultados,
    async probar(nombre, fn) {
      try {
        await fn();
        resultados.push({ nombre, ok: true });
      } catch (error) {
        resultados.push({ nombre, ok: false, mensaje: resumirError(error) });
      }
    },
  };
}

/** Quita comentarios para que un `import` escrito en un comentario no cuente. */
export const sinComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

/** Los módulos que importa un archivo: import … from 'x', import 'x', import('x') y require('x'). */
export function especificadores(texto) {
  const limpio = sinComentarios(texto);
  const encontrados = [];
  const patron = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of limpio.matchAll(patron)) encontrados.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  return encontrados;
}

/** Lanza si `fn` no lanza un ErrorDeDominio con ese código. */
export function lanzaDominio(fn, ErrorDeDominio, codigo) {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw new Error(`debía lanzar un ErrorDeDominio ${codigo}, pero lanzó: ${error?.message ?? error}`);
    if (error.codigo !== codigo) throw new Error(`debía lanzar el código ${codigo}, pero lanzó ${error.codigo}`);
    return;
  }
  throw new Error(`debía lanzar un ErrorDeDominio ${codigo}, pero no lanzó nada`);
}
