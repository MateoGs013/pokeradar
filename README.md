# PokéRadar

Sala de monitoreo: un mapa con un mundo generado, señales que pulsan como en un radar y una ficha de inteligencia para
identificar cada una con datos reales de PokéAPI.

- **Producción:** https://pokeradar-nine.vercel.app
- **Consigna:** [docs/consigna.md](docs/consigna.md) · **Concepto completo:** [docs/concepto.md](docs/concepto.md)

## Concepto y Narrativa

Sos el operador de turno de un centro de monitoreo. En el mapa aparecen señales sin identificar; al tocar una, la cámara
vuela hasta ella, el sistema "analiza la firma" y abre la ficha de inteligencia del Pokémon: tipos, estadísticas base,
nivel de amenaza, altura, peso y el lugar donde se detectó. La señal identificada pasa a mostrar su sprite.

La idea la saqué del producto de DataInt (monitoreo, alertas, niveles de amenaza) y de la propia PokéAPI, donde el Poké
Radar existe como ítem y como condición de encuentro. Quise que los requisitos de la consigna fueran parte del relato: el
skeleton es "Analizando firma…", el error es "Señal perdida" con "Reintentar", y los marcadores son pulsos de radar.

El mundo no es un mapa real: es una isla generada con ruido y semilla (151), con nueve biomas, uno por cada hábitat de
PokéAPI (el mar, la cueva, la ciudad; el volcán es el de las especies raras). Cada una de las 40 señales es una especie
distinta, ubicada en su hábitat.

**Qué hay en `v0.1.0` (el MVP de la consigna):**

| Requisito                                              | Cómo lo cumplí                                                                                                                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mapa interactivo con marcadores propios y cámara suave | MapLibre GL JS con el mundo generado como única fuente (sin tiles externos); 40 señales con pulso de radar que se transforman en el sprite animado al identificarlas; `flyTo` con padding para que la ficha no tape la señal |
| Datos reales y panel de detalle                        | Dos pedidos a PokéAPI (`/pokemon` y `/pokemon-species`), validados; ficha al costado en desktop y abajo en mobile; skeleton del tamaño final y error con reintento                                                           |
| Animaciones con propósito                              | Pulso de las señales, "Analizando firma…" que se descifra, entrada de la ficha, barras de estadísticas que crecen, entrada del sprite; todo apagado con `prefers-reduced-motion` (la cámara usa `jumpTo`)                    |

Accesibilidad: cada señal es un `<button>` con `aria-label` ("Señal sin identificar en el volcán del centro", y después
"Shuppet en la ciudad del este"), foco visible, Tab entre señales de norte a sur, Esc cierra la ficha y el foco vuelve a la
señal.

## Arquitectura y Stack

| Pieza             | Elección                                                              | Por qué                                                               |
| ----------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Framework         | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript estricto | Lo pide la consigna                                                   |
| Mapa              | `maplibre-gl` 6.18, directo en un Client Component                    | Capas, cámara y marcadores contra la API de MapLibre, sin envoltorios |
| Mundo             | `simplex-noise` + `d3-contour`, calculado una vez en el build         | Página estática; al navegador viajan solo los polígonos y las señales |
| Estilos           | Tailwind 4 con tokens en `src/app/globals.css`                        | Un solo lugar para colores, tipografía y radios                       |
| Paneles y botones | shadcn sobre Base UI (Sheet, Drawer, Button), reestilados             | Foco, Esc y teclado resueltos; el aspecto es del HUD                  |
| Animación         | `motion` 14.13 y `tw-animate-css`                                     | Barras y transiciones; CSS para el pulso                              |

Las decisiones, con sus alternativas y versiones, están en [docs/decisiones.md](docs/decisiones.md). Lo que aprendí de
PokéAPI, en [docs/hallazgos-pokeapi.md](docs/hallazgos-pokeapi.md).

**Servidor y cliente.** `src/app/page.tsx` es un Server Component: genera el mundo, arma el dataset de especies (con
caché sin vencimiento) y ubica las señales. Lo que no debe llegar al navegador lleva `import "server-only"`. El mapa se
carga con `dynamic(..., { ssr: false })` dentro de un Client Component, como sugiere la consigna. La ficha pide los
datos desde el navegador, al identificar.

```
src/app/                   layout, página (servidor) y estilos globales
src/components/map/        mapa, señales, cámara, carga y error
src/components/dossier/    ficha de inteligencia: panel, cuerpo, sprite, texto revuelto
src/components/ui/         componentes de shadcn con los tokens del HUD
src/hooks/                 identificación con caché y cancelación; media queries
src/lib/pokeapi/           tipos, guards y cliente tipado de PokéAPI
src/lib/world/             generación del mundo (ruido, biomas, polígonos)
src/lib/geo/               encuadre y ubicación de las señales
docs/                      consigna, concepto, decisiones, hallazgos, errores y flujo
```

## Uso de Inteligencia Artificial (AI-Native Workflow)

**Herramientas.** Usé Claude Code, con Claude Opus 5.5, para escribir código, documentación y mensajes de commit. La
regla fue que antes de editar me contara un plan corto y esperara mi OK. Una noche lo dejé avanzar solo con una lista
de tareas, sin pushear y con un informe de lo que decidió sin mí, que revisé a la mañana. Para medir y sacar capturas,
Chrome headless manejado por scripts.

**Cómo la dirigí.** Las reglas están en [CLAUDE.md](CLAUDE.md) y en `.claude/`, públicas a propósito:

- **Pasos chicos con mi OK:** antes de editar, el plan; después, qué hizo y por qué. Nada de push, PR ni merge sin mi
  OK.
- **Hooks:** ESLint sobre cada archivo editado y `pnpm typecheck` al terminar cada turno.
- **`/verificar`:** lint, typecheck, build y capturas en 390, 768 y 1440 px con los errores de consola, en Chrome
  headless.
- **`/pr-review`:** el análisis de cada PR lo hace un subagente nuevo, de solo lectura y sin la conversación donde se
  escribió el código, para que vea el código y no las razones de quien lo escribió.
- **Medir antes de afirmar:** lo que un comentario, un commit o un PR dice del comportamiento se prueba antes, o dice
  "sin probar".

**Dónde se equivocó y cómo lo corregí.** Todo está en [docs/errores.md](docs/errores.md), con síntoma, causa, cómo se
detectó, arreglo y prevención. De las 18 entradas, 16 son errores de la IA. Los que más me enseñaron:

- **Afirmar sin medir** fue el error más repetido (E-03, E-05, E-09, E-10, E-11, E-13, E-15 y E-18). Por ejemplo, dijo
  que las señales cumplían WCAG 2.5.8 sin medir: quedaban a 23,3 px entre centros (E-10); que sin WebGL "solo faltaba el
  mapa", cuando se caía la página entera (E-11); y que la ficha entraba deslizándose, cuando aparecía de golpe (E-18).
  Cada vez sumé una prevención; una de ellas, una línea de `CLAUDE.md` que obliga a probar o a escribir "sin probar".
- **Dimensionar mal:** planificó con las "3 a 4 horas" de la consigna en lugar del tiempo real que yo tenía; lo
  corregí (E-01).
- **Comandos de Windows:** me pasó un `taskkill` con flags que Git Bash convierte en rutas (E-02).
- **Arreglos que rompen otra cosa:** el arreglo del cartel de carga dejó el mapa enfocable con Tab debajo del cartel
  (E-14), y el rótulo quedó sin contraste sobre algunos biomas (E-16). Los marcó la review delegada.
- **Librerías:** MapLibre v6 con Turbopack se quedaba sin su worker (E-07), y su cámara recorta el destino con el padding
  anterior, lo que dejaba la señal debajo de la ficha (E-17). Las dos se encontraron midiendo, no leyendo.

Quién los detectó: la review delegada (`/pr-review`) encontró 8; la propia IA, midiendo, mirando capturas o releyendo
antes del commit, otros 8; y yo, 2.

## Próximos Pasos

Con una semana más, el resto del concepto ([docs/concepto.md](docs/concepto.md)):

- **Niebla y radar:** el mapa empieza cubierto y un barrido lo despeja; solo las señales detectadas son botones.
- **HUD de instrumento** con cobertura por región, y un **onboarding** de tres pasos con el arranque del sistema.
- **Nombres de lugares** sobre el mapa, con glyphs propios de IBM Plex Mono.
- **Tripulación y avisos** con prioridades; eventos del mundo (shiny, enjambres, día y noche, clima con Open-Meteo).
- **Bitácora, compartir por URL** (`?modo=mundo&p=25`) e informe exportable del turno.
- **Modo híbrido:** el mismo radar sobre un mapa real.
- **Calidad:** pruebas con lector de pantalla y en Safari, Firefox y teléfonos reales, que hoy faltan; pruebas
  automatizadas de las interacciones del mapa.
