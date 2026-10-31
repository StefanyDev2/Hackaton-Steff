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
  const leer = () => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : []);
  const escribir = (evaluaciones) => {
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, JSON.stringify(evaluaciones, null, 2));
  };

  return {
    listar() {
      return leer();
    },
    obtener(id) {
      return leer().find((e) => e.id === id);
    },
    guardar(evaluacion) {
      const evaluaciones = leer();
      const mayorId = Math.max(0, ...evaluaciones.map((e) => e.id));
      const guardada = { ...evaluacion, id: evaluacion.id ?? mayorId + 1 };
      const posicion = evaluaciones.findIndex((e) => e.id === guardada.id);
      if (posicion === -1) evaluaciones.push(guardada);
      else evaluaciones[posicion] = guardada;
      escribir(evaluaciones);
      return guardada;
    },
    eliminar(id) {
      const evaluaciones = leer();
      const restantes = evaluaciones.filter((e) => e.id !== id);
      if (restantes.length === evaluaciones.length) return false;
      escribir(restantes);
      return true;
    },
  };
}
