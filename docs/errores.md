# Registro de errores

Solo hechos reales: errores de la IA, míos, de librerías, de APIs externas o del entorno que aparecieron
mientras se construía el proyecto. Nunca se inventan ni se adornan entradas. La sección "Uso de IA" del
README sale de las entradas con origen **IA**.

Para agregar una entrada se puede usar `/registrar-error`.

## Índice

| Id   | Fecha      | Origen   | Área    | Resumen                                                                                                             |
| ---- | ---------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| E-01 | 2026-11-12 | IA       | docs    | Dimensionó el alcance con las "3 a 4 horas" de la consigna en vez del tiempo real disponible                        |
| E-02 | 2026-11-12 | IA       | docs    | Pasó un comando de taskkill con flags `/X`, que Git Bash convierte en rutas                                         |
| E-03 | 2026-11-12 | IA       | data    | Un comentario daba un motivo falso para descartar las formas alternativas en el dataset                             |
| E-04 | 2026-11-12 | IA       | world   | Intentó liberar el borde del mapa endureciendo la caída, sin ver que el mar está fijado por percentil               |
| E-05 | 2026-11-12 | IA       | world   | Afirmó un borde de mar garantizado en 10 celdas sin medirlo; quedaban 71 celdas de tierra                           |
| E-06 | 2026-11-12 | IA       | docs    | Al agregar una tabla en decisiones.md, mudó la fila de tw-animate-css a la tabla equivocada                         |
| E-07 | 2026-11-12 | librería | map     | Con Turbopack, MapLibre v6 se queda sin la URL de su worker y el worker pide la página                              |
| E-08 | 2026-11-12 | IA       | map     | Puso la posición en el div del mapa, donde el CSS de MapLibre le gana a Tailwind; antes culpó al `<main>` sin medir |
| E-09 | 2026-11-12 | IA       | docs    | Escribió E-07 y E-08 de memoria: hora inventada, origen equivocado y una causa sin medir                            |
| E-10 | 2026-11-12 | IA       | map     | Afirmó en un comentario que las señales cumplían WCAG 2.5.8 sin leer el criterio ni medir; quedaban a 23,3 px       |
| E-11 | 2026-11-12 | IA       | map     | La descripción del PR #3 decía que sin WebGL solo faltaba el mapa, sin probarlo; se caía la página entera           |
| E-12 | 2026-11-12 | IA       | docs    | Dio un motivo falso para la prevención de E-11: una regla general de medir antes de afirmar que no existe           |
| E-13 | 2026-11-12 | IA       | map     | Afirmó sin medir que en pantallas extremas el mapa carga; con el tope de ±180°, desde 30:1 de ancho no cargaba      |
| E-14 | 2026-11-12 | IA       | map     | El arreglo del cartel de carga dejó el canvas enfocable con Tab debajo del cartel; se probó sin teclado             |
| E-15 | 2026-11-12 | IA       | map     | Dos comentarios del PR #3 afirmaban comportamientos sin medirlos, y la cuenta de E-11 dejaba afuera a E-03 y E-09   |
| E-16 | 2026-11-12 | IA       | map     | El rótulo sobre el mapa quedó sin fondo y por debajo de 4,5:1 en cuatro biomas, y la página perdió su `<h1>`        |
| E-17 | 2026-11-13 | librería | map     | Con la ficha abierta, flyTo y jumpTo recortaban el destino con el padding viejo; la señal quedaba bajo el panel     |
| E-18 | 2026-11-13 | IA       | dossier | Los comentarios decían que la ficha entraba deslizándose; aparecía de golpe, y el PR daba 600 ms en vez de 300      |
| E-19 | 2026-11-13 | IA       | docs    | El README resumía errores.md sin releerlo, y la entrada del plan contradecía la tabla que cambiaba                  |
| E-20 | 2026-11-13 | IA       | docs    | 16 hashes de E-11 a E-19 eran los de las ramas; el merge con --rebase los reescribe y no están en main              |

## Formato de cada entrada

```md
### E-NN · AAAA-MM-DD HH:MM · origen · área

- **Síntoma:** qué se vio.
- **Causa:** por qué pasó.
- **Detección:** hook, typecheck, CI, /pr-review, vista previa, Claude o a mano (Mateo).
- **Arreglo:** qué se cambió, con el PR (#n) y el asunto del commit. El hash corto, solo si el commit ya está en `main`:
  el merge con `--rebase` lo cambia (E-20).
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
- **Detección:** Claude, mirando la captura de `/verificar` a 1440 px.
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
- **Detección:** Claude, mirando las capturas de `/verificar` (vacías, sin errores de consola).
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
- **Arreglo:** el comentario dejó de afirmarlo (bf2b6bc) y la separación pasó de 12 a 14 celdas (d9ce263).
  Medido: 25,2 px a 360 px de ancho, 26,3 a 375 y 27,3 a 390.
- **Prevención:** se agregó a `.claude/rules/ui.md`: "Un comentario o un doc que diga que algo cumple un criterio de
  WCAG cita el criterio y una medición; nunca de memoria ni con una cuenta."

### E-11 · 2026-11-12 20:42 · IA · map

- **Síntoma:** la descripción del PR #3 decía "Sin WebGL el mapa no se dibuja y no hay un mensaje propio". Sin WebGL2
  se caía la página entera: MapLibre 6.18 lanza `GPUInitializationError` en el constructor del mapa, y Next mostraba
  "This page couldn’t load", en inglés y sin el rótulo.
- **Causa:** Claude escribió la frase sin probar el caso. MapLibre 6 pide solo WebGL2, y el error sale de un efecto sin
  un error boundary propio, así que llega al de Next, que reemplaza la página.
- **Detección:** `/pr-review` del PR #3 (subagente) y reproducción con Chrome `--disable-webgl2` sobre el build del PR.
- **Arreglo:** un error boundary con `catchError` de `next/error` muestra un mensaje propio en el lugar del mapa y deja
  el resto de la página (bc6f1b5). Cubre también un worker o un código del mapa que no bajan. Probado con Chrome
  `--disable-webgl2`, con el archivo del worker escondido del build y con el chunk del mapa bloqueado. La frase de la
  descripción del PR se corrigió.
- **Prevención:** un ítem nuevo en el checklist de `.github/PULL_REQUEST_TEMPLATE.md`: lo que la descripción afirma del
  comportamiento tiene que estar probado, y lo que no, decir "sin probar". Es al menos la quinta afirmación sin probar
  (E-03, E-05, E-09, E-10 y E-11), y dos fueron en la descripción de un PR.

### E-12 · 2026-11-12 21:28 · IA · docs

- **Síntoma:** para la prevención de E-11, Claude le propuso a Mateo "ninguna" porque "la regla de medir antes de
  afirmar ya está en E-05 y E-10". No hay una regla general: E-05 dejó `assertSeaBorder` en el build, y E-10, una línea
  de `.claude/rules/ui.md` solo para WCAG. Mateo eligió esa opción con ese motivo.
- **Causa:** Claude escribió el motivo de memoria, sin releer las prevenciones de E-05 y E-10.
- **Detección:** Claude, al escribir E-11: el formato de este archivo pide contrastar cada campo con lo registrado.
- **Arreglo:** se le avisó a Mateo antes de escribir E-11, y eligió otra prevención (el ítem de la plantilla del PR).
- **Prevención:** ninguna: lo frenó la regla que ya tiene este archivo ("cada campo se contrasta con lo registrado;
  nunca de memoria").

### E-13 · 2026-11-12 22:16 · IA · map

- **Síntoma:** el comentario de `expandToAspect` (`src/lib/geo/bounds.ts`) decía que con una pantalla unas 11 veces
  más alta que ancha, o 30 veces más ancha que alta, "MapLibre acerca el mapa y el mundo queda recortado"; el mensaje
  de 9446899, que en esas pantallas "el mundo queda recortado, pero el mapa carga". Medido en el build: a lo alto, el
  mundo entraba entero hasta 100×2200 px (unas 22 veces); a lo ancho, desde 3000×100 (30:1) el mapa no cargaba: "No
  se pudo cargar el mapa." y, en la consola, un `TypeError` en `calcMatrices` de MapLibre.
- **Causa:** Claude escribió el comportamiento sin medirlo, y puso el tope de ±180° de longitud que sugería la review
  del PR #3 sin probar pantallas anchas. MapLibre lleva los bordes del límite a una sola vuelta del mundo (`wrap`, en
  `defaultConstrain`): −180° y 180° caen en el mismo lugar, y el límite le queda de ancho cero. A 30:1 justo ya fallaba
  antes de 9446899, y el tope lo extendió a toda proporción mayor (antes, a 3600×100 y 4000×100 el mapa cargaba pero
  mostraba otro lugar). A lo alto, Mercator estira la latitud: de −85° a 85° mide unas 22 veces el ancho del mundo.
- **Detección:** Claude, antes del push: la captura de 100×1200 px de la prueba de 9446899 mostraba la isla entera, al
  revés de lo que decía el comentario. Midió en varias proporciones, también con el código de antes de 9446899.
- **Arreglo:** tope de longitud en ±179° y el comentario con lo medido (f1ad8e2). Cargan todas las proporciones
  probadas, de 100×3000 a 6000×100. El mensaje de 9446899 queda como está, porque con el PR abierto cada arreglo es un
  commit nuevo (`docs/flujo.md`); lo corrige el de f1ad8e2.
- **Prevención:** se agregó a "Forma de trabajo" de `CLAUDE.md` una línea: lo que un comentario, un mensaje de commit
  o la descripción de un PR afirma del comportamiento se prueba antes de escribirlo, y si no, dice "sin probar". Sigue
  a E-03, E-05, E-09, E-10 y E-11, que también afirmaban un comportamiento sin probarlo; la regla de E-10 cubría solo WCAG, y el
  ítem de la plantilla de E-11, solo la descripción del PR.

### E-14 · 2026-11-12 22:09 · IA · map

- **Síntoma:** con el arreglo de "Cargando mapa…" (b317d57), el canvas queda enfocable con Tab debajo del cartel hasta
  `load`: el foco cae en algo que no se ve, y las flechas mueven el mapa tapado.
- **Causa:** el cartel tapa el canvas, pero MapLibre le pone `tabindex="0"` al crearlo, antes de `load`. El arreglo se
  probó mirando cuándo se va el cartel, sin probar el teclado durante la carga.
- **Detección:** `/pr-review` del PR #3, segunda vuelta (subagente).
- **Arreglo:** `inert` en el contenedor del mapa hasta `load` (e5b6918). Con red lenta, Tab con el cartel en pantalla
  ya no llega al canvas; después de `load`, sí.
- **Prevención:** en `.github/PULL_REQUEST_TEMPLATE.md`, el ítem de teclado pasó a "Usable con teclado y con foco
  visible, también mientras carga".

### E-15 · 2026-11-12 22:09 · IA · map

- **Síntoma:** dos comentarios del PR #3 afirmaban comportamientos sin medirlos. `map-status.tsx` decía que "el worker
  y el estilo tardan más que el código", pero el estilo va en línea y no se midió ninguna duración. `signal-markers.tsx`
  decía que `useState` crea el div "una sola vez", y con Strict Mode, en desarrollo, el inicializador corre dos veces.
  La descripción del PR repetía lo segundo. Además, E-11 contaba "la tercera afirmación sin probar" y dejaba afuera a
  E-03 y E-09.
- **Causa:** se escribieron sin medirlos. El orden de carga justificaba el cartel, no la duración; `useState` garantiza
  que el div es el mismo, no cuántas veces corre el inicializador. La cuenta de E-11 dejó afuera dos entradas del mismo
  archivo.
- **Detección:** `/pr-review` del PR #3, segunda vuelta (subagente).
- **Arreglo:** los dos comentarios dicen solo lo medido (9d7ffcf); E-11 y E-13 se corrigieron junto con esta entrada, y
  la descripción del PR #3 se reescribió sin esa frase.
- **Prevención:** ninguna nueva. Es la clase que cubre la línea de `CLAUDE.md` de E-13, y los dos comentarios son
  anteriores a ella (b317d57 y 8d168c7).

### E-16 · 2026-11-12 19:27 · IA · map

- **Síntoma:** desde 2a5334c, el rótulo de la esquina es texto de 12 px sin fondo sobre el mapa. Con `--hud-fg-muted`
  da menos de 4,5:1 sobre cueva, volcán, montaña y ciudad (cuentas sobre los tokens). En el mismo commit, el `<h1>` de
  la página pasó a ser un `<span>`, y la página quedó sin encabezado.
- **Causa:** los contrastes medidos de `globals.css` son contra las superficies del HUD (`--hud-bg`,
  `--hud-surface-2`), y el rótulo va directo sobre el mapa. El encabezado se perdió al rehacer la página para el mapa.
- **Detección:** `/pr-review` del PR #3, segunda vuelta (subagente). La primera vuelta no lo marcó.
- **Arreglo:** un `<h1>` visible en el rótulo (9c18a42) y un fondo detrás (f5130a0). Medido con el mapa recorrido con
  las flechas, a 390 y 1440: 6,29:1 como mínimo, en 7 de los 9 biomas.
- **Prevención:** se agregó a `.claude/rules/ui.md`: "El texto que va sobre el mapa lleva fondo, o su contraste se
  mide contra cada bioma (E-16)."

### E-17 · 2026-11-13 02:03 · librería · map

- **Síntoma:** con la ficha abierta a 768 px, la señal del extremo oeste quedaba en x = −7, fuera de la pantalla, y la
  del este en x = 469, debajo del panel (lo libre llega a 408). A 1440 quedaban a la vista, pero hasta 295 px del centro
  de la parte libre.
- **Causa:** `flyTo` y `jumpTo` ajustan el destino al límite del mapa (`maxBounds`) con el padding que el mapa tiene al
  empezar, y recién después ponen el nuevo: `tr.applyConstrain` en `handleFlyTo`
  (`maplibre-gl/src/geo/projection/mercator_camera_helper.ts:156`), y en `jumpTo` (`src/ui/camera.ts`) el centro se
  ajusta antes de `tr.setPadding`. Desde el mapa sin padding, el destino quedaba recortado como si la ficha no existiera.
- **Detección:** Claude, midiendo con CDP las señales de los cuatro extremos en 390, 768 y 1440, antes del commit.
- **Arreglo:** `setPaddingInPlace` en `src/components/map/camera.ts` pone el padding sin mover la vista (`setPadding` y
  después `setCenter` con el punto que ya estaba en el medio de la parte libre) y recién ahí vuela. Los 12 casos quedan
  con la señal entera en la parte libre (8827ada).
- **Prevención:** ninguna regla nueva. El porqué quedó en el comentario de `setPaddingInPlace`, y lo detectó la regla
  que ya existe: medir antes de afirmar (`CLAUDE.md`).

### E-18 · 2026-11-13 12:13 · IA · dossier

- **Síntoma:** los comentarios de `sheet.tsx` y `drawer.tsx` decían que el panel "entra deslizándose" y "entra y sale
  por abajo", pero la ficha aparecía de golpe: solo animaba la salida. Medido cuadro por cuadro, el panel estaba en su
  lugar desde el primer cuadro y sin `data-starting-style`. La descripción del PR #4, además, daba 600 ms para la
  entrada del sprite de la señal, que dura 300.
- **Causa:** `map-view.tsx` montaba `DossierPanel` ya abierto (la señal y el `open` cambiaban en el mismo evento), y
  Base UI no anima la entrada de un popup que se monta abierto (`animateInitialOpen`, apagado por defecto en
  `useTransitionStatus`). Los comentarios se escribieron sin medir la entrada: las pruebas medían la salida, el foco
  y la cámara. Los 600 ms eran el momento de la medición, no la duración.
- **Detección:** `/pr-review` del PR #4 (subagente).
- **Arreglo:** `DossierPanel` montado siempre, con el contenido solo cuando hay una señal (5bf587d). Medido: a 1440 el
  panel entra desde x = 1440 y llega a 1080 a los 348 ms; a 390 sube desde y = 844 y llega a 338 a los 445 ms. La
  descripción del PR se corrigió.
- **Prevención:** se agregó al paso "Revisar" de `.claude/skills/verificar/SKILL.md`: si el cambio agrega o toca una
  animación, medir también la entrada, cuadro por cuadro, y la duración real contra la que dicen los comentarios y el PR.

### E-19 · 2026-11-13 13:45 · IA · docs

- **Síntoma:** el README del PR #5 decía "Cada vez sumé una prevención", y E-15 no sumó ninguna. Contaba E-16 como un
  arreglo que rompió otra cosa, y salió de un `feat`; citaba entre comillas una frase que no era la de E-11, y daba
  como confirmada la causa probable de E-02. En `docs/decisiones.md`, la entrada nueva de "Cambios al plan" sacaba
  los nombres de lugares del bloque 2, pero la tabla del plan seguía poniéndolos ahí.
- **Causa:** el README resumió `docs/errores.md` desde un borrador y de memoria, sin releer cada entrada que citaba.
  La entrada del plan se escribió sin mirar la tabla que cambiaba; el cambio anterior al plan (51c6118) sí la había
  editado.
- **Detección:** `/pr-review` del PR #5 (subagente).
- **Arreglo:** la tabla del plan y la fila de los glyphs pasan al bloque 3 (8e91b7a); el README, corregido entrada por
  entrada (c3598cb).
- **Prevención:** se agregó a `CLAUDE.md`, en "Errores": cada afirmación del README sobre una entrada se contrasta con
  su síntoma, causa, detección y prevención antes de commitear. Y al principio de "Cambios al plan" de
  `docs/decisiones.md`: cada cambio edita también la tabla y las filas que nombran el bloque.

### E-20 · 2026-11-13 13:58 · IA · docs

- **Síntoma:** 16 hashes citados en las entradas E-11 a E-19 (22 lugares) no estaban en `main`. Un clon del repo no
  los encuentra.
- **Causa:** Claude anotó los hashes de los commits de cada rama antes del merge. `gh pr merge --rebase` reescribe
  los commits al pasarlos a `main`, con el mismo asunto y otro hash.
- **Detección:** Claude, después del merge del PR #5: los dos hashes de E-19 ya no coincidían con los de `main`, y un
  script que prueba cada hash del archivo con `git merge-base --is-ancestor` marcó los 16.
- **Arreglo:** PR #6, commit "docs(docs): citar en errores.md los hashes de los commits en main": cada hash, por el del
  commit de `main` con el mismo asunto, que en los 16 casos era uno solo.
- **Prevención:** en "Formato de cada entrada", el arreglo cita el PR y el asunto del commit; el hash, solo si el
  commit ya está en `main`. Lo mismo en el paso 2 de `/registrar-error`.
