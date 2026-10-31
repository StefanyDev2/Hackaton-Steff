/**
 * DOMINIO · las reglas de «Notas del semestre»                       (ya escrito: léelo, pero no lo cambies)
 *
 * Este archivo es el CENTRO del hexágono. Sabe qué es una evaluación y qué reglas cumple, y nada más:
 *   · no sabe qué es HTTP, ni un archivo, ni una base de datos;
 *   · no importa NADA (mira: no hay ni un `import` aquí arriba). Esa es la regla de oro de la Etapa 4.
 *
 * Una evaluación es { id, nombre, peso, nota }:
 *   nombre  texto de 1 a 40 caracteres, único (sin distinguir mayúsculas)
 *   peso    entero de 1 a 100; los pesos de todas las evaluaciones suman 100 como máximo
 *   nota    null (sin calificar) o un número de 0 a 5
 *   id      lo asigna el repositorio al guardar (el dominio no inventa identificadores)
 *
 * Cuando una regla no se cumple, estas funciones LANZAN un ErrorDeDominio con un `codigo`. Quién traduce ese
 * código a «404», «409» o «422» no es asunto del dominio: es del adaptador HTTP (Etapa 3).
 */

export const CODIGOS = Object.freeze({
  NOMBRE_INVALIDO: 'NOMBRE_INVALIDO',
  PESO_INVALIDO: 'PESO_INVALIDO',
  PESO_EXCEDIDO: 'PESO_EXCEDIDO',
  NOMBRE_REPETIDO: 'NOMBRE_REPETIDO',
  NOTA_INVALIDA: 'NOTA_INVALIDA',
  NO_EXISTE: 'NO_EXISTE',
});

export class ErrorDeDominio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorDeDominio';
    this.codigo = codigo;
  }
}

const esNota = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 5;

/**
 * Crea una evaluación nueva (SIN id) o lanza un ErrorDeDominio.
 * `existentes` son las evaluaciones que ya hay: hacen falta para comprobar el nombre repetido y el tope de pesos.
 */
export function crear({ nombre, peso, nota } = {}, existentes = []) {
  if (typeof nombre !== 'string' || nombre.trim() === '' || nombre.trim().length > 40) {
    throw new ErrorDeDominio(CODIGOS.NOMBRE_INVALIDO, 'El nombre es obligatorio y tiene hasta 40 caracteres.');
  }
  if (!Number.isInteger(peso) || peso < 1 || peso > 100) {
    throw new ErrorDeDominio(CODIGOS.PESO_INVALIDO, 'El peso es un entero entre 1 y 100.');
  }
  if (nota !== undefined && nota !== null && !esNota(nota)) {
    throw new ErrorDeDominio(CODIGOS.NOTA_INVALIDA, 'La nota va de 0 a 5.');
  }
  const limpio = nombre.trim();
  if (existentes.some((e) => e.nombre.toLowerCase() === limpio.toLowerCase())) {
    throw new ErrorDeDominio(CODIGOS.NOMBRE_REPETIDO, `Ya existe una evaluación llamada «${limpio}».`);
  }
  const usado = existentes.reduce((suma, e) => suma + e.peso, 0);
  if (usado + peso > 100) {
    throw new ErrorDeDominio(CODIGOS.PESO_EXCEDIDO, `Los pesos sumarían ${usado + peso}: el máximo es 100.`);
  }
  return { nombre: limpio, peso, nota: nota ?? null };
}

/** Devuelve una copia de la evaluación con su nota, o lanza un ErrorDeDominio si la nota no es válida. */
export function calificar(evaluacion, nota) {
  if (!esNota(nota)) throw new ErrorDeDominio(CODIGOS.NOTA_INVALIDA, 'La nota va de 0 a 5.');
  return { ...evaluacion, nota };
}

/** El resumen del semestre: acumulado (suma de peso/100 × nota), peso ya calificado, peso total y cantidad. */
export function resumen(evaluaciones) {
  const calificadas = evaluaciones.filter((e) => e.nota !== null && e.nota !== undefined);
  const acumulado = calificadas.reduce((suma, e) => suma + (e.peso / 100) * e.nota, 0);
  return {
    acumulado: Math.round(acumulado * 100) / 100,
    pesoCalificado: calificadas.reduce((suma, e) => suma + e.peso, 0),
    pesoTotal: evaluaciones.reduce((suma, e) => suma + e.peso, 0),
    cantidad: evaluaciones.length,
  };
}
