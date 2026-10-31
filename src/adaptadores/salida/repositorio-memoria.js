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
  let evaluaciones = [];

  return {
    listar() {
      return evaluaciones.map((e) => ({ ...e }));
    },
    obtener(id) {
      const evaluacion = evaluaciones.find((e) => e.id === id);
      return evaluacion && { ...evaluacion };
    },
    guardar(evaluacion) {
      const mayorId = Math.max(0, ...evaluaciones.map((e) => e.id));
      const guardada = { ...evaluacion, id: evaluacion.id ?? mayorId + 1 };
      const posicion = evaluaciones.findIndex((e) => e.id === guardada.id);
      if (posicion === -1) evaluaciones.push(guardada);
      else evaluaciones[posicion] = guardada;
      return { ...guardada };
    },
    eliminar(id) {
      const antes = evaluaciones.length;
      evaluaciones = evaluaciones.filter((e) => e.id !== id);
      return evaluaciones.length < antes;
    },
  };
}
