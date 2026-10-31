/**
 * COMPOSICIÓN · el único lugar que conoce todas las piezas              (ETAPA 4 · 15 puntos · tu trabajo)
 *
 * Aquí se ELIGE y se CONECTA: qué adaptador de salida usar (según una variable de entorno), se le pasa a los casos
 * de uso, y los casos de uso al adaptador HTTP. Todo lo demás del programa ignora qué eligió este archivo, y por eso
 * cambiar de almacén no toca el dominio ni los casos de uso.
 *
 * Variables de entorno (llegan en `entorno`; por defecto, process.env):
 *   ALMACEN   'memoria' (por defecto) o 'archivo'. Cualquier otro valor es un error claro que menciona ALMACEN.
 *   DATOS     ruta del archivo cuando ALMACEN=archivo (por defecto: datos/evaluaciones.json)
 *   PORT      puerto en que escucha la API (por defecto: 3000), como número
 *
 * Devuelve { servidor, puerto, almacen }:  servidor = lo que arma crearApi(casos), almacen = 'memoria' | 'archivo'.
 *
 * Además de que funcione, la Etapa 4 comprueba la REGLA DE DEPENDENCIAS: nada de src/dominio ni de src/aplicacion
 * puede importar módulos de Node (node:fs, node:http…), ni adaptadores, ni esta configuración. Solo importaciones
 * relativas hacia adentro.
 *
 * Comprueba con:   npm run verificar -- 4
 */
import { crearCasosDeUso } from './aplicacion/casos-de-uso.js';
import { crearRepositorioArchivo } from './adaptadores/salida/repositorio-archivo.js';
import { crearRepositorioMemoria } from './adaptadores/salida/repositorio-memoria.js';
import { crearApi } from './adaptadores/entrada/http.js';

function elegirRepositorio(almacen, rutaDatos) {
  if (almacen === 'memoria') return crearRepositorioMemoria();
  if (almacen === 'archivo') return crearRepositorioArchivo(rutaDatos);
  throw new Error(`ALMACEN desconocido: «${almacen}». Usa «memoria» o «archivo».`);
}

export function componer(entorno = process.env) {
  const almacen = entorno.ALMACEN ?? 'memoria';
  const repositorio = elegirRepositorio(almacen, entorno.DATOS ?? 'datos/evaluaciones.json');
  const casos = crearCasosDeUso({ repositorio });

  return { servidor: crearApi(casos), puerto: Number(entorno.PORT ?? 3000), almacen };
}
