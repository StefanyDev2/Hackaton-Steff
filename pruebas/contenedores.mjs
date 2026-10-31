// Ayudas para las etapas de contenedores: funcionan con Docker y con Podman (los comandos son los mismos).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { join } from 'node:path';
import { RAIZ } from './ayudas.mjs';

const MOTORES = ['docker', 'podman'];
const sufijo = Date.now().toString(36);
let contador = 0;

/** Ejecuta un comando SIN shell y devuelve { codigo, salida, noExiste, expiro }. */
export function ejecutar(comando, args, { timeout = 60_000, cwd } = {}) {
  return new Promise((resolver) => {
    let salida = '';
    let expiro = false;
    const hijo = spawn(comando, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const reloj = setTimeout(() => {
      expiro = true;
      hijo.kill('SIGKILL');
    }, timeout);
    hijo.stdout.on('data', (d) => (salida += d));
    hijo.stderr.on('data', (d) => (salida += d));
    hijo.on('error', (error) => {
      clearTimeout(reloj);
      resolver({ codigo: null, salida: String(error.message), noExiste: error.code === 'ENOENT', expiro });
    });
    hijo.on('close', (codigo) => {
      clearTimeout(reloj);
      resolver({ codigo, salida: salida.trim(), noExiste: false, expiro });
    });
  });
}

const ultimasLineas = (texto, n = 4) => texto.split('\n').filter(Boolean).slice(-n).join(' | ');
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Los motores que hay en esta máquina: { nombre, instalado, listo, version, motivo }. CONTENEDOR=docker|podman limita la búsqueda. */
export async function detectarMotores() {
  const pedido = process.env.CONTENEDOR?.toLowerCase();
  const nombres = MOTORES.includes(pedido) ? [pedido] : MOTORES;
  const motores = [];
  for (const nombre of nombres) {
    const v = await ejecutar(nombre, ['--version'], { timeout: 15_000 });
    if (v.noExiste || v.codigo !== 0) {
      motores.push({ nombre, instalado: false, listo: false, version: '', motivo: `${nombre} no está instalado` });
      continue;
    }
    const info = await ejecutar(nombre, ['info'], { timeout: 45_000 });
    const version = (/(\d+\.\d+(?:\.\d+)?)/.exec(v.salida) ?? [])[1] ?? '';
    const motivo =
      nombre === 'docker'
        ? 'Docker está instalado pero no responde: ábrelo (Docker Desktop, o el servicio de Docker, o Colima) y espera a que arranque'
        : 'Podman está instalado pero no responde: en macOS y Windows hace falta `podman machine init` y `podman machine start`';
    motores.push({ nombre, instalado: true, listo: info.codigo === 0, version, motivo: info.codigo === 0 ? '' : motivo });
  }
  return motores;
}

export const archivoDeImagen = () => ['Containerfile', 'Dockerfile'].find((f) => existsSync(join(RAIZ, f)));

export function puertoLibre() {
  return new Promise((resolver, rechazar) => {
    const servidor = net.createServer();
    servidor.on('error', rechazar);
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      servidor.close(() => resolver(port));
    });
  });
}

// Todo lo que se crea se anota para borrarlo al terminar (y se borra aunque algo falle).
const creado = { contenedores: [], imagenes: [], volumenes: [] };
const imagenes = new Map(); // motor → { etiqueta, id }

/** Construye la imagen del proyecto (una sola vez por motor y por ejecución). */
export async function construirImagen(motor) {
  if (imagenes.has(motor)) return imagenes.get(motor);
  const archivo = archivoDeImagen();
  if (!archivo) throw new Error('no encuentro un Dockerfile ni un Containerfile en la raíz del proyecto');
  const etiqueta = `hexlab-verificar:${motor}-${sufijo}`;
  const r = await ejecutar(motor, ['build', '-t', etiqueta, '-f', archivo, '.'], { cwd: RAIZ, timeout: 300_000 });
  creado.imagenes.push({ motor, nombre: etiqueta });
  if (r.codigo !== 0) throw new Error(`${motor} build falló${r.expiro ? ' (tardó más de 5 minutos)' : ''}: ${ultimasLineas(r.salida)}`);
  const id = (await ejecutar(motor, ['image', 'inspect', '--format', '{{.Id}}', etiqueta])).salida;
  const imagen = { etiqueta, id, archivo };
  imagenes.set(motor, imagen);
  return imagen;
}

/** Arranca un contenedor de la imagen, publica su puerto 3000 en uno libre y espera a que /salud responda. */
export async function iniciarContenedor(motor, etiqueta, { entorno = {}, volumen } = {}) {
  const puerto = await puertoLibre();
  const nombre = `hexlab-verificar-${sufijo}-${contador++}`;
  const args = ['run', '-d', '--name', nombre, '-p', `127.0.0.1:${puerto}:3000`, '-e', 'PORT=3000'];
  for (const [clave, valor] of Object.entries(entorno)) args.push('-e', `${clave}=${valor}`);
  if (volumen) {
    creado.volumenes.push({ motor, nombre: volumen });
    args.push('-v', `${volumen}:/datos`);
  }
  args.push(etiqueta);
  const r = await ejecutar(motor, args, { timeout: 90_000 });
  creado.contenedores.push({ motor, nombre });
  if (r.codigo !== 0) throw new Error(`${motor} run falló: ${ultimasLineas(r.salida)}`);

  const base = `http://127.0.0.1:${puerto}`;
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(`${base}/salud`, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok) return { base, nombre };
    } catch {
      /* todavía no responde */
    }
    const estado = await ejecutar(motor, ['inspect', '--format', '{{.State.Running}}', nombre]);
    if (estado.salida === 'false') {
      const registro = await ejecutar(motor, ['logs', '--tail', '6', nombre]);
      throw new Error(`el contenedor se detuvo al arrancar. Últimas líneas del registro: ${ultimasLineas(registro.salida, 5)}`);
    }
    await esperar(500);
  }
  throw new Error('el contenedor no respondió en /salud en 30 s: ¿escucha en 0.0.0.0 y en el puerto 3000 (variable PORT)?');
}

export async function detener(motor, nombre) {
  await ejecutar(motor, ['rm', '-f', nombre], { timeout: 60_000 });
}

/** Crea y lee a través de la API de un contenedor ya arrancado. */
export async function crearYListar(base, nombre = 'Taller') {
  const crear = await fetch(`${base}/evaluaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, peso: 20 }) });
  if (crear.status !== 201) throw new Error(`POST /evaluaciones respondió ${crear.status}, se esperaba 201`);
  const lista = await (await fetch(`${base}/evaluaciones`)).json();
  if (!Array.isArray(lista) || !lista.some((e) => e.nombre === nombre)) throw new Error('GET /evaluaciones no devolvió lo que se creó');
  return lista;
}

export async function listar(base) {
  const respuesta = await fetch(`${base}/evaluaciones`);
  if (respuesta.status !== 200) throw new Error(`GET /evaluaciones respondió ${respuesta.status}`);
  return respuesta.json();
}

/** Borra contenedores, imágenes y volúmenes que creó esta ejecución (y solo esos). */
export async function limpiarTodo() {
  for (const { motor, nombre } of creado.contenedores) await ejecutar(motor, ['rm', '-f', nombre], { timeout: 60_000 });
  for (const { motor, nombre } of creado.imagenes) await ejecutar(motor, ['rmi', '-f', nombre], { timeout: 60_000 });
  for (const { motor, nombre } of creado.volumenes) await ejecutar(motor, ['volume', 'rm', '-f', nombre], { timeout: 60_000 });
  creado.contenedores.length = creado.imagenes.length = creado.volumenes.length = 0;
  imagenes.clear();
}

export const nombreDeVolumen = () => `hexlab-datos-${sufijo}-${contador++}`;
