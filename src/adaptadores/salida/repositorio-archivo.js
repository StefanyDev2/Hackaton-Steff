/**
 * ADAPTADOR DE SALIDA · repositorio en un archivo JSON                     (ETAPA 2 · tu trabajo)
 *
 * Cumple EL MISMO puerto que el de memoria, pero guarda las evaluaciones en un archivo: un arreglo JSON.
 * Así los datos sobreviven a un reinicio del servidor (y, en la Etapa 6, a un contenedor nuevo).
 *
 *   crearRepositorioArchivo('/ruta/evaluaciones.json')
 *
 * Detalles que las pruebas comprueban:
 *   · si el archivo todavía no existe, `listar()` devuelve [] (no es un error);
 *   · al guardar por primera vez se crea el archivo… y también su carpeta, si hace falta (mira mkdirSync con { recursive: true });
 *   · otra instancia apuntando al mismo archivo ve lo que guardó la primera;
 *   · las mismas reglas del contrato que el de memoria (ids, copias, orden).
 *
 * Usa node:fs en su versión síncrona (readFileSync, writeFileSync, existsSync, mkdirSync) y node:path.
 *
 * Comprueba con:   npm run verificar -- 2
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function crearRepositorioArchivo(ruta) {
  // TODO etapa 2: leer() y escribir(lista) sobre `ruta`, y los cuatro métodos del puerto apoyados en ellos.
  return {
    listar() {
      throw new Error('TODO etapa 2: listar');
    },
    obtener(id) {
      throw new Error('TODO etapa 2: obtener');
    },
    guardar(evaluacion) {
      throw new Error('TODO etapa 2: guardar');
    },
    eliminar(id) {
      throw new Error('TODO etapa 2: eliminar');
    },
  };
}
