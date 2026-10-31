/**
 * PUERTO DE SALIDA · RepositorioEvaluaciones                          (ya escrito: es el acuerdo que cumplen tus adaptadores)
 *
 * Un puerto es un acuerdo entre el negocio y «lo de afuera»: aquí, lo que el negocio necesita para guardar y recuperar
 * evaluaciones, dicho en SU idioma y sin mencionar archivos ni bases de datos. Los casos de uso (Etapa 1) lo USAN;
 * los adaptadores de salida (Etapa 2) lo CUMPLEN.
 *
 *   listar()              → Evaluacion[]          todas, en el orden en que se guardaron
 *   obtener(id)           → Evaluacion | undefined
 *   guardar(evaluacion)   → Evaluacion            sin `id`: le asigna uno nuevo (el mayor id que exista + 1; el primero es 1)
 *                                                 con `id`: reemplaza la evaluación que tenga ese id
 *   eliminar(id)          → boolean               true si existía, false si no
 *
 * Reglas del acuerdo (las pruebas de contrato de la Etapa 2 las comprueban en TODOS los adaptadores):
 *   · los métodos son SÍNCRONOS (así el ejercicio no se llena de async);
 *   · lo que devuelven son COPIAS: si alguien modifica el objeto que recibió, el repositorio no cambia;
 *   · un repositorio nuevo empieza vacío (o con lo que ya hubiera guardado en su archivo).
 */

export const METODOS_DEL_PUERTO = Object.freeze(['listar', 'obtener', 'guardar', 'eliminar']);

/** Lanza un error claro si `repositorio` no cumple el puerto. Úsalo donde recibas un repositorio de afuera. */
export function exigirPuerto(repositorio) {
  const faltan = METODOS_DEL_PUERTO.filter((m) => typeof repositorio?.[m] !== 'function');
  if (faltan.length) throw new Error(`El repositorio no cumple el puerto: faltan ${faltan.join(', ')}.`);
  return repositorio;
}
