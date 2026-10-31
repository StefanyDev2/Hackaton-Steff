// ETAPA 3 · Adaptador de entrada: la API HTTP (20 puntos). Se prueba con casos de uso FALSOS: el adaptador solo traduce.
import assert from 'node:assert/strict';
import { importar, nuevoInforme } from './ayudas.mjs';

export const etapa = {
  numero: 3,
  titulo: 'Adaptador de entrada: la API HTTP',
  puntos: 20,
  async comprobar() {
    const informe = nuevoInforme();
    const { crearApi } = await importar('src/adaptadores/entrada/http.js');
    const { ErrorDeDominio } = await importar('src/dominio/evaluacion.js');

    const e1 = { id: 1, nombre: 'Parcial 1', peso: 30, nota: null };
    const dom = (codigo) => new ErrorDeDominio(codigo, `falso: ${codigo}`);
    const casos = {
      listar: () => [e1],
      ver: (id) => {
        if (id !== 1) throw dom('NO_EXISTE'); // si llega "1" como texto, esto falla: el adaptador debe convertir a número
        return e1;
      },
      crear: (d) => {
        if (d.nombre === 'invalida') throw dom('NOMBRE_INVALIDO');
        if (d.nombre === 'repetida') throw dom('NOMBRE_REPETIDO');
        if (d.nombre === 'exceso') throw dom('PESO_EXCEDIDO');
        if (d.nombre === 'rompe') throw new Error('secreto interno del servidor');
        return { id: 7, nombre: d.nombre, peso: d.peso, nota: null }; // acepta TODO lo demás: no valida, como un caso de uso falso
      },
      calificar: (id, nota) => {
        if (id !== 1) throw dom('NO_EXISTE');
        if (nota === 7) throw dom('NOTA_INVALIDA');
        return { ...e1, nota };
      },
      eliminar: (id) => {
        if (id !== 1) throw dom('NO_EXISTE');
      },
      resumen: () => ({ acumulado: 1.2, pesoCalificado: 30, pesoTotal: 30, cantidad: 1 }),
    };

    const servidor = crearApi(casos);
    await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
    const base = `http://127.0.0.1:${servidor.address().port}`;
    const pedir = (metodo, ruta, cuerpo) =>
      fetch(`${base}${ruta}`, { method: metodo, headers: cuerpo ? { 'Content-Type': 'application/json' } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });

    try {
      await informe.probar('GET /evaluaciones → 200 con la lista', async () => {
        const r = await pedir('GET', '/evaluaciones');
        assert.equal(r.status, 200);
        assert.deepEqual(await r.json(), [e1]);
      });

      await informe.probar('GET /evaluaciones/1 → 200 (el id llega como número a los casos de uso)', async () => {
        const r = await pedir('GET', '/evaluaciones/1');
        assert.equal(r.status, 200, 'si esperabas 200 y llegó 404, revisa que conviertas el id de texto a número');
        assert.equal((await r.json()).id, 1);
      });

      await informe.probar('GET /evaluaciones/99 → 404 como problema legible (application/problem+json)', async () => {
        const r = await pedir('GET', '/evaluaciones/99');
        assert.equal(r.status, 404);
        assert.match(r.headers.get('content-type') ?? '', /application\/problem\+json/);
      });

      await informe.probar('POST /evaluaciones → 201, la evaluación creada y la cabecera Location', async () => {
        const r = await pedir('POST', '/evaluaciones', { nombre: 'Taller', peso: 20 });
        assert.equal(r.status, 201);
        assert.equal(r.headers.get('location'), '/evaluaciones/7');
        assert.equal((await r.json()).id, 7);
      });

      await informe.probar('un valor inválido (NOMBRE_INVALIDO) → 422', async () => {
        assert.equal((await pedir('POST', '/evaluaciones', { nombre: 'invalida', peso: 10 })).status, 422);
      });

      await informe.probar('un choque con el estado actual (NOMBRE_REPETIDO, PESO_EXCEDIDO) → 409', async () => {
        assert.equal((await pedir('POST', '/evaluaciones', { nombre: 'repetida', peso: 10 })).status, 409);
        assert.equal((await pedir('POST', '/evaluaciones', { nombre: 'exceso', peso: 10 })).status, 409);
      });

      await informe.probar('las rutas traducen, no deciden: no validan el peso por su cuenta (el dominio es quien decide)', async () => {
        const r = await pedir('POST', '/evaluaciones', { nombre: 'sin-validar', peso: 0 });
        assert.equal(r.status, 201, 'este caso de uso falso acepta peso 0; si tu ruta responde otra cosa, estás validando en la ruta');
      });

      await informe.probar('PATCH /evaluaciones/1 con { nota } → 200; nota inválida → 422; no existe → 404', async () => {
        const ok = await pedir('PATCH', '/evaluaciones/1', { nota: 4.5 });
        assert.equal(ok.status, 200);
        assert.equal((await ok.json()).nota, 4.5);
        assert.equal((await pedir('PATCH', '/evaluaciones/1', { nota: 7 })).status, 422);
        assert.equal((await pedir('PATCH', '/evaluaciones/99', { nota: 3 })).status, 404);
      });

      await informe.probar('DELETE /evaluaciones/1 → 204 sin cuerpo; no existe → 404', async () => {
        const r = await pedir('DELETE', '/evaluaciones/1');
        assert.equal(r.status, 204);
        assert.equal(await r.text(), '');
        assert.equal((await pedir('DELETE', '/evaluaciones/99')).status, 404);
      });

      await informe.probar('GET /resumen → 200 con el resumen', async () => {
        const r = await pedir('GET', '/resumen');
        assert.equal(r.status, 200);
        assert.equal((await r.json()).acumulado, 1.2);
      });

      await informe.probar('un error inesperado → 500 sin filtrar detalles internos', async () => {
        const r = await pedir('POST', '/evaluaciones', { nombre: 'rompe', peso: 10 });
        assert.equal(r.status, 500);
        assert.ok(!(await r.text()).includes('secreto interno'), 'el mensaje interno no debe salir al cliente');
      });

      await informe.probar('un método que la ruta no admite → 405', async () => {
        assert.equal((await pedir('PUT', '/evaluaciones/1', { nombre: 'x', peso: 1 })).status, 405);
      });
    } finally {
      await new Promise((resolver) => servidor.close(resolver));
    }
    return informe.resultados;
  },
};
