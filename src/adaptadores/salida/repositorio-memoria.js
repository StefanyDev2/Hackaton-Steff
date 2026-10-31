/**
 * ADAPTADOR DE SALIDA · repositorio en memoria                             (ETAPA 2 · tu trabajo)
 *
 * Cumple el puerto de ../../aplicacion/puerto-repositorio.js guardando las evaluaciones en un arreglo.
 * Es el adaptador más simple: sirve para las pruebas y para arrancar sin configurar nada.
 *
 * Lo importante es el CONTRATO (lee el puerto): ids que asigna él mismo (mayor + 1), copias en vez de las referencias
 * originales y los cuatro métodos con el significado exacto. Las pruebas de la Etapa 2 son las MISMAS para el
 * adaptador de archivo: si los dos las pasan, son intercambiables y el resto de la aplicación no se entera.
 *
 * Comprueba con:   npm run verificar -- 2
 */

export function crearRepositorioMemoria() {
  // TODO etapa 2: un arreglo con las evaluaciones, y los cuatro métodos del puerto.
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
