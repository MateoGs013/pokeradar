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

Para quien lo usa, la metáfora hace de instrucciones: una señal que pulsa se toca, la espera es el sistema analizando y
un error es una señal que se perdió y se puede volver a buscar. Cada estado dice qué está pasando con palabras de la
historia, en lugar de un spinner o un mensaje genérico.

El mundo no es un mapa real: es una isla generada con ruido y semilla (151), con nueve biomas, uno por cada hábitat de
PokéAPI (el mar, la cueva, la ciudad; el volcán es el de las especies raras). Cada una de las 40 señales es una especie
distinta, ubicada en su hábitat.

**Qué hay en `v0.1.0` (el MVP de la consigna):**

| Requisito                                              | Cómo lo cumplí                                                                                                                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mapa interactivo con marcadores propios y cámara suave | MapLibre GL JS con el mundo generado como única fuente (sin tiles externos); 40 señales con pulso de radar que se transforman en el sprite animado al identificarlas; `flyTo` con padding para que la ficha no tape la señal |
| Datos reales y panel de detalle                        | Dos pedidos a PokéAPI (`/pokemon` y `/pokemon-species`), validados; ficha al costado en desktop y abajo en mobile; skeleton del tamaño final y error con reintento                                                           |
| Animaciones con propósito                              | Pulso de las señales, "Analizando firma…" que se descifra, entrada de la ficha, barras de estadísticas que crecen, entrada del sprite; todo apagado con `prefers-reduced-motion` (la cámara usa `jumpTo`)                    |

Accesibilidad: cada señal es un `<button>` con `aria-label` ("Señal sin identificar en el volcán de Monte Brasa", y
después "Shuppet en la ciudad de Cruz del Viento"), foco visible, Tab entre señales de norte a sur, Esc cierra la ficha
y el foco vuelve a la señal.

**Después de `v0.1.0`:**

- **Tipografía propia:** Martian Mono para el sistema y los datos, Atkinson Hyperlegible Next para leer y Doto, de
  matriz de puntos, solo para el nombre identificado y "Señal perdida".
- **Nombres de lugares:** las cuatro ciudades, el volcán y los dos lagos tienen nombres inventados, elegidos con la
  semilla, que el mapa dibuja con Martian Mono. Cada señal se nombra desde la ciudad o el volcán más cercano ("la
  llanura, al noreste de Campo Garza"), en su `aria-label` y en la ficha.
- **Niebla y radar base:** el mundo arranca cubierto. Desde Campo Garza, la ciudad más cercana al centro, un haz da
  una vuelta, despeja un círculo, el 17 % de la isla, y se apaga. Solo las señales que detecta existen como botones:
  aparecen con un ping, se anuncian al lector de pantalla y el rótulo las cuenta ("5 de 40 señales"). Con movimiento
  reducido, el círculo se despeja de una vez.

## Arquitectura y Stack

| Pieza             | Elección                                                              | Por qué                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript estricto | Lo pide la consigna                                                                                                                                                                          |
| Mapa              | `maplibre-gl` 6.18, directo en un Client Component                    | Capas, cámara y marcadores contra la API de MapLibre, sin envoltorios                                                                                                                        |
| Mundo             | `simplex-noise` + `d3-contour`, calculado una vez en el build         | Página estática; al navegador viajan solo los polígonos y las señales                                                                                                                        |
| Estilos           | Tailwind 4 con tokens en `src/app/globals.css`                        | Un solo lugar para colores, tipografía y radios                                                                                                                                              |
| Paneles y botones | shadcn sobre Base UI (Sheet, Drawer, Button), reestilados             | Foco, Esc y teclado resueltos; el aspecto es del HUD                                                                                                                                         |
| Animación         | `motion` 14.13 (el nombre actual de Framer Motion) y `tw-animate-css` | `motion` para las barras; transiciones de Tailwind para el panel, `tw-animate-css` para el sprite, CSS para el pulso y el ping de detección, y `requestAnimationFrame` para el haz del radar |

Las decisiones, con sus alternativas y versiones, están en [docs/decisiones.md](docs/decisiones.md). Lo que aprendí de
PokéAPI, en [docs/hallazgos-pokeapi.md](docs/hallazgos-pokeapi.md).

**Servidor y cliente.** `src/app/page.tsx` es un Server Component: genera el mundo, arma el dataset de especies (con
caché sin vencimiento) y ubica las señales. Lo que no debe llegar al navegador lleva `import "server-only"`. El mapa se
carga con `dynamic(..., { ssr: false })`, el tip de la consigna, que no dice dónde va: la documentación de Next 16.4
dice que `ssr: false` da error en un Server Component, así que vive en un Client Component que envuelve al mapa
([docs/decisiones.md](docs/decisiones.md), sección 3). La ficha pide los datos desde el navegador, al identificar.

```
src/app/                   layout, página (servidor) y estilos globales
src/components/map/        mapa, señales, cámara, carga y error
src/components/radar/      niebla y radar base: el canvas de la niebla, el haz y la detección
src/components/hud/        sala de monitoreo: rótulo de la esquina, aviso de detecciones y su estado
src/components/dossier/    ficha de inteligencia: panel, cuerpo, sprite, texto revuelto
src/components/ui/         componentes de shadcn con los tokens del HUD
src/hooks/                 identificación con caché y cancelación; media queries
src/lib/pokeapi/           tipos, guards y cliente tipado de PokéAPI
src/lib/world/             generación del mundo (ruido, biomas, polígonos)
src/lib/geo/               encuadre y ubicación de las señales
docs/                      consigna, concepto, decisiones, hallazgos, errores y flujo
```

## Uso de Inteligencia Artificial (AI-Native Workflow)

**Herramientas.** Usé Claude Code, con Claude Opus 5.5, para escribir código, documentación y mensajes de commit. Para
medir y sacar capturas, Chrome headless manejado por scripts. `next-devtools-mcp` quedó configurado en `.mcp.json`,
pero no lo usé.

La regla fue que antes de editar me contara un plan corto y esperara mi OK. Hubo una excepción, pedida por mí: la noche
del 13/11 lo dejé avanzar solo con una lista de tareas, sin pushear. Fueron 14 commits, de 00:41 a 02:30: los arreglos
de la review del PR #3 y la ficha entera. A la mañana leí su informe, aprobé las entradas de errores que había dejado
en borrador y elegí dos arreglos más (el respaldo cuando una especie no trae sprite y el rótulo de la esquina a 768
px). Después, la review del PR #4 encontró ocho problemas; el único mayor venía de esa noche: la ficha no animaba su
entrada (E-18).

**Cómo la dirigí.** Las reglas están en [CLAUDE.md](CLAUDE.md) y en `.claude/`, públicas a propósito:

- **Pasos chicos con mi OK:** antes de editar, el plan; después, qué hizo y por qué. Nada de push, PR ni merge sin mi
  OK.
- **Hooks:** ESLint sobre cada `.ts` o `.tsx` editado y `pnpm typecheck` al terminar cada turno.
- **`/verificar`:** lint, typecheck, build y capturas en 390, 768 y 1440 px con los errores de consola, en Chrome
  headless.
- **`/pr-review`:** el análisis de cada PR lo hace un subagente nuevo, de solo lectura y sin la conversación donde se
  escribió el código, para que vea el código y no las razones de quien lo escribió.
- **Medir antes de afirmar:** lo que un comentario, un commit o un PR dice del comportamiento se prueba antes, o dice
  "sin probar".

**Dónde se equivocó y cómo lo corregí.** Todo está en [docs/errores.md](docs/errores.md), con síntoma, causa, cómo se
detectó, arreglo y prevención. De las 24 entradas, 22 son errores de la IA. Los que más me enseñaron:

- **Afirmar sin medir, o de memoria,** fue el error más repetido (E-03, E-05, E-08, E-09, E-10, E-11, E-12, E-13, E-15,
  E-18, E-19, E-21, E-22, E-23 y E-24). Por ejemplo, dijo que las señales cumplían WCAG 2.5.8 sin medir: quedaban a
  23,3 px entre centros (E-10); que sin WebGL "el mapa no se dibuja y no hay un mensaje propio", cuando se caía la página
  entera (E-11); y que la ficha entraba deslizándose, cuando aparecía de golpe (E-18). En diez de esos quince sumé una
  prevención; E-12, E-15, E-22, E-23 y E-24 ya los cubría una anterior. Una de ellas es la línea de `CLAUDE.md` que
  obliga a probar o a escribir "sin probar".
- **Dimensionar mal:** planificó con las "3 a 4 horas" de la consigna en lugar del tiempo real que yo tenía; lo
  corregí (E-01).
- **Comandos de Windows:** me pasó un `taskkill` con flags que, probablemente, Git Bash convirtió en rutas (E-02).
- **Cambios que rompen otra cosa:** el arreglo del cartel de carga dejó el mapa enfocable con Tab debajo del cartel
  (E-14). Al rehacer la página para el mapa, el rótulo de la esquina quedó por debajo de 4,5:1 de contraste sobre
  cuatro biomas y la página perdió su `<h1>` (E-16).
- **Librerías:** MapLibre v6 con Turbopack se quedaba sin su worker (E-07), y su cámara recorta el destino con el padding
  anterior, lo que dejaba la señal debajo de la ficha (E-17). Las dos se confirmaron midiendo.

Quién detectó las 24: la review delegada (`/pr-review`), que disparo yo y después de la cual decido qué se arregla,
encontró 11; yo, 2; y la propia IA, otras 11: midiendo, mirando capturas o releyendo.

## Próximos Pasos

Este README describe `v0.1.0` y lo que se sumó después. El plan sigue hasta el cierre del sábado 14/11
([docs/decisiones.md](docs/decisiones.md), sección 8): al cerrar `v1.0.0`, lo que se haya hecho pasa a las secciones
de arriba y acá queda lo que no entró.

En el plan, en este orden, está el resto del concepto ([docs/concepto.md](docs/concepto.md)):

- **Antenas:** el operador instala de 3 a 5 puestos de radar para despejar más terreno y detectar más señales.
- **HUD de instrumento** con cobertura por región, y un **onboarding** de tres pasos con el arranque del sistema.
- **Tripulación y avisos** con prioridades; eventos del mundo (shiny, enjambres, día y noche, clima con Open-Meteo).
- **Bitácora, compartir por URL** (`?modo=mundo&p=25`), informe exportable, fin de turno y geocercas.
- **Modo híbrido:** el mismo radar sobre un mapa real.
- **Sonido y atajos de teclado.**

Con una semana más, además del plan:

- **Calidad:** pruebas con lector de pantalla y en Safari, Firefox y teléfonos reales, que hoy faltan; pruebas
  automatizadas de las interacciones del mapa.
- **Nombres de lugares para el lector de pantalla:** se dibujan en el mapa, que el lector no lee, y los lagos no
  aparecen en ninguna etiqueta. Falta una lista oculta de los lugares, o sumar el sector del mundo a la etiqueta de
  cada señal.
- **Menos cálculo en el navegador:** el lado de cada nombre y el lugar de cada señal dependen solo del build; se pueden
  calcular en el servidor.
