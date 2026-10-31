// ETAPA 1 · Casos de uso (15 puntos). Se prueban con un repositorio FALSO: sin HTTP, sin archivos, sin nada de afuera.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, especificadores, importar, lanzaDominio, nuevoInforme } from './ayudas.mjs';

/** Un repositorio de 10 líneas que cumple el puerto y anota quién lo llamó. Sus ids empiezan en 100 a propósito. */
class RepositorioFalso {
  constructor() {
    this.datos = [];
    this.llamadas = [];
    this.siguiente = 100;
  }
  listar() {
    this.llamadas.push('listar');
    return this.datos.map((e) => ({ ...e }));
  }
  obtener(id) {
    this.llamadas.push('obtener');
    const e = this.datos.find((x) => x.id === id);
    return e && { ...e };
  }
  guardar(evaluacion) {
    this.llamadas.push('guardar');
    if (evaluacion.id === undefined || evaluacion.id === null) {
      const nueva = { ...evaluacion, id: this.siguiente++ };
      this.datos.push(nueva);
      return { ...nueva };
    }
    const i = this.datos.findIndex((x) => x.id === evaluacion.id);
    if (i === -1) this.datos.push({ ...evaluacion });
    else this.datos[i] = { ...evaluacion };
    return { ...evaluacion };
  }
  eliminar(id) {
    this.llamadas.push('eliminar');
    const antes = this.datos.length;
    this.datos = this.datos.filter((x) => x.id !== id);
    return this.datos.length < antes;
  }
}

export const etapa = {
  numero: 1,
  titulo: 'Casos de uso',
  puntos: 15,
  async comprobar() {
    const informe = nuevoInforme();
    const { crearCasosDeUso } = await importar('src/aplicacion/casos-de-uso.js');
    const { ErrorDeDominio } = await importar('src/dominio/evaluacion.js');
    const armar = () => {
      const repositorio = new RepositorioFalso();
      return { repositorio, casos: crearCasosDeUso({ repositorio }) };
    };

    await informe.probar('crear guarda por el puerto y devuelve la evaluación con el id que le dio el repositorio', () => {
      const { repositorio, casos } = armar();
      const creada = casos.crear({ nombre: 'Parcial 1', peso: 30 });
      assert.equal(creada.id, 100, 'el id lo asigna el repositorio (aquí: 100), no el caso de uso');
      assert.equal(creada.nombre, 'Parcial 1');
      assert.equal(creada.nota, null);
      assert.ok(repositorio.llamadas.includes('guardar'), 'crear debe llamar a repositorio.guardar');
    });

    await informe.probar('crear aplica las reglas del dominio (peso 0 → PESO_INVALIDO) y no guarda nada', () => {
      const { repositorio, casos } = armar();
      lanzaDominio(() => casos.crear({ nombre: 'X', peso: 0 }), ErrorDeDominio, 'PESO_INVALIDO');
      assert.ok(!repositorio.llamadas.includes('guardar'), 'si el dominio rechaza, no se guarda');
    });

    await informe.probar('crear tiene en cuenta lo que ya existe: nombre repetido y tope de 100 en los pesos', () => {
      const { casos } = armar();
      casos.crear({ nombre: 'Parcial 1', peso: 60 });
      lanzaDominio(() => casos.crear({ nombre: 'parcial 1', peso: 10 }), ErrorDeDominio, 'NOMBRE_REPETIDO');
      lanzaDominio(() => casos.crear({ nombre: 'Taller', peso: 50 }), ErrorDeDominio, 'PESO_EXCEDIDO');
    });

    await informe.probar('listar devuelve lo que hay en el repositorio', () => {
      const { casos } = armar();
      assert.deepEqual(casos.listar(), []);
      casos.crear({ nombre: 'A', peso: 10 });
      casos.crear({ nombre: 'B', peso: 20 });
      assert.deepEqual(casos.listar().map((e) => e.nombre), ['A', 'B']);
    });

    await informe.probar('ver devuelve la evaluación, o lanza NO_EXISTE', () => {
      const { casos } = armar();
      const { id } = casos.crear({ nombre: 'A', peso: 10 });
      assert.equal(casos.ver(id).nombre, 'A');
      lanzaDominio(() => casos.ver(999), ErrorDeDominio, 'NO_EXISTE');
    });

    await informe.probar('calificar guarda la nota; el dominio rechaza una nota inválida; si no existe, NO_EXISTE', () => {
      const { repositorio, casos } = armar();
      const { id } = casos.crear({ nombre: 'A', peso: 10 });
      const calificada = casos.calificar(id, 4.5);
      assert.equal(calificada.nota, 4.5);
      assert.equal(casos.ver(id).nota, 4.5, 'la nota debe quedar guardada en el repositorio');
      const antes = repositorio.llamadas.filter((l) => l === 'guardar').length;
      lanzaDominio(() => casos.calificar(id, 7), ErrorDeDominio, 'NOTA_INVALIDA');
      assert.equal(repositorio.llamadas.filter((l) => l === 'guardar').length, antes, 'una nota inválida no se guarda');
      lanzaDominio(() => casos.calificar(999, 3), ErrorDeDominio, 'NO_EXISTE');
    });

    await informe.probar('eliminar borra por el puerto, y lanza NO_EXISTE si no estaba', () => {
      const { casos } = armar();
      const { id } = casos.crear({ nombre: 'A', peso: 10 });
      casos.eliminar(id);
      assert.deepEqual(casos.listar(), []);
      lanzaDominio(() => casos.eliminar(id), ErrorDeDominio, 'NO_EXISTE');
    });

    await informe.probar('resumen usa el dominio con todas las evaluaciones', () => {
      const { casos } = armar();
      const a = casos.crear({ nombre: 'A', peso: 40 });
      casos.crear({ nombre: 'B', peso: 60 });
      casos.calificar(a.id, 4);
      assert.deepEqual(casos.resumen(), { acumulado: 1.6, pesoCalificado: 40, pesoTotal: 100, cantidad: 2 });
    });

    await informe.probar('este archivo no importa nada de afuera: solo el dominio', () => {
      const texto = readFileSync(join(RAIZ, 'src/aplicacion/casos-de-uso.js'), 'utf8');
      const malos = especificadores(texto).filter((e) => !e.startsWith('../dominio/'));
      assert.deepEqual(malos, [], `casos-de-uso.js solo puede importar del dominio y importa: ${malos.join(', ')}`);
    });

    return informe.resultados;
  },
};
