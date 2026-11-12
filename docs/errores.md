# Registro de errores

Solo hechos reales: errores de la IA, míos, de librerías, de APIs externas o del entorno que aparecieron
mientras se construía el proyecto. Nunca se inventan ni se adornan entradas. La sección "Uso de IA" del
README sale de las entradas con origen **IA**.

Para agregar una entrada se puede usar `/registrar-error`.

## Índice

| Id  | Fecha | Origen | Área | Resumen |
| --- | ----- | ------ | ---- | ------- |

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

Sin entradas todavía.
