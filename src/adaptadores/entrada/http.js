/**
 * ADAPTADOR DE ENTRADA · la API HTTP                                       (ETAPA 3 · 20 puntos · tu trabajo)
 *
 * La API es UN adaptador más: traduce el mundo HTTP (método, URL, JSON, estados) al idioma del negocio (los casos
 * de uso) y viceversa. Nada más. En la clase de APIs la regla era «las rutas traducen, no deciden»: aquí es igual.
 * Si te descubres validando un peso o un nombre en una ruta, detente: eso ya lo hace el dominio.
 *
 * Recibes los casos de uso (de la Etapa 1) y devuelves las rutas. La plomería (buscar la ruta, leer el JSON, armar
 * los errores problem+json) ya está en nucleo-http.mjs: léelo, arriba del todo explica qué recibe y qué devuelve un manejador.
 *
 * La API que debes ofrecer (rutas con llaves para los parámetros):
 *
 *   GET    /evaluaciones            200  la lista
 *   GET    /evaluaciones/{id}       200  una evaluación                       · 404 si no existe
 *   POST   /evaluaciones            201  la creada + cabecera Location: /evaluaciones/{id}
 *   PATCH  /evaluaciones/{id}       200  la evaluación calificada; el cuerpo es { "nota": 4.5 }
 *   DELETE /evaluaciones/{id}       204  sin cuerpo
 *   GET    /resumen                 200  el resumen
 *   GET    /salud                   200  { "estado": "ok" }                   (ya está: la usarás con el contenedor)
 *
 * Los errores del dominio traen un `codigo`. Decide qué estado HTTP le corresponde a cada uno:
 *   NO_EXISTE ...................... el recurso no existe
 *   NOMBRE_INVALIDO, PESO_INVALIDO,
 *   NOTA_INVALIDA .................. el CONTENIDO enviado incumple una regla
 *   NOMBRE_REPETIDO, PESO_EXCEDIDO . el contenido choca con el ESTADO actual
 *   (pistas de la clase de APIs: 404, 422 y 409)
 *
 * Ojo: los parámetros de la URL llegan como TEXTO ("3"); los casos de uso esperan el id como NÚMERO.
 *
 * Comprueba con:   npm run verificar -- 3
 */
import { createServer } from 'node:http';
import { CODIGOS, ErrorDeDominio } from '../../dominio/evaluacion.js';
import { ErrorHttp, crearManejador } from './nucleo-http.mjs';

// De código del dominio a estado HTTP.
const ESTADO_POR_CODIGO = {
  // TODO etapa 3: un estado para cada código. Ejemplo de la forma:  [CODIGOS.NO_EXISTE]: ...,
};

/** El núcleo la llama con cada error que no es un ErrorHttp. */
export function traducirError(error) {
  // TODO etapa 3: si NO es un ErrorDeDominio, devuélvelo tal cual (el núcleo lo volverá un 500 sin filtrar detalles).
  //               Si lo es: new ErrorHttp(estado, error.message), con el estado de tu tabla (422 si el código no está).
  return error;
}

/** Las rutas de la API: cada una es { metodo, ruta, manejador }. */
export function crearRutas(casos) {
  return [
    // TODO etapa 3: las seis rutas de la lista de arriba. Un manejador recibe { params, cuerpo, … } y devuelve { status, cuerpo?, cabeceras? }.
  ];
}

/** Arma el servidor HTTP (ya escrito). */
export function crearApi(casos) {
  const rutas = [...crearRutas(casos), { metodo: 'GET', ruta: '/salud', manejador: () => ({ status: 200, cuerpo: { estado: 'ok' } }) }];
  return createServer(crearManejador({ rutas, traducirError }));
}
