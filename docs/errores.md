# Registro de errores

Solo hechos reales: errores de la IA, míos, de librerías, de APIs externas o del entorno que aparecieron
mientras se construía el proyecto. Nunca se inventan ni se adornan entradas. La sección "Uso de IA" del
README sale de las entradas con origen **IA**.

Para agregar una entrada se puede usar `/registrar-error`.

## Índice

| Id   | Fecha      | Origen | Área  | Resumen                                                                                               |
| ---- | ---------- | ------ | ----- | ----------------------------------------------------------------------------------------------------- |
| E-01 | 2026-11-12 | IA     | docs  | Dimensionó el alcance con las "3 a 4 horas" de la consigna en vez del tiempo real disponible          |
| E-02 | 2026-11-12 | IA     | docs  | Pasó un comando de taskkill con flags `/X`, que Git Bash convierte en rutas                           |
| E-03 | 2026-11-12 | IA     | data  | Un comentario daba un motivo falso para descartar las formas alternativas en el dataset               |
| E-04 | 2026-11-12 | IA     | world | Intentó liberar el borde del mapa endureciendo la caída, sin ver que el mar está fijado por percentil |

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
- **Arreglo:** un hundimiento propio en las últimas 10 celdas de cada borde (`borderSink` en `fields.ts`), mayor que
  cualquier valor del ruido. Antes de commitear, en el PR del mundo generado.
- **Prevención:** el comentario de `HEIGHT_SHARES` en `src/lib/world/biomes.ts` explica que las proporciones son fijas
  y que el borde de mar se garantiza con `borderSink`, no con la caída.
