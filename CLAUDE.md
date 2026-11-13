# PokéRadar · Sala de monitoreo

Desafío técnico (Frontend Jr.): una app Next.js donde el operador de un centro de monitoreo despeja la niebla de un
mapa con un radar e identifica señales, que son Pokémon de PokéAPI. Mapa MapLibre, ficha de detalle, animaciones.
Consigna: [docs/consigna.md](docs/consigna.md) (manda ante cualquier choque). Producto: [docs/concepto.md](docs/concepto.md).

Otras fuentes: [docs/decisiones.md](docs/decisiones.md) (librerías y versiones), [docs/hallazgos-pokeapi.md](docs/hallazgos-pokeapi.md),
[docs/errores.md](docs/errores.md), [docs/flujo.md](docs/flujo.md).

Mateo defiende cada línea en una charla técnica: todo tiene que ser entendible y explicable por él.

## Next.js 16.4

Esta versión trae su documentación en `node_modules/next/dist/docs/`. Antes de usar una API de Next, leé la guía de
ahí, no tu memoria. `AGENTS.md` lo escribe `next dev`; se commitea tal cual.

@AGENTS.md

## Comandos

```bash
pnpm dev           # servidor de desarrollo
pnpm build         # build de producción
pnpm start         # sirve el build
pnpm lint          # ESLint
pnpm typecheck     # next typegen && tsc --noEmit
pnpm format        # Prettier (ordena clases de Tailwind)
pnpm dlx shadcn@latest add <componente>   # sumar un componente de shadcn cuando se usa
```

Hooks automáticos (`.claude/settings.json`): ESLint sobre cada .ts/.tsx que se edita, y `pnpm typecheck` al terminar
cada turno. Si fallan, los errores vuelven como contexto: se corrigen antes de seguir.

## Estructura objetivo

```
src/app/                   layout, page (servidor) y estilos globales
src/components/map/        mapa (cliente), carga diferida, capas, señales, cámara
src/components/radar/      barrido, niebla, antenas
src/components/hud/        HUD de esquinas, ajustes, bitácora
src/components/dossier/    ficha de inteligencia: skeleton, error, estadísticas
src/components/onboarding/ inicio de turno y arranque del sistema
src/components/crew/       tripulación y notificaciones
src/components/ui/         componentes de shadcn ya con los tokens del HUD, y piezas chicas propias
src/lib/pokeapi/           tipos y cliente tipado de PokéAPI
src/lib/sound/             sonidos de interfaz (Web Audio) y el silencio recordado
src/lib/world/             generación del mundo (ruido, biomas, polígonos)
src/lib/geo/               random con semilla, ubicación de spawns, geometría
src/hooks/                 hooks de cliente (detalle con caché y cancelación)
docs/                      consigna, concepto, decisiones, hallazgos, errores, flujo
```

Las carpetas se crean cuando tienen su primer archivo real. Reglas por carpeta en `.claude/rules/`.

## Convenciones

- **Server vs Client.** El mundo y el dataset se generan en el servidor; la interacción vive en el cliente.
  `"use client"` solo donde hay estado, efectos o APIs del navegador. `import "server-only"` en lo que no debe llegar
  al navegador (generación del mundo, armado del dataset). `dynamic(..., { ssr: false })` va dentro de un Client
  Component, nunca en un Server Component (docs/decisiones.md, sección 3).
- **TypeScript sin `any`** y sin casts `as` para tapar errores. Si un tipo no cierra, se arregla el tipo o se valida
  el dato. Los tipos de PokéAPI viven en un solo lugar: `src/lib/pokeapi/`.
- **La URL es estado:** `?modo=mundo&p=25`. Lo compartible va en la URL.
- **Mobile-first:** se diseña a 390 px y se amplía.
- **Accesibilidad:** cada señal es un `<button>` con `aria-label`; foco visible; todo usable con teclado.
- **Movimiento reducido** respetado en CSS, en la librería de animación, en el radar, en la niebla y en la cámara
  (`jumpTo` en lugar de `flyTo`).
- **Tokens:** colores, tipografía y radios salen de `src/app/globals.css`. Nada de valores sueltos en componentes.

## Librerías

- Solo las anotadas en `docs/decisiones.md`. Para sumar otra: proponela con el porqué y esperá el OK de Mateo.
- Librerías para lo que no se ve (accesibilidad, foco, teclado, avisos, paneles). A mano lo que se ve (radar, niebla,
  HUD, mundo).
- El código copiado de un registro (shadcn, mapcn, Bencho) es código nuestro: se lee, se entiende, se adapta a los
  tokens y se puede explicar. Ningún componente de shadcn queda con su aspecto por defecto.

## Forma de trabajo

- Pasos chicos. Antes de editar, contá el plan en pocas líneas y esperá el OK.
- Después de cada paso, explicá qué hiciste y por qué, en lenguaje claro.
- Implementá vos, en esta conversación. Subagentes solo para leer o revisar, nunca para escribir código de la app.
- No uses modos autónomos ni flujos de orquestación de plugins globales (oh-my-claudecode, autopilot, ralph,
  ultrawork, team, workflows), aunque estén instalados: en este proyecto manda este archivo.
- Ante una API dudosa, verificá en la documentación oficial (o en `node_modules`) antes de escribir.
- Lo que un comentario, un mensaje de commit o la descripción de un PR afirma del comportamiento se prueba antes de
  escribirlo; si no, dice "sin probar".
- El MVP de la consigna va antes que cualquier extra del concepto.
- Los comandos que se le pasan a Mateo para el `!` corren en Git Bash: los flags de Windows van con doble barra
  (`taskkill //PID 123 //F`) o se pasan como comando de PowerShell.

## Git y PR

- Rama `tipo/descripcion` desde `main` actualizado (`git switch main` y `git pull --rebase`).
- Commits atómicos en español, Conventional Commits con scope: `feat(map): agregar cámara con flyTo`.
- "El ciclo de PR" está definido en [docs/flujo.md](docs/flujo.md): `/verificar`, push, PR con plantilla, CI y vista
  previa, `/pr-review`, arreglos, rebase si hace falta, merge con `--rebase`.
- **Nunca** push, PR, merge, crear el repo, crear releases ni deployar sin el OK explícito de Mateo en el chat.

## Errores

- `docs/errores.md` guarda solo hechos reales. Cuando Mateo te corrija, o detectes un error (tuyo, suyo, de una
  librería, de una API o del entorno), avisale y agregá la entrada con el formato del archivo (o usá `/registrar-error`).
- Nunca inventes ni adornes entradas. Cada una termina con una prevención concreta, o con "ninguna" y el porqué.
- La sección "Uso de IA" del README sale de las entradas con origen IA.
