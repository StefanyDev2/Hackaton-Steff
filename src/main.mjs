/**
 * ARRANQUE                                                          (ya escrito)
 *
 *   npm start                                   memoria, en el puerto 3000
 *   ALMACEN=archivo npm start                   guarda en datos/evaluaciones.json
 *   ALMACEN=archivo DATOS=/datos/e.json PORT=4000 npm start
 *
 * Escucha en 0.0.0.0 (todas las interfaces) y no solo en localhost: dentro de un contenedor, si el servidor escucha
 * únicamente en 127.0.0.1, nadie de afuera puede llegar a él aunque publiques el puerto.
 */
import { componer } from './configuracion.mjs';

const { servidor, puerto, almacen } = componer(process.env);
servidor.listen(puerto, '0.0.0.0', () => {
  console.log(`API de notas escuchando en el puerto ${puerto} (almacén: ${almacen})`);
});

// Un contenedor se detiene con SIGTERM: ciérralo con elegancia en vez de esperar a que lo maten.
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => servidor.close(() => process.exit(0)));
}
