// ETAPA 5 · Imagen: tu API en un contenedor (25 puntos). Se construye la imagen, se arranca y se llama a la API.
import { nuevoInforme } from './ayudas.mjs';
import { archivoDeImagen, construirImagen, crearYListar, detectarMotores, detener, iniciarContenedor } from './contenedores.mjs';

/** Las tres comprobaciones de la imagen con UN motor. Las usa también la etapa 7 (dos motores). */
export async function comprobarImagen(informe, motor) {
  let imagen;
  await informe.probar(`${motor.nombre}: la imagen se construye`, async () => {
    imagen = await construirImagen(motor.nombre);
  });
  if (!imagen) return null;

  let contenedor;
  await informe.probar(`${motor.nombre}: el contenedor arranca y responde en /salud`, async () => {
    contenedor = await iniciarContenedor(motor.nombre, imagen.etiqueta, { entorno: { ALMACEN: 'memoria' } });
  });
  if (!contenedor) return imagen;

  await informe.probar(`${motor.nombre}: la API funciona dentro del contenedor (crear y listar)`, async () => {
    await crearYListar(contenedor.base);
  });
  await detener(motor.nombre, contenedor.nombre);
  return imagen;
}

export const etapa = {
  numero: 5,
  titulo: 'Imagen: la API en un contenedor',
  puntos: 25,
  async comprobar() {
    const informe = nuevoInforme();
    await informe.probar('hay un Dockerfile o un Containerfile en la raíz del proyecto', () => {
      if (!archivoDeImagen()) throw new Error('crea un archivo llamado Dockerfile (o Containerfile) en la raíz: ver la guía, Etapa 5');
    });
    const motor = (await detectarMotores()).find((m) => m.listo);
    if (!motor) {
      await informe.probar('hay un motor de contenedores corriendo', () => {
        throw new Error('ninguno responde: repite la Etapa 0');
      });
      return { resultados: informe.resultados, evidencia: 'sin motor' };
    }
    const imagen = await comprobarImagen(informe, motor);
    return { resultados: informe.resultados, evidencia: `${motor.nombre} ${motor.version}${imagen ? `; imagen ${imagen.id.slice(0, 19)}` : ''}` };
  },
};
