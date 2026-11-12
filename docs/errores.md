# Registro de errores

Solo hechos reales: errores de la IA, míos, de librerías, de APIs externas o del entorno que aparecieron
mientras se construía el proyecto. Nunca se inventan ni se adornan entradas. La sección "Uso de IA" del
README sale de las entradas con origen **IA**.

Para agregar una entrada se puede usar `/registrar-error`.

## Índice

| Id   | Fecha      | Origen | Área | Resumen                                                                                      |
| ---- | ---------- | ------ | ---- | -------------------------------------------------------------------------------------------- |
| E-01 | 2026-11-12 | IA     | docs | Dimensionó el alcance con las "3 a 4 horas" de la consigna en vez del tiempo real disponible |

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
