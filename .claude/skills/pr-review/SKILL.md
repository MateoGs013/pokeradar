---
name: pr-review
description: Review estructurada de un PR de PokéRadar. Chequeos mecánicos, análisis cualitativo delegado a un subagente de solo lectura y un único comentario en el PR con gh pr comment. Nunca aprueba, mergea ni cierra.
disable-model-invocation: true
argument-hint: "<número de PR>"
---

# Review de un PR de PokéRadar

PR a revisar: **#$ARGUMENTS**

Resultado: **un solo comentario** en el PR con `gh pr comment`. No se aprueba, no se mergea, no se cierra y no se
modifican archivos del repo durante la review.

Los PRs de este repo los escribe Mateo con Claude: el análisis cualitativo **siempre** va a un subagente nuevo, sin
el contexto de esta conversación, para que vea el código y no las razones de quien lo escribió.

## Fase 0: estado de git fresco (obligatoria)

```bash
gh auth status
git status --short              # tiene que estar limpio; si no, frenar y avisar
git fetch origin
git log --oneline origin/main..main   # tiene que estar vacío
git log --oneline main..origin/main   # tiene que estar vacío
```

Si `main` local difiere de `origin/main`, frenar: `git switch main` y `git pull --rebase`, y recién ahí seguir.
Comparar contra un `main` viejo genera hallazgos falsos.

## Fase 1: contexto

```bash
gh pr view $ARGUMENTS --json number,title,body,author,state,baseRefName,headRefName,additions,deletions,changedFiles,files,commits
gh pr view $ARGUMENTS --comments
gh pr checks $ARGUMENTS
```

- Si el PR está mergeado o cerrado, frenar.
- Anotar reviews anteriores para cerrarlas explícitamente en el comentario.
- Guardar el diff (usar el scratchpad de la sesión si existe; si no, `$TMPDIR`):
  ```bash
  gh pr diff $ARGUMENTS > "$TMP/pr-$ARGUMENTS.diff"
  gh pr diff $ARGUMENTS --name-only > "$TMP/pr-$ARGUMENTS.files"
  ```

## Fase 2: chequeos mecánicos (antes de leer el diff)

1. **Lint, typecheck y build sobre el código del PR:**
   ```bash
   gh pr checkout $ARGUMENTS
   pnpm install --frozen-lockfile
   pnpm lint && pnpm typecheck && pnpm build
   ```
   Cualquier falla es **blocker**. Cruzar con `gh pr checks` (CI).
2. **Greps sobre las líneas agregadas** (`^\+`, sin `+++`):
   ```bash
   grep -nE '^\+' "$TMP/pr-$ARGUMENTS.diff" | grep -vE '^\S*\+\+\+' > "$TMP/pr-$ARGUMENTS.added"
   grep -nE ':\s*any\b|<any>|\bas any\b|any\[\]' "$TMP/pr-$ARGUMENTS.added"          # any
   grep -nE 'as unknown as' "$TMP/pr-$ARGUMENTS.added"
   grep -nE '@ts-(ignore|expect-error|nocheck)' "$TMP/pr-$ARGUMENTS.added"
   grep -nE 'eslint-disable' "$TMP/pr-$ARGUMENTS.added"
   grep -nE 'console\.log' "$TMP/pr-$ARGUMENTS.added"
   grep -niE '(sk-[a-z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}|api[_-]?key\s*[:=]\s*["'\''][^"'\'']+|secret\s*[:=]\s*["'\''])' "$TMP/pr-$ARGUMENTS.added"
   grep -E '(^|/)\.env' "$TMP/pr-$ARGUMENTS.files"
   ```
3. **Commits:** `gh pr view $ARGUMENTS --json commits --jq '.commits[].messageHeadline'`.
   Formato `tipo(scope): descripción` en español e imperativo (`agregar`, no `agregando` ni `agregado`).
   Scopes válidos: `data`, `world`, `map`, `radar`, `hud`, `dossier`, `onboarding`, `crew`, `sound`, `ui`, `docs`,
   `ci`, `deps`.
4. **`"use client"` donde no hace falta:** para cada archivo del PR con `"use client"`, verificar que use estado,
   efectos, refs, manejadores de eventos, APIs del navegador (`window`, `document`, `localStorage`) o una librería
   de cliente (`maplibre-gl`, `motion/react`). Si no usa nada de eso, es candidato a hallazgo.
5. **`server-only` donde sí hace falta:** los módulos de `src/lib/world/` y los que arman el dataset tienen que tener
   `import "server-only"`. Y ningún archivo con `"use client"` puede importarlos.
6. **Dependencias:** si cambia `package.json`, cada dependencia nueva tiene que estar en `docs/decisiones.md`.

Volver a `main` al terminar (higiene, obligatorio):

```bash
git switch main
git branch -D <rama-del-pr>   # la rama local que creó gh pr checkout
```

## Fase 3: análisis cualitativo delegado

Lanzar un subagente con la herramienta Agent, `subagent_type: "Plan"`: no tiene Edit ni Write, así que la solo
lectura queda garantizada por sus herramientas, y no hereda esta conversación.
El prompt es **autocontenido** y lleva, pegado completo:

- la metadata del PR y su descripción;
- el diff completo;
- `CLAUDE.md`;
- las reglas de `.claude/rules/` cuyos `paths` coinciden con los archivos del PR;
- `docs/consigna.md`, `docs/concepto.md` y `docs/decisiones.md`;
- los resultados de la Fase 2.

Le pide revisar, citando `archivo:línea` y el texto exacto del diff:

- la consigna y su rúbrica (qué requisito del MVP toca y si lo cumple);
- el concepto (si el cambio lo respeta o lo contradice sin decirlo);
- las reglas de `.claude/rules/` que apliquen;
- accesibilidad: interactivos como `<button>`, `aria-label`, foco visible, teclado, Esc;
- movimiento reducido en CSS, `motion`, radar, niebla y cámara (`jumpTo`);
- estados de carga, vacío y error;
- saltos de layout (skeletons del tamaño final, imágenes con dimensiones);
- tokens: nada de colores o tamaños sueltos fuera de `globals.css`;
- componentes de shadcn reestilados con los tokens del HUD, no con su aspecto por defecto;
- qué viaja al navegador (Client Components grandes, datos que deberían quedarse en el servidor);
- coherencia entre `docs/decisiones.md` y el código;
- lo que dice la descripción del PR contra los archivos reales (la descripción cuenta intenciones; los archivos, hechos).

Formato pedido al subagente: lista de hallazgos con severidad, `archivo:línea`, cita textual en bloque de código,
por qué es un problema (regla o requisito que rompe) y arreglo sugerido en 1 a 3 líneas. Si no hay hallazgos de
una severidad, decirlo. Prohibido inventar hallazgos para llenar.

## Fase 4: verificar los hallazgos

Antes de postear, comprobar cada hallazgo del subagente: que el `archivo:línea` exista y que la cita sea textual
(`grep -n` sobre el diff o el archivo). Descartar los que no se puedan comprobar.
Si un hallazgo es un error real, preparar la entrada sugerida para `docs/errores.md` (formato del archivo).

## Fase 5: comentario

Guardar en `$TMP/pr-$ARGUMENTS-review.md` y postear con `gh pr comment $ARGUMENTS --body-file "$TMP/pr-$ARGUMENTS-review.md"`.

```md
> **Review delegada a un subagente de solo lectura.** El autor del PR coincide con quien opera la review: el análisis
> cualitativo se hizo en un contexto nuevo, sin la conversación donde se escribió el código. La revisión humana sigue
> siendo necesaria antes de mergear.

## Review de #<n>: <título>

**Veredicto:** sin blockers ni mayores | cambios pedidos | bloqueado

### Chequeos mecánicos

| Chequeo                                           | Estado                |
| ------------------------------------------------- | --------------------- |
| lint / typecheck / build                          | OK / FAIL             |
| CI                                                | OK / FAIL / pendiente |
| `any`, `as unknown as`, `@ts-*`, `eslint-disable` | OK / FAIL             |
| `console.log` y secretos                          | OK / FAIL             |
| Commits (Conventional en español, scope válido)   | OK / FAIL             |
| `"use client"` / `server-only`                    | OK / WARN             |
| Dependencias anotadas en decisiones.md            | OK / FAIL             |

### Hallazgos

#### 1. <blocker|mayor|menor> · `archivo:línea` · título corto

Cita textual en bloque de código. Por qué. Arreglo sugerido.

### Cierre de reviews anteriores (si hubo)

| # | Estado | Evidencia (link al comentario) |

### Para docs/errores.md (si aplica)

Entrada sugerida con el formato del archivo.
```

## Severidades

- **blocker:** falla lint, typecheck, build o CI; `any`, `as unknown as` o `@ts-ignore` agregados; secreto o `.env`
  en el diff; un requisito del MVP de la consigna roto; un módulo `server-only` importado desde el cliente; una
  dependencia nueva sin anotar en `docs/decisiones.md`. Bloquea el merge.
- **mayor:** rompe una convención de CLAUDE.md o una regla de `.claude/rules/`: sin movimiento reducido, sin estados
  de carga o error, interactivos inaccesibles, `"use client"` innecesario en un árbol grande, tokens sueltos repetidos,
  shadcn con su aspecto por defecto, saltos de layout, decisiones.md y código que no coinciden, descripción del PR
  falsa. Se arregla antes del merge.
- **menor:** nombres, duplicación chica, `console.log` olvidado, redacción de docs. Se arregla o va a un issue.

## Tono

- Español rioplatense, con voseo. Código, rutas y nombres técnicos en inglés tal cual están.
- Sin emojis, sin halagos y sin relleno. Si no hay hallazgos de una severidad, decirlo.
- Siempre `archivo:línea` y cita textual; nunca parafrasear código. Si se interpreta una intención: "asumo que…".

## Antes de postear

- [ ] Fase 0 hecha: `main` local igual a `origin/main`.
- [ ] Chequeos mecánicos corridos y de vuelta en `main`.
- [ ] Hallazgos comprobados (Fase 4); ninguno inventado.
- [ ] Veredicto al principio, banner de review delegada presente.
- [ ] Un solo comentario. No se aprobó, mergeó ni cerró nada.
