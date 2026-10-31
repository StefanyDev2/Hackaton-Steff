// ETAPA 0 · Contenedor listo (10 puntos). Docker o Podman instalado, corriendo, y capaz de ejecutar un contenedor.
import assert from 'node:assert/strict';
import { nuevoInforme } from './ayudas.mjs';
import { detectarMotores, ejecutar } from './contenedores.mjs';

export const etapa = {
  numero: 0,
  titulo: 'Contenedor listo',
  puntos: 10,
  async comprobar() {
    const informe = nuevoInforme();
    const motores = await detectarMotores();
    const listo = motores.find((m) => m.listo);

    await informe.probar('hay un motor de contenedores instalado y corriendo (Docker o Podman)', () => {
      if (!listo) throw new Error(motores.map((m) => `${m.nombre}: ${m.motivo}`).join('  ·  '));
    });

    if (listo) {
      await informe.probar(`${listo.nombre} ejecuta un contenedor (hello-world)`, async () => {
        const r = await ejecutar(listo.nombre, ['run', '--rm', 'docker.io/library/hello-world'], { timeout: 180_000 });
        assert.ok(r.codigo === 0 && /Hello from Docker!/.test(r.salida), `no se pudo ejecutar hello-world${r.expiro ? ' (tardó más de 3 minutos: ¿hay internet?)' : ''}: ${r.salida.split('\n').slice(-2).join(' | ')}`);
      });
    }
    const evidencia = motores.filter((m) => m.listo).map((m) => `${m.nombre} ${m.version}`).join(' + ') || 'sin motor';
    return { resultados: informe.resultados, evidencia };
  },
};
