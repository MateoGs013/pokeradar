# Registro de errores

Solo hechos reales: errores de la IA, míos, de librerías, de APIs externas o del entorno que aparecieron
mientras se construía el proyecto. Nunca se inventan ni se adornan entradas. La sección "Uso de IA" del
README sale de las entradas con origen **IA**.

Para agregar una entrada se puede usar `/registrar-error`.

## Índice

| Id   | Fecha      | Origen   | Área  | Resumen                                                                                                             |
| ---- | ---------- | -------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| E-01 | 2026-11-12 | IA       | docs  | Dimensionó el alcance con las "3 a 4 horas" de la consigna en vez del tiempo real disponible                        |
| E-02 | 2026-11-12 | IA       | docs  | Pasó un comando de taskkill con flags `/X`, que Git Bash convierte en rutas                                         |
| E-03 | 2026-11-12 | IA       | data  | Un comentario daba un motivo falso para descartar las formas alternativas en el dataset                             |
| E-04 | 2026-11-12 | IA       | world | Intentó liberar el borde del mapa endureciendo la caída, sin ver que el mar está fijado por percentil               |
| E-05 | 2026-11-12 | IA       | world | Afirmó un borde de mar garantizado en 10 celdas sin medirlo; quedaban 71 celdas de tierra                           |
| E-06 | 2026-11-12 | IA       | docs  | Al agregar una tabla en decisiones.md, mudó la fila de tw-animate-css a la tabla equivocada                         |
| E-07 | 2026-11-12 | librería | map   | Con Turbopack, MapLibre v6 se queda sin la URL de su worker y el worker pide la página                              |
| E-08 | 2026-11-12 | IA       | map   | Puso la posición en el div del mapa, donde el CSS de MapLibre le gana a Tailwind; antes culpó al `<main>` sin medir |
| E-09 | 2026-11-12 | IA       | docs  | Escribió E-07 y E-08 de memoria: hora inventada, origen equivocado y una causa sin medir                            |
| E-10 | 2026-11-12 | IA       | map   | Afirmó en un comentario que las señales cumplían WCAG 2.5.8 sin leer el criterio ni medir; quedaban a 23,3 px       |

## Formato de cada entrada

```md
### E-NN · AAAA-MM-DD HH:MM · origen · área

- **Síntoma:** qué se vio.
- **Causa:** por qué pasó.
- **Detección:** hook, typecheck, CI, /pr-review, vista previa o a mano.
- **Arreglo:** qué se cambió, con el commit (hash corto) o el PR (#n).
- **Prevención:** la regla, el hook, el chequeo o la línea de CLAUDE.md que se agregó; o "ninguna" y por qué.
```

- **origen:** `IA`, `mío`, `librería`, `API externa` o `entorno`.
- **área:** uno de los scopes de commits: `data`, `world`, `map`, `radar`, `hud`, `dossier`, `onboarding`, `crew`,
  `sound`, `ui`, `docs`, `ci`, `deps`.
- Numeración correlativa: E-01, E-02…
- La hora sale de `date` o del transcript, y cada campo se contrasta con lo registrado; nunca de memoria.

## Entradas

### E-01 · 2026-11-12 15:51 · IA · docs

- **Síntoma:** en el reporte del andamiaje y en la recomendación de alcance, Claude midió el concepto contra las
  "3 a 4 horas" de la consigna ("el alcance es grande para 3 a 4 horas") y propuso cortar el modo híbrido, las
  geocercas, el informe y los enjambres, con un plan de dos días y medio muy ajustado.
- **Causa:** tomó la dedicación estimada del MVP (sección 2 de la consigna) como si fuera el tiempo disponible, y no
  preguntó cuánto tiempo de trabajo había. El dato real (al menos 48 h libres hasta el cierre del sábado) no estaba
  escrito en ningún archivo.
- **Detección:** a mano, corrección de Mateo.
- **Arreglo:** plan de alcance rehecho para unas 48 h de trabajo (`docs/decisiones.md`, sección 8).
- **Prevención:** se agregó a "Datos del mail" de `docs/consigna.md` la línea "Disponibilidad: al menos 48 h de
  trabajo hasta el cierre del sábado. Las 3–4 h de la consigna son la estimación del MVP, no un límite."

### E-02 · 2026-11-12 16:00 · IA · docs

- **Síntoma:** Mateo no pudo cerrar el servidor viejo del puerto 3000 con el comando que le pasó Claude,
  `! taskkill /PID 44484 /F`.
- **Causa:** causa probable, sin confirmar con la salida que vio Mateo: el `!` de Claude Code corre en Git Bash, que
  convierte los argumentos que empiezan con `/` en rutas de Windows (`/PID` pasa a `C:/Program Files/Git/PID`). La
  misma conversión ya había roto el argumento `/` de `capturar.mjs`. En Git Bash hay que escribir `//PID` y `//F`.
- **Detección:** a mano, Mateo avisó que no lograba cerrar el puerto.
- **Arreglo:** Claude cerró el árbol de procesos con `taskkill //PID 56148 //T //F` (CLI de `next dev`, servidor 44484
  e hijo 68656) y comprobó que el puerto 3000 quedó libre.
- **Prevención:** se agregó a CLAUDE.md, en "Forma de trabajo": "Los comandos que se le pasan a Mateo para el `!`
  corren en Git Bash: los flags de Windows van con doble barra (`taskkill //PID 123 //F`) o se pasan como comando de
  PowerShell."

### E-03 · 2026-11-12 17:32 · IA · data

- **Síntoma:** en `src/lib/pokeapi/dataset.ts`, el comentario del cruce de tipos decía que las formas alternativas
  "se ignoran las que no tienen hábitat".
- **Causa:** Claude explicó el resultado sin mirar el dato. `/type` lista Pokémon (`/pokemon/{id}`), no especies, y
  un `/pokemon` no tiene hábitat. La forma por defecto comparte el id con su especie; las formas alternativas (ids
  desde 10001) se descartan porque su id no cruza con ninguna especie con hábitat.
- **Detección:** /pr-review del PR #1 (review delegada a un subagente de solo lectura).
- **Arreglo:** comentario reescrito en `indexTypes`, en el commit `refactor(data)` del PR #1.
- **Prevención:** se agregó a `.claude/rules/data.md`: "Los comentarios que explican un cruce de datos citan el
  endpoint y el campo que lo justifican."

### E-04 · 2026-11-12 18:13 · IA · world

- **Síntoma:** en la vista previa del mundo, el continente tocaba los bordes de arriba y de abajo. Claude subió la caída
  hacia los bordes (`EDGE_FALLOFF` de 0.9 a 1.4) y la tierra siguió tocando el borde de abajo.
- **Causa:** los umbrales de altura salen por percentil (`HEIGHT_SHARES`): el 40 % más bajo siempre es mar. Endurecer
  la caída cambia la forma del continente pero no cuánto mar hay, así que no garantiza que el borde sea agua.
- **Detección:** a mano, en la captura de `/verificar` a 1440 px.
- **Arreglo:** un hundimiento propio en las últimas 10 celdas de cada borde (`borderSink` en `fields.ts`). Este
  arreglo tampoco garantizaba el mar en toda la franja, como afirmaba: ver E-05.
- **Prevención:** el comentario de `HEIGHT_SHARES` en `src/lib/world/biomes.ts` explica que las proporciones son fijas
  y que el borde de mar lo asegura un hundimiento propio (hoy `sinkBorder`), no la caída.

### E-05 · 2026-11-12 18:48 · IA · world

- **Síntoma:** el comentario de `borderSink`, la entrada E-04 y la descripción del PR #2 afirmaban que las últimas 10
  celdas de cada borde eran siempre mar ("mayor que cualquier valor del ruido"). Con la semilla 151 quedaban 71 celdas
  de tierra en esa franja, con costas casi rectas en la décima fila o columna.
- **Causa:** Claude dio por bueno el arreglo mirando la captura, sin medirlo. La rampa valía 0,1 en la décima celda y
  solo superaba al ruido en las 5 exteriores. Al arreglarlo apareció la misma trampa de E-04 del otro lado: con los
  umbrales calculados sobre la altura ya hundida, la franja llenaba sola el cupo de mar y el continente quedó como un
  rectángulo (se vio en la captura antes de commitear).
- **Detección:** /pr-review del PR #2 (review delegada, que reprodujo el mundo y contó las celdas).
- **Arreglo:** en el PR #2, commit `fix(world): asegurar el mar del borde sin recortar la isla`. Los umbrales salen del
  terreno natural y el hundimiento se aplica después; más mar (55 %) y más caída para que la isla entre lejos del borde.
- **Prevención:** `assertSeaBorder` en `generate.ts` hace fallar el build si alguna celda de la franja no es mar: la
  afirmación se comprueba en cada build en lugar de depender de una captura.

### E-06 · 2026-11-12 18:48 · IA · docs

- **Síntoma:** en el PR #2, la fila de `tw-animate-css` desapareció de la tabla "Agregadas por `shadcn init`" de
  `docs/decisiones.md` y quedó al final de la tabla nueva del mundo, que dice "versiones exactas".
- **Causa:** el reemplazo que insertó la tabla nueva tomó como ancla la fila de `lucide-react`, que no era la última de
  la tabla de shadcn; la fila siguiente quedó debajo de la tabla nueva.
- **Detección:** /pr-review del PR #2.
- **Arreglo:** la fila volvió a la tabla de shadcn, en el mismo PR.
- **Prevención:** ninguna nueva: el chequeo es la review del PR, que lo detectó. Al editar tablas de `docs/`, revisar
  el diff de la tabla completa antes de commitear.

### E-07 · 2026-11-12 19:02 · librería · map

- **Síntoma:** en la consola de las capturas del build de producción: "Failed to load module script: The server
  responded with a non-JavaScript MIME type of "text/html"", con la URL `http://localhost:3100/` (la página), y
  "Error: Worker failed to load. Check that the worker URL is correct."
- **Causa:** MapLibre v6 arma la URL de su worker con `import.meta.url` (`function tl()` en `dist/maplibre-gl.mjs`) y,
  si no empieza con `http:` o `https:`, la deja vacía. Turbopack reemplaza ese `import.meta.url` por una ruta
  `file:///ROOT/node_modules/...` (se ve en el chunk compilado), así que MapLibre crea `new Worker("")`, que pide la
  propia página y recibe HTML.
- **Detección:** errores de consola en las capturas de `/verificar` (`capturar.mjs`). Claude había leído ese código
  antes y compiló sin configurar el worker a propósito, para ver si Turbopack lo resolvía solo.
- **Arreglo:** `setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href)` en
  `map-view.tsx`: esa expresión sí la reconoce Turbopack, que la reemplaza por la URL del worker copiado a
  `/_next/static/media/` con hash (en el chunk queda `tL.WORKER_URL=new e.U(e.r(44898)).href`).
- **Prevención:** nota en `docs/decisiones.md` (maplibre-gl) y comentario en `map-view.tsx`, con el porqué.

### E-08 · 2026-11-12 19:04 · IA · map

- **Síntoma:** con el worker ya cargando y la consola sin errores, las capturas seguían sin mapa: no se dibujaba nada.
- **Causa:** Claude puso `absolute inset-0` en el mismo div que MapLibre usa de contenedor. MapLibre le agrega la clase
  `.maplibregl-map`, y `maplibre-gl.css` la define con `position: relative` fuera de las capas de Tailwind; el CSS sin
  capa le gana a las utilidades, así que el div pierde `absolute inset-0` y queda sin alto. Antes de verlo, Claude
  sospechó sin medir que el `<main>` tenía altura 0 y cambió `flex-1` por `h-dvh`: la página siguió igual, y recién
  después leyó el CSS de la librería. El `<main>` no era parte del problema: con `flex-1` y el arreglo, el mapa se ve
  igual (comprobado en el build, a 390 y 1440 px).
- **Detección:** a mano, mirando las capturas de `/verificar` (vacías, sin errores de consola).
- **Arreglo:** el posicionamiento pasó a un div de afuera y el contenedor del mapa usa `h-full w-full`. El `<main>`
  volvió a `flex-1`.
- **Prevención:** comentario en `map-view.tsx`, nota en `docs/decisiones.md` (maplibre-gl) y se agregó a
  `.claude/rules/map.md`: "El div que recibe el mapa no lleva clases de posición: el CSS de MapLibre le gana a
  Tailwind; van en un div de afuera." Para el diagnóstico, ninguna nueva: el paso que faltó, medir antes de cambiar,
  es el mismo de E-05.

### E-09 · 2026-11-12 19:07 · IA · docs

- **Síntoma:** el primer borrador de E-07 y E-08 llevaba la hora 19:30 cuando el reloj marcaba 19:07. Además, E-08
  tenía origen `librería` aunque el error fue de Claude, y decía que cambiar a `h-dvh` "no alcanzó", como si el
  `<main>` fuera parte de la causa. No lo era (ver E-08).
- **Causa:** Claude escribió las entradas de memoria, sin contrastarlas con el reloj ni con el transcript; el `date`
  corrió en el mismo comando que las escribía. Es la segunda hora estimada en este archivo, después del primer
  borrador de E-04.
- **Detección:** Claude, al releer el archivo antes de commitear (hora y origen). Que lo del `<main>` no estaba medido
  lo marcó una segunda revisión de IA antes del reporte; la prueba con `flex-1` lo confirmó.
- **Arreglo:** horas y hechos rehechos desde el transcript de la sesión (19:02 y 19:04), origen de E-08 corregido a
  `IA` y E-08 reescrito con la prueba.
- **Prevención:** se agregó a "Formato de cada entrada": "La hora sale de `date` o del transcript, y cada campo se
  contrasta con lo registrado; nunca de memoria."

### E-10 · 2026-11-12 19:53 · IA · map

- **Síntoma:** el comentario de `SignalButton` (`src/components/map/signal-markers.tsx`, todavía sin commitear) decía
  que los botones de 20 px, con las señales a 23 px o más entre centros a 390 px de ancho, cumplían el espaciado de
  WCAG 2.5.8.
- **Causa:** la excepción de espaciado de WCAG 2.5.8 pide que los círculos de 24 px centrados en cada objetivo chico no
  toquen otro objetivo ni el círculo de otro objetivo chico: entre dos botones de 20 px, 24 px entre centros. Claude
  escribió el comentario con la separación calculada ("unos 23 px" a 390 px, la cuenta de `spawns.ts` y
  `docs/decisiones.md`), sin leer el criterio (lo leyó a las 20:02) ni medir.
- **Detección:** Claude, antes de commitear: midió con DevTools la distancia mínima entre centros (23,3 px a 390 px de
  ancho) y leyó el texto del W3C.
- **Arreglo:** el comentario dejó de afirmarlo (37af570) y la separación pasó de 12 a 14 celdas (0d97218).
  Medido: 25,2 px a 360 px de ancho, 26,3 a 375 y 27,3 a 390.
- **Prevención:** se agregó a `.claude/rules/ui.md`: "Un comentario o un doc que diga que algo cumple un criterio de
  WCAG cita el criterio y una medición; nunca de memoria ni con una cuenta."
