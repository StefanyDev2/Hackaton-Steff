// EXTRA · Datos que sobreviven (+10): el adaptador de archivo guarda en un volumen y un contenedor NUEVO ve los datos.
import assert from 'node:assert/strict';
import { nuevoInforme } from './ayudas.mjs';
import { construirImagen, crearYListar, detectarMotores, detener, iniciarContenedor, listar, nombreDeVolumen } from './contenedores.mjs';

export const etapa = {
  numero: 6,
  titulo: 'Extra: datos que sobreviven en un volumen',
  puntos: 10,
  extra: true,
  async comprobar() {
    const informe = nuevoInforme();
    const motor = (await detectarMotores()).find((m) => m.listo);
    if (!motor) {
      await informe.probar('hay un motor de contenedores corriendo', () => {
        throw new Error('ninguno responde: repite la Etapa 0');
      });
      return { resultados: informe.resultados, evidencia: 'sin motor' };
    }

    const volumen = nombreDeVolumen();
    const entorno = { ALMACEN: 'archivo', DATOS: '/datos/evaluaciones.json' };
    let imagen;
    await informe.probar(`${motor.nombre}: la imagen se construye`, async () => {
      imagen = await construirImagen(motor.nombre);
    });
    if (!imagen) return { resultados: informe.resultados, evidencia: motor.nombre };

    let primero;
    await informe.probar(`${motor.nombre}: con ALMACEN=archivo y un volumen en /datos, el primer contenedor guarda una evaluación`, async () => {
      primero = await iniciarContenedor(motor.nombre, imagen.etiqueta, { entorno, volumen });
      await crearYListar(primero.base, 'Sobrevive');
    });
    if (primero) await detener(motor.nombre, primero.nombre);

    await informe.probar(`${motor.nombre}: un contenedor NUEVO con el mismo volumen ve la evaluación`, async () => {
      assert.ok(primero, 'primero debe funcionar el contenedor anterior');
      const segundo = await iniciarContenedor(motor.nombre, imagen.etiqueta, { entorno, volumen });
      try {
        const lista = await listar(segundo.base);
        assert.ok(lista.some((e) => e.nombre === 'Sobrevive'), 'el contenedor nuevo no vio los datos: ¿el volumen está en /datos y DATOS apunta ahí? (con USER node, la carpeta debe ser suya)');
      } finally {
        await detener(motor.nombre, segundo.nombre);
      }
    });
    return { resultados: informe.resultados, evidencia: `${motor.nombre} ${motor.version}; volumen` };
  },
};
