# Decisiones técnicas

Registro de qué se eligió, por qué y dónde se verificó. Toda versión sale de `npm view` (fechas de publicación del campo `time[versión]`, no de `time.modified`) o de
la documentación oficial consultada el **12/11/2026**, no de memoria. Regla del proyecto: solo
se usan las librerías anotadas acá (ver CLAUDE.md).

## 1. Versiones

### Instaladas en el andamiaje

| Paquete                     | Versión | Notas                                                                                                                                                  | Fuente                                          |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| next                        | 16.4.6  | `latest` en npm (publicada el 9/11/2026).                                                                                                              | `npm view next dist-tags` y `time`              |
| react / react-dom           | 19.3.0  | create-next-app 16.4.6 fija 19.3.0 (9/9/2026). La 19.3.1 (14/10/2026) es `latest`; se puede subir cuando haya un motivo.                               | `npm view react dist-tags` y `time`             |
| typescript                  | 5.9.3   | `latest` es 7.0.2, pero typescript-eslint 8.72.2 (el que usa eslint-config-next) pide `typescript >=4.8.4 <6.1.0`. Con TS 7 el lint no está soportado. | `npm view typescript-eslint peerDependencies`   |
| tailwindcss                 | 4.3.3   | Next 16.4 lo integra con `@tailwindcss/turbopack` (en `next.config.ts`), no con PostCSS. La 4.3.5 existe; sin apuro.                                   | `package.json` generado, `npm view tailwindcss` |
| eslint                      | 9.39.5  | create-next-app 16.4.6 elige `^9`. La 10.14.0 existe; no se sube sin necesidad.                                                                        | salida de create-next-app                       |
| eslint-config-next          | 16.4.6  | Misma versión que Next.                                                                                                                                | `npm view eslint-config-next`                   |
| prettier                    | 3.10.1  | Exacta (`-E`).                                                                                                                                         | `npm view prettier`                             |
| prettier-plugin-tailwindcss | 0.8.1   | Con Tailwind v4 necesita `tailwindStylesheet` en `.prettierrc.json`.                                                                                   | README del plugin en `node_modules`             |

Agregadas por `shadcn init` (ver sección 4):

| Paquete                  | Versión | Para qué                                                                                                                                |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| @base-ui/react           | ^1.9.0  | Primitivas accesibles (foco, teclado, ARIA) de los componentes de shadcn.                                                               |
| shadcn                   | ^4.23.0 | El CLI y el archivo `shadcn/tailwind.css` (variantes `data-open:`, `data-closed:`) que importa `globals.css`.                           |
| cn                       | ^0.5.2  | Une clases de Tailwind. Desde septiembre de 2026 reemplaza a `clsx` + `tailwind-merge`. Fuente: ui.shadcn.com/docs/changelog/2026-09-cn |
| class-variance-authority | ^0.7.1  | Variantes de componentes (`cva`).                                                                                                       |
| lucide-react             | ^1.72.0 | Íconos que usan los componentes de shadcn.                                                                                              |

Instaladas para el mundo generado (versiones exactas):

| Paquete           | Versión | Para qué                                                                                                                                                                                           |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| simplex-noise     | 4.0.3   | Ruido 2D para la altura y la humedad. Trae tipos propios. `createNoise2D(random)` acepta el random con semilla de `src/lib/geo/random.ts`.                                                         |
| d3-contour        | 4.0.3   | Convierte el campo de cada bioma en polígonos (marching squares). Cada muestra de la grilla cae en el centro de su celda: el valor de la celda (1, 1) queda centrado en (1,5; 1,5). No trae tipos. |
| @types/d3-contour | 3.0.6   | Tipos versionados para la API 3.x. Comprobado al instalar: la 4.0.3 expone la misma API (`contours().size().thresholds().smooth()` y `contour(values, threshold)`).                                |
| tw-animate-css    | ^1.4.0  | Animaciones de entrada y salida de los componentes de shadcn.                                                                                                                                      |

### Elegidas, sin instalar (se instalan en el paso que las usa)

| Paquete     | Versión | Notas                                                                                                                                                                                                                                                                         | Fuente                                                  |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| maplibre-gl | 6.18.0  | Publicada el 11/11/2026 (muy reciente). v6 no tiene import por defecto: `import * as maplibregl from "maplibre-gl"` o imports con nombre. Hay que configurar el worker con bundlers.                                                                                          | `npm view`; visgl.github.io/react-map-gl/docs/whats-new |
| motion      | 14.13.0 | Publicada el 12/11/2026 (el mismo día del andamiaje). Es la librería que la consigna llama "Framer Motion". Se instala `motion` y se importa desde `"motion/react"`. `framer-motion` se sigue publicando con la misma versión, pero la guía oficial indica migrar a `motion`. | motion.dev/docs/react-upgrade-guide                     |

## 2. Opciones evaluadas

Decididas por Mateo el 12/11/2026: ver la sección 8. Se dejan los pros y contras como registro de por qué.

### A. Cómo se monta el mapa

**react-map-gl (`react-map-gl/maplibre` 8.1.3)**

- Pro: API declarativa (`<Map>`, `<Source>`, `<Layer>`, `<Marker>`), la más conocida y documentada.
- Pro: soporta MapLibre v6 desde 8.1.2; `useMap` y controles listos.
- Contra: no trae `"use client"`; hay que envolverlo en un Client Component propio.
- Contra: bugs abiertos con React 19 y Next 16: `Marker` con error `appendChild` en navegación rápida (#2584) y con `cacheComponents` (#2588).
- Contra: una capa de abstracción más entre la niebla o el radar y la API de MapLibre.

**maplibre-gl directo**

- Pro: cero dependencias extra y control total del ciclo de vida (crear una vez, `remove()` al desmontar).
- Pro: la niebla, el barrido y las capas se escriben contra la API oficial, sin traducción.
- Contra: más código propio: refs, efectos, sincronizar estado de React con el mapa.
- Contra: marcadores y popups con React requieren portales escritos a mano.
- Contra: más superficie para errores de limpieza (listeners, fugas al desmontar).

**mapcn (registro estilo shadcn, MIT)**

- Pro: un solo archivo (`components/ui/map.tsx`) con `"use client"`, sobre maplibre-gl `^6` directo, sin react-map-gl.
- Pro: **sí acepta un estilo propio sin tiles**: prop `styles` (`string | StyleSpecification`) o prop `blank` (estilo sin fuentes, solo fondo). CARTO es solo el valor por defecto.
- Pro: trae `MapMarker`, `MapPopup`, `MapControls`, `MapGeoJSON` y `MapClusterLayer`; es código nuestro y se puede adaptar.
- Contra: por defecto carga el worker de MapLibre desde unpkg; hay que cambiarlo con `setWorkerUrl` para no depender de un CDN externo.
- Contra: `map.tsx` tiene **2763 líneas** (verificado con curl el 12/11); hay que leerlo entero para poder defenderlo, o recortarlo a lo que se usa; suma `lucide-react` (ya instalado) y `@types/geojson`.

Fuentes: mapcn.vercel.app/docs/installation, `src/registry/map.tsx` en github.com/anmolsaini16/mapcn, visgl.github.io/react-map-gl/docs/get-started, issues #2584 y #2588 de visgl/react-map-gl.

### B. Dónde vive el estado (ajustes del onboarding, bitácora, avisos)

**Contexto de React**

- Pro: sin dependencias; es React puro y fácil de explicar.
- Pro: alcanza para estado que cambia poco (ajustes del operador).
- Contra: cada cambio re-renderiza a todos los consumidores; con avisos frecuentes hay que partir el contexto.
- Contra: la persistencia en localStorage se escribe a mano.
- Contra: más código de proveedores a medida que crece el estado.

**zustand 5.1.0**

- Pro: suscripción por selector: solo re-renderiza lo que lee ese dato.
- Pro: middleware `persist` para localStorage ya hecho.
- Contra: en Next la guía oficial pide un store por pedido, creado en un provider de cliente, nunca global (zustand.docs.pmnd.rs/learn/guides/nextjs).
- Contra: `persist` genera diferencias de hidratación; hay que usar `skipHydration` y `rehydrate()` en un efecto.
- Contra: una dependencia más que justificar.

**URL + localStorage**

- Pro: la URL ya es parte del concepto (`?modo=mundo&p=25`): compartir un avistamiento sale gratis.
- Pro: el Server Component puede leer `searchParams` y renderizar el estado inicial.
- Contra: solo sirve para estado chico y serializable; la bitácora y los avisos no entran en la URL.
- Contra: leer localStorage obliga a esperar al montaje (sin SSR de ese dato).
- Contra: dos fuentes de verdad que hay que mantener sincronizadas.

### C. Texto en el mundo generado (glyphs de MapLibre)

Comprobado con curl el 12/11:

- **OpenFreeMap**: `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`. Responde 200 para `Noto Sans Regular`, `Noto Sans Bold` y `Noto Sans Italic`, con `access-control-allow-origin: *`. **No hay fuente monoespaciada** (`Noto Sans Mono Regular` da 404). Sin API key ni límite de pedidos; pide atribución, que MapLibre agrega sola. Fuente: openfreemap.org y el estilo `styles/liberty`.
- **MapLibre demotiles**: `https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf`. Responde 200 para `Open Sans Semibold`. No publica términos de uso: es para demos y CI.
- Para nombres de lugares en monoespaciada habría que generar y alojar PBF propios, o usar etiquetas HTML (marcadores) en lugar de capas de símbolos.

### D. Componentes de shadcn bajo Base UI que cambiaron (detectado al verificar)

El mapa de componentes previsto menciona **Drawer (Vaul)** y **Sonner**. Con la base Base UI:

- **Drawer** ya no usa Vaul: usa el Drawer de Base UI (ui.shadcn.com/docs/components/base/drawer). Solo la base Radix sigue con `vaul`.
- **Sonner**: la página de Base UI redirige a un **Toast** propio de Base UI (`add toast`, API `toast.add(...)`). El ítem `sonner` sigue existiendo en el registro `base-nova` (depende de `sonner` y `next-themes`).
- **Command** sigue usando `cmdk`. Sheet, Dialog, Tooltip, Switch, RadioGroup y Slider usan primitivas de Base UI. Kbd es un elemento con estilo, sin primitiva.
- Decidido: Drawer de Base UI y Toast de Base UI (sección 8).

### E. Sonidos y efecto de texto: librería o propio

Ver sección 5.

## 3. Tip técnico del PDF: `dynamic(..., { ssr: false })`

**Resultado:** en Next 16.4.6, `ssr: false` **no funciona dentro de un Server Component**: da error. Tiene que vivir
en un Client Component (con `"use client"`) que envuelva al mapa; ese envoltorio sí se puede renderizar desde
`page.tsx` (servidor).

Fuente: documentación local de la versión instalada, `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`:

> "`ssr: false` option is not supported in Server Components. You will see an error if you try to use it in Server Components."
> "`ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component."

En el mismo archivo, el ejemplo de la sección "With no SSR" también abre con `'use client'`.
No se implementó todavía.

## 4. shadcn/ui

- **Bases hoy:** Base UI (`base`), Radix (`radix`) y React Aria (`aria`). **Base UI es la base por defecto desde el
  2/7/2026**; Radix sigue soportado. Fuentes: `shadcn init --help` (4.23.0) y ui.shadcn.com/docs/changelog/2026-07-base-ui-default.
- **Elegida: Base UI**, como pedía la consigna del setup. No apareció un motivo para otra: es la base por defecto, la más mantenida
  hacia adelante y cubre todos los componentes previstos (con los cambios de la sección 2.D).
- **Comando usado:** `pnpm dlx shadcn@4.23.0 init -b base --defaults --no-monorepo --no-rtl` (estilo `base-nova`).
- **Qué hizo:** escribió `components.json`, `src/lib/utils.ts` (`export { cn } from "cn"`), reescribió `globals.css` e
  instaló las 6 dependencias de la tabla de la sección 1. También creó `src/components/ui/button.tsx`, **que se borró**:
  los componentes se suman cuando se usan, con el CLI.
- **Tokens:** `globals.css` define los tokens del HUD (`--hud-*`, 3 acentos verde, ámbar y cian, fondo oscuro) y conecta los
  de shadcn (`--primary`, `--ring`, `--background`, etc.) a ellos. El acento se cambia con `data-hud` en `<html>`.
  Los valores son una propuesta inicial; contraste medido: acentos sobre fondo > 11:1, texto secundario ≥ 5.99:1.
  Se quitaron el tema claro y los tokens de sidebar y charts, que no se usan.
- `init` dejó `--font-sans: var(--font-sans)`, una referencia circular; se corrigió apuntando a las variables de Geist.
- **MCP de shadcn:** existe (ui.shadcn.com/docs/mcp). Propuesto, no instalado.

## 5. Candidatas verificadas (sin instalar)

**mapcn:** ver decisión 2.A. Licencia MIT. Se instala con `pnpm dlx shadcn@latest add @mapcn/map`.

**Bencho** (bencho.dev):

- Los **24 sonidos gratuitos** (Paid, Landed, Sigh, Buzz, Bump, Plop, Beacon, Perk, Hail, Drift, Wisp, Lull, Float, Wander,
  Drape, Hush, Purr, Boot, Drone, Whisk, Glide, Step, Tick, Latch) están en un solo archivo, `sounds/sounds.ts` (unas 220
  líneas, sin imports ni archivos de audio), sintetizados con Web Audio. API: `play(name, { volume, pitch })`.
- **Licencia:** todo lo del repo público es **MIT**, incluidos esos 24. El resto (Pro) tiene otra licencia.
- **Crédito:** no pide atribución en la interfaz; solo la condición MIT de conservar el aviso de copyright en el archivo.
  Beacon y Plop vienen de _cuelume_ (MIT): hay que conservar también ese aviso (THIRD_PARTY.md).
- Se instala copiando el archivo; no hay paquete npm ni registro shadcn. Los **bloques visuales** usan su propio CSS y
  `framer-motion`: descartados, como estaba previsto.
- Fuentes: bencho.dev/licence, github.com/cabralorenzo/bencho (`sounds/README.md`, `LICENSE`, `THIRD_PARTY.md`).

**Efecto de texto para "Analizando firma…":**

|                        | React Bits DecryptedText                                         | Motion Primitives TextScramble | Propio                  |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------ | ----------------------- |
| Licencia               | MIT + Commons Clause (no se puede redistribuir el componente)    | MIT                            | nuestro                 |
| Tamaño (TS + Tailwind) | ~641 líneas                                                      | 86 líneas                      | ~30–40 líneas estimadas |
| Dependencias           | `motion`                                                         | `motion`                       | ninguna                 |
| Lector de pantalla     | sí (`sr-only` con el texto final y `aria-hidden` en el revuelto) | no                             | a escribir              |
| Movimiento reducido    | sí (`matchMedia`)                                                | no                             | a escribir              |

Fuentes: LICENSE.md y `src/ts-tailwind/TextAnimations/DecryptedText/DecryptedText.tsx` en DavidHDev/react-bits;
`components/core/text-scramble.tsx` y LICENCE.md en ibelick/motion-primitives.
Lectura: DecryptedText es demasiado grande para defenderlo línea por línea; TextScramble es chico pero le faltan
accesibilidad y movimiento reducido, que habría que agregar igual. Decidido: se escribe a mano (sección 8).

## 6. Descartadas

| Librería                                                 | Motivo                                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Magic UI, Aceternity                                     | Efectos de landing que cualquier evaluador de frontend reconoce al instante: restan originalidad, que vale 35% de la nota.                             |
| 8bitcn                                                   | Estética pixel art: choca con la sala de monitoreo sobria del concepto.                                                                                |
| MUI, Mantine, HeroUI, Chakra                             | Traen su propio sistema de estilos que pelea con Tailwind, pesan más y empujan una estética propia reconocible.                                        |
| Bloques visuales de Bencho                               | Usan su propio CSS (no Tailwind) y `framer-motion`. Solo interesan los sonidos.                                                                        |
| react-map-gl                                             | Bugs abiertos de `Marker` con React 19 y Next 16 (#2584, #2588) y una capa más entre la niebla o el radar y MapLibre.                                  |
| mapcn                                                    | `map.tsx` tiene 2763 líneas, la mayoría para rutas, arcos y clusters que no se usan, y carga el worker desde unpkg. Se puede leer como referencia.     |
| zustand                                                  | Store por pedido y `persist` con hidratación manual: más de lo que este estado necesita.                                                               |
| Vaul y Sonner                                            | Con la base Base UI, shadcn trae Drawer y Toast propios; Sonner además suma `next-themes`.                                                             |
| React Bits DecryptedText, Motion Primitives TextScramble | El primero tiene ~641 líneas y licencia que prohíbe redistribuirlo; el segundo no maneja lector de pantalla ni movimiento reducido. Se escribe propio. |
| Sonidos de Bencho                                        | Hacen falta 2 o 3 sonidos; el ping del radar con Web Audio son ~20 líneas propias. Se puede reconsiderar si hace falta más variedad.                   |

## 7. Otras decisiones del andamiaje

- **`typecheck` = `next typegen && tsc --noEmit`.** Los tipos de rutas (`LayoutProps`, `PageProps`) los genera Next en
  `.next/types`; en un CI limpio `tsc` solo falla sin ellos. Fuente: `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`
  ("next typegen && tsc --noEmit").
- **tsconfig estricto:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`.
- **ESLint:** `@typescript-eslint/no-explicit-any` en `error`.
- **pnpm 10** no corre scripts de instalación de dependencias por defecto. create-next-app dejó `sharp` y `unrs-resolver`
  en `ignoredBuiltDependencies` (`pnpm-workspace.yaml`); `sharp` usa binarios precompilados y Vercel optimiza imágenes por su cuenta.
- **`packageManager: pnpm@10.34.1`** en `package.json`: lo leen el CI (`pnpm/action-setup`) y Vercel.
- **Tipografía:** Geist y Geist Mono (las de create-next-app, con `next/font`) son provisorias. Se reemplazan por IBM
  Plex (sección 8).
- **`server-only` sin instalar:** Next resuelve `import "server-only"` internamente; instalar el paquete es opcional.
  Fuente: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
- **AGENTS.md** lo escribe y mantiene `next dev` (bloque `nextjs-agent-rules`); se commitea tal cual.

## 8. Decisiones tomadas y plan de alcance (12/11/2026)

Decididas por Mateo sobre las opciones de la sección 2. El criterio común: cada pieza tiene que poder explicarse
línea por línea en la charla técnica.

### Decisiones

| Tema                     | Decisión                                                            | Por qué                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Montaje del mapa         | `maplibre-gl` directo, en un Client Component propio                | Niebla, barrido, capas y cámara se escriben igual contra la API de MapLibre; sin bugs de `Marker` de react-map-gl ni las 2763 líneas de mapcn. Primer riesgo a verificar: configurar el worker de MapLibre v6 con Turbopack.            |
| Estado                   | URL + localStorage + un contexto chico                              | `?modo=mundo&p=25` en la URL (la lee el servidor); ajustes del onboarding en localStorage con un hook propio sobre `useSyncExternalStore` (sin errores de hidratación); bitácora y avisos con `useReducer` en un contexto. Sin zustand. |
| Texto en el mundo        | Glyphs propios de IBM Plex Mono, alojados en `public/`              | Los nombres del mapa con la misma voz que el HUD. Herramienta para generar los PBF: a definir y anotar en el bloque 1. Respaldo: Noto Sans de OpenFreeMap.                                                                              |
| Panel de la ficha        | Sheet en desktop y Drawer de Base UI en mobile                      | Coherentes con la base elegida, sin Vaul.                                                                                                                                                                                               |
| Avisos de la tripulación | Toast de Base UI                                                    | Apilado, acciones (tocar y volar al lugar) y tipos de estado para las prioridades. Sin Sonner.                                                                                                                                          |
| Sonidos                  | Propios, con Web Audio                                              | El ping del radar es parte de la identidad y son ~20 líneas.                                                                                                                                                                            |
| "Analizando firma…"      | Efecto propio (~35 líneas)                                          | Texto real en `sr-only`, revuelto con `aria-hidden` y sin animación con movimiento reducido.                                                                                                                                            |
| Tipografía               | IBM Plex Mono (datos) e IBM Plex Sans, con `next/font`              | Geist es la de create-next-app y se reconoce; Plex tiene el aire técnico de una sala de monitoreo.                                                                                                                                      |
| Niebla                   | Grilla de celdas en GeoJSON con `feature-state`                     | El porcentaje de cobertura por región sale de contar celdas; transición de opacidad que se apaga con movimiento reducido. Con el tiempo disponible se busca borde suave.                                                                |
| Señales                  | Botones del DOM solo para las señales detectadas                    | Cumple `<button>` con `aria-label` y "marcadores con sprite animado"; la niebla limita a decenas los visibles. Identificadas muestran sprite e ícono de tipo.                                                                           |
| Mundo generado           | Se calcula una vez en el build (página estática)                    | simplex-noise + d3-contour con semilla 151, grilla de 200×150 (celdas de 0,08°). El GeoJSON de los 9 biomas pesa unos 96 KB.                                                                                                            |
| Caché del dataset        | `fetch` con `next: { revalidate: false }` (sin vencimiento)         | Las 386 especies y sus hábitats no cambian. Con ISR de un día la ruta dependía de PokéAPI cada 24 h sin ganar nada; así se arma una vez por deploy, igual que el mundo. Un pedido corta a los 10 s (`AbortSignal.timeout`). PR #1.      |
| MCP                      | `next-devtools-mcp` sí; Playwright MCP y el de shadcn no, por ahora | Errores y rutas en vivo; las capturas ya las cubre `/verificar` y los componentes, el CLI de shadcn.                                                                                                                                    |
| Skills de terceros       | Ninguna                                                             | `web-design-guidelines` ya está instalada.                                                                                                                                                                                              |

### Antes de hacer público el repo (hecho el 12/11)

- Se quitó de `docs/consigna.md` el mail del mentor (con una nota que lo aclara).
- Se reformularon en `docs/concepto.md` las dos frases dirigidas al evaluador, con el texto aprobado por Mateo.
- `.claude/` queda público: muestra el flujo de trabajo con IA.

### Plan de alcance

Tiempo disponible: al menos 48 h de trabajo hasta el cierre del sábado 14/11. Entra el concepto completo; los
recortes son contingencia, no plan.

| Bloque | Horas | Qué                                                                                                                           |
| ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1      | ~7    | Datos (cliente tipado, 18 pedidos de `/type`, hábitats) y mundo generado: biomas, costas, nombres de lugares y glyphs propios |
| 2      | ~8    | MVP: mapa, señales, ficha con skeleton y error, cámara con padding, animaciones. Deploy y `v0.1.0`                            |
| 3      | ~8    | Niebla y radar, antenas, HUD, onboarding de 3 pasos y arranque del sistema con Rotom                                          |
| 4      | ~6    | Tripulación y avisos; eventos: shiny, enjambres, día y noche, clima con Open-Meteo                                            |
| 5      | ~6    | Bitácora, compartir por URL, informe exportable, fin de turno, geocercas                                                      |
| 6      | ~5    | Modo híbrido: mapa real con estilo propio, en la ubicación del usuario o en Río Negro                                         |
| 7      | ~4    | Sonido y atajos de teclado; pasada completa de accesibilidad y movimiento reducido                                            |
| 8      | ~4    | Pulido visual en mobile y desktop, README, `/pr-review` final y `v1.0.0`                                                      |

Si algo se atrasa, cae primero el bloque 6 y después las geocercas.
