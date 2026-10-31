// EXTRA · Dos motores (+10): la MISMA imagen se construye y corre con Docker Y con Podman.
import { nuevoInforme } from './ayudas.mjs';
import { detectarMotores } from './contenedores.mjs';
import { comprobarImagen } from './etapa5.mjs';

export const etapa = {
  numero: 7,
  titulo: 'Extra: el mismo resultado con los dos motores',
  puntos: 10,
  extra: true,
  async comprobar() {
    const informe = nuevoInforme();
    const listos = (await detectarMotores()).filter((m) => m.listo);
    await informe.probar('hay DOS motores corriendo (Docker y Podman)', () => {
      if (listos.length < 2) throw new Error(`solo responde ${listos.map((m) => m.nombre).join(', ') || 'ninguno'}: instala y arranca el otro (Podman en macOS y Windows necesita su máquina virtual)`);
    });
    if (listos.length >= 2) {
      for (const motor of listos) await comprobarImagen(informe, motor);
    }
    return { resultados: informe.resultados, evidencia: listos.map((m) => `${m.nombre} ${m.version}`).join(' + ') || 'sin motores' };
  },
};
