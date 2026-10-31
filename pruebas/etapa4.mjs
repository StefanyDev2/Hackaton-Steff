// ETAPA 4 · Composición y regla de dependencias (15 puntos).
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { RAIZ, especificadores, importar, nuevoInforme } from './ayudas.mjs';

function archivosDe(carpeta) {
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivosDe(ruta) : /\.(m?js)$/.test(nombre) ? [ruta] : [];
  });
}

export const etapa = {
  numero: 4,
  titulo: 'Composición y regla de dependencias',
  puntos: 15,
  async comprobar() {
    const informe = nuevoInforme();
    const { componer } = await importar('src/configuracion.mjs');
    const carpeta = mkdtempSync(join(tmpdir(), 'hex-etapa4-'));
    const abrir = async (servidor) => {
      await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
      return `http://127.0.0.1:${servidor.address().port}`;
    };
    const cerrar = (servidor) => new Promise((resolver) => servidor.close(resolver));
    const crearTaller = (base) =>
      fetch(`${base}/evaluaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Taller', peso: 20 }) });

    try {
      await informe.probar('por defecto usa el almacén en memoria y el puerto 3000', () => {
        const { almacen, puerto } = componer({});
        assert.equal(almacen, 'memoria');
        assert.equal(puerto, 3000);
      });

      await informe.probar('PORT cambia el puerto y llega como número', () => {
        assert.equal(componer({ PORT: '4567' }).puerto, 4567);
      });

      await informe.probar('ALMACEN=memoria: la API completa funciona (crear y listar)', async () => {
        const { servidor, almacen } = componer({ ALMACEN: 'memoria' });
        assert.equal(almacen, 'memoria');
        const base = await abrir(servidor);
        try {
          assert.equal((await crearTaller(base)).status, 201);
          const lista = await (await fetch(`${base}/evaluaciones`)).json();
          assert.deepEqual(lista.map((e) => e.nombre), ['Taller']);
        } finally {
          await cerrar(servidor);
        }
      });

      await informe.probar('ALMACEN=archivo: los datos sobreviven a «reiniciar» la aplicación (otra composición, el mismo DATOS)', async () => {
        const entorno = { ALMACEN: 'archivo', DATOS: join(carpeta, 'datos', 'evaluaciones.json') };
        const primera = componer(entorno);
        assert.equal(primera.almacen, 'archivo');
        const base1 = await abrir(primera.servidor);
        try {
          assert.equal((await crearTaller(base1)).status, 201);
        } finally {
          await cerrar(primera.servidor);
        }
        assert.ok(existsSync(entorno.DATOS), 'debe haberse creado el archivo indicado en DATOS');
        const segunda = componer(entorno);
        const base2 = await abrir(segunda.servidor);
        try {
          const lista = await (await fetch(`${base2}/evaluaciones`)).json();
          assert.deepEqual(lista.map((e) => e.nombre), ['Taller'], 'la segunda composición debe ver lo que guardó la primera');
        } finally {
          await cerrar(segunda.servidor);
        }
      });

      await informe.probar('un ALMACEN desconocido es un error claro que menciona ALMACEN', () => {
        assert.throws(() => componer({ ALMACEN: 'nube' }), /ALMACEN/);
      });

      await informe.probar('REGLA DE DEPENDENCIAS: dominio y aplicación no importan nada de afuera', () => {
        const permitidas = [join(RAIZ, 'src', 'dominio'), join(RAIZ, 'src', 'aplicacion')];
        const dentro = (ruta) => permitidas.some((p) => ruta === p || ruta.startsWith(p + sep));
        const malas = [];
        for (const archivo of permitidas.flatMap(archivosDe)) {
          for (const especificador of especificadores(readFileSync(archivo, 'utf8'))) {
            const relativo = especificador.startsWith('./') || especificador.startsWith('../');
            if (!relativo || !dentro(resolve(dirname(archivo), especificador))) malas.push(`${relative(RAIZ, archivo)} importa «${especificador}»`);
          }
        }
        assert.deepEqual(malas, [], `el centro no puede importar de afuera (módulos de Node, adaptadores, configuración):\n  ${malas.join('\n  ')}`);
      });
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
    return informe.resultados;
  },
};
