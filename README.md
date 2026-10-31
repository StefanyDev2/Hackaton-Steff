# Hackatón hexagonal · Arquitectura de Software

Un hackatón de clase: en equipo y contra el reloj, llevan una API de notas a una **arquitectura hexagonal** (dominio, puertos y
adaptadores) y la empacan en un **contenedor** (Docker o Podman). Cada etapa se verifica sola con `npm run verificar` y un
**marcador en vivo** suma los puntos: los de cada etapa y **3, 2 y 1 más** para quienes la completan primero.

- **Equipos** de 3 (mínimo 2), un repositorio **público** por equipo
- **Qué necesitan:** [Node.js](https://nodejs.org) **22 o superior**, Git, una cuenta de GitHub y **Docker o Podman** (instálenlo ya: la descarga es grande)
- **Sin dependencias:** no hay `npm install`; el proyecto es Node puro

## El caso

**Notas del semestre** (el mismo del ejercicio de APIs): cada estudiante registra sus evaluaciones (nombre, peso y nota) y quiere saber cuánto lleva acumulado. Se pide una API que cuide las reglas: el nombre no se repite, el peso va de 1 a 100 y entre todos no pasan de 100, la nota va de 0 a 5. Hoy la usa una web y guarda en memoria o en un archivo; mañana, una app y una base de datos. **Las reglas no pueden cambiar según quién pregunte ni según dónde se guarde:** de eso trata el hackatón. El detalle está en la [guía](https://hackaton-hexagonal.vercel.app/guia.html#caso).

## Empieza aquí

1. Lee la **guía** (reglas, etapas, pistas, hoja de trucos): https://hackaton-hexagonal.vercel.app/guia.html
2. Crea el repositorio de tu equipo con **Use this template** (botón verde de esta página), **público**, y clónalo.
3. Escribe el nombre de tu equipo en `equipo.json`.
4. Mira el punto de partida y empieza:

```bash
npm run verificar -- 1 2 3 4        # todo falla con «TODO etapa N»: ahí empieza el juego
```

5. Cuando una etapa pase: `git add -A && git commit -m "Etapa 1" && git push`. El **marcador** (https://hackaton-hexagonal.vercel.app/marcador.html) lee el `progreso.json` de tu repositorio.

## Las etapas

| Etapa | Qué hay que lograr | Puntos | Dónde |
|:---:|---|---:|---|
| 0 | **Contenedor listo:** Docker o Podman corre `hello-world` | 10 | tu máquina |
| 1 | **Casos de uso:** las reglas orquestadas, probadas con un repositorio falso | 15 | `src/aplicacion/casos-de-uso.js` |
| 2 | **Adaptadores de salida:** repositorio en memoria y en archivo, el mismo contrato | 15 | `src/adaptadores/salida/` |
| 3 | **Adaptador de entrada:** la API HTTP traduce, no decide | 20 | `src/adaptadores/entrada/http.js` |
| 4 | **Composición:** elegir el almacén con una variable de entorno, y la regla de dependencias | 15 | `src/configuracion.mjs` |
| 5 | **Imagen:** tu API construida y corriendo en un contenedor | 25 | `Dockerfile` o `Containerfile` |
| E6 | *Extra:* datos que sobreviven en un volumen | +10 | `npm run verificar -- 6` |
| E7 | *Extra:* el mismo resultado con Docker **y** con Podman | +10 | `npm run verificar -- 7` |

```bash
npm run verificar                 # las etapas 0 a 5
npm run verificar -- 1 3          # solo las que digas
npm run verificar -- extras       # los extras 6 y 7
npm start                         # la API en http://localhost:3000 (memoria)
node recorrido.mjs                # cómo viaja una petición por tus capas (necesita las etapas 1, 2 y 3; no da puntos)
ALMACEN=archivo npm start         # la API guardando en datos/evaluaciones.json
```

## Qué hay en cada carpeta

```text
src/
  dominio/evaluacion.js                  Las reglas del negocio (ya escrito; no importa nada)
  aplicacion/
    puerto-repositorio.js                El acuerdo del repositorio (ya escrito)
    casos-de-uso.js                      ETAPA 1 · tu trabajo
  adaptadores/
    salida/repositorio-memoria.js        ETAPA 2 · tu trabajo
    salida/repositorio-archivo.js        ETAPA 2 · tu trabajo
    entrada/nucleo-http.mjs              La plomería HTTP (ya escrita)
    entrada/http.js                      ETAPA 3 · tu trabajo
  configuracion.mjs                      ETAPA 4 · tu trabajo (la composición)
  main.mjs                               El arranque (ya escrito)
pruebas/                                 Lo que comprueba cada etapa: es la especificación
verificar.mjs                            El verificador (escribe progreso.json)
recorrido.mjs                            Muestra, capa por capa, quién llama a quién (no da puntos)
equipo.json                              El nombre de tu equipo
docs/                                    El sitio: guía, marcador y presentación
```

## Juego limpio

El docente puede repetir el verificador en cualquier repositorio: **un resultado que no se reproduce no cuenta**. Se vale ayudarse
entre equipos, no copiar código, y cada integrante debe poder explicar el código de su equipo.
