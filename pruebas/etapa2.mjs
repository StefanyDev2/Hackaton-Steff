// ETAPA 2 · Adaptadores de salida (15 puntos). Las MISMAS pruebas de contrato para memoria y para archivo.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importar, nuevoInforme } from './ayudas.mjs';

const ev = (nombre, peso = 10) => ({ nombre, peso, nota: null });

/** El contrato del puerto: lo debe cumplir CUALQUIER adaptador de salida. */
async function contrato(informe, nombre, fabrica) {
  const p = (texto, fn) => informe.probar(`${nombre}: ${texto}`, fn);

  await p('un repositorio nuevo está vacío', () => {
    const repo = fabrica();
    assert.deepEqual(repo.listar(), []);
    assert.equal(repo.obtener(1), undefined);
  });

  await p('guardar sin id asigna 1, 2, 3… y devuelve la evaluación con su id', () => {
    const repo = fabrica();
    assert.deepEqual(repo.guardar(ev('A')), { id: 1, ...ev('A') });
    assert.equal(repo.guardar(ev('B')).id, 2);
    assert.equal(repo.guardar(ev('C')).id, 3);
    assert.deepEqual(repo.listar().map((e) => e.id), [1, 2, 3], 'listar conserva el orden en que se guardó');
  });

  await p('guardar con id reemplaza la evaluación, no la duplica', () => {
    const repo = fabrica();
    const { id } = repo.guardar(ev('A'));
    repo.guardar({ id, nombre: 'A', peso: 10, nota: 4 });
    assert.equal(repo.listar().length, 1);
    assert.equal(repo.obtener(id).nota, 4);
  });

  await p('obtener devuelve la evaluación o undefined', () => {
    const repo = fabrica();
    const { id } = repo.guardar(ev('A'));
    assert.equal(repo.obtener(id).nombre, 'A');
    assert.equal(repo.obtener(99), undefined);
  });

  await p('devuelve COPIAS: modificar lo recibido no cambia el repositorio', () => {
    const repo = fabrica();
    const guardada = repo.guardar(ev('A'));
    guardada.nombre = 'cambiada desde afuera';
    repo.listar()[0].nombre = 'otra vez';
    const leida = repo.obtener(guardada.id);
    leida.peso = 99;
    assert.equal(repo.obtener(guardada.id).nombre, 'A');
    assert.equal(repo.obtener(guardada.id).peso, 10);
  });

  await p('eliminar devuelve true si existía y false si no; el id nuevo es el mayor + 1', () => {
    const repo = fabrica();
    repo.guardar(ev('A'));
    repo.guardar(ev('B'));
    repo.guardar(ev('C'));
    assert.equal(repo.eliminar(2), true);
    assert.equal(repo.eliminar(2), false);
    assert.equal(repo.guardar(ev('D')).id, 4, 'el mayor id que existe es 3, así que el nuevo es 4');
    assert.deepEqual(repo.listar().map((e) => e.id), [1, 3, 4]);
  });
}

export const etapa = {
  numero: 2,
  titulo: 'Adaptadores de salida',
  puntos: 15,
  async comprobar() {
    const informe = nuevoInforme();
    const { crearRepositorioMemoria } = await importar('src/adaptadores/salida/repositorio-memoria.js');
    const { crearRepositorioArchivo } = await importar('src/adaptadores/salida/repositorio-archivo.js');
    const carpeta = mkdtempSync(join(tmpdir(), 'hex-etapa2-'));
    try {
      await contrato(informe, 'memoria', () => crearRepositorioMemoria());
      let n = 0;
      await contrato(informe, 'archivo', () => crearRepositorioArchivo(join(carpeta, `caso-${n++}`, 'datos', 'evaluaciones.json')));

      await informe.probar('archivo: si el archivo no existe, listar() devuelve [] y no falla', () => {
        const ruta = join(carpeta, 'inexistente', 'e.json');
        assert.deepEqual(crearRepositorioArchivo(ruta).listar(), []);
        assert.equal(existsSync(ruta), false, 'listar no debe crear el archivo');
      });

      await informe.probar('archivo: al guardar crea el archivo (y su carpeta) con un arreglo JSON', () => {
        const ruta = join(carpeta, 'nueva', 'carpeta', 'e.json');
        crearRepositorioArchivo(ruta).guardar(ev('A'));
        assert.ok(existsSync(ruta), 'debe existir el archivo');
        const contenido = JSON.parse(readFileSync(ruta, 'utf8'));
        assert.ok(Array.isArray(contenido) && contenido.length === 1, 'el archivo debe ser un arreglo JSON con la evaluación');
      });

      await informe.probar('archivo: otra instancia sobre el mismo archivo ve lo que se guardó (sobrevive a un reinicio)', () => {
        const ruta = join(carpeta, 'persistente', 'e.json');
        crearRepositorioArchivo(ruta).guardar(ev('Parcial'));
        const otra = crearRepositorioArchivo(ruta);
        assert.deepEqual(otra.listar().map((e) => e.nombre), ['Parcial']);
        assert.equal(otra.guardar(ev('Taller')).id, 2);
      });
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
    return informe.resultados;
  },
};
