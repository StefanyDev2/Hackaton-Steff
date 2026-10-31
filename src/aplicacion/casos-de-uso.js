/**
 * CASOS DE USO · lo que el negocio ofrece                                  (ETAPA 1 · 15 puntos · tu trabajo)
 *
 * Un caso de uso ORQUESTA: le pide datos al puerto de salida (el repositorio), le pide al dominio que decida y
 * guarda el resultado. No sabe si el repositorio es memoria, un archivo o una base de datos, ni si quien lo llama
 * es una API HTTP, una línea de comandos o una prueba.
 *
 * Recibes el repositorio YA CONSTRUIDO (se lo pasa quien compone la aplicación): { repositorio }.
 * Sus cuatro métodos están en puerto-repositorio.js. Las reglas del negocio están en ../dominio/evaluacion.js:
 * ÚSALAS; si te descubres escribiendo `if (peso > 100)` aquí, detente.
 *
 * Reglas de esta etapa (la prueba las comprueba con un repositorio falso):
 *   · hablas con el repositorio solo por sus cuatro métodos;
 *   · cuando algo no existe, lanzas new ErrorDeDominio(CODIGOS.NO_EXISTE, '…');
 *   · este archivo no importa nada de afuera: solo el dominio.
 *
 * Comprueba con:   npm run verificar -- 1
 */
import { CODIGOS, ErrorDeDominio } from '../dominio/evaluacion.js';
import * as Evaluacion from '../dominio/evaluacion.js';

export function crearCasosDeUso({ repositorio }) {
  return {
    /** Todas las evaluaciones. */
    listar() {
      // TODO etapa 1
      throw new Error('TODO etapa 1: listar');
    },

    /** Una evaluación por id. Si no existe: ErrorDeDominio con CODIGOS.NO_EXISTE. */
    ver(id) {
      // TODO etapa 1
      throw new Error('TODO etapa 1: ver');
    },

    /** Crea una evaluación: el dominio valida con las que ya existen (Evaluacion.crear) y el repositorio la guarda. Devuelve la guardada. */
    crear(datos) {
      // TODO etapa 1
      throw new Error('TODO etapa 1: crear');
    },

    /** Le pone nota a una evaluación: busca (NO_EXISTE si falta), el dominio califica (Evaluacion.calificar) y el repositorio guarda. */
    calificar(id, nota) {
      // TODO etapa 1
      throw new Error('TODO etapa 1: calificar');
    },

    /** Elimina una evaluación. Si no existe: NO_EXISTE. */
    eliminar(id) {
      // TODO etapa 1
      throw new Error('TODO etapa 1: eliminar');
    },

    /** El resumen del semestre: lo calcula el dominio (Evaluacion.resumen) con todas las evaluaciones. */
    resumen() {
      // TODO etapa 1
      throw new Error('TODO etapa 1: resumen');
    },
  };
}
