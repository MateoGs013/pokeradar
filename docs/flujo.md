# Flujo del repo

## Ramas

- Nombre `tipo/descripcion`, por ejemplo `feat/ficha-inteligencia` o `fix/niebla-mobile`.
- Siempre desde `main` actualizado:
  ```bash
  git switch main
  git pull --rebase
  git switch -c feat/descripcion
  ```

## Commits

- **Atómicos:** un cambio lógico por commit, que pasa `pnpm lint` y `pnpm typecheck`.
- **Conventional Commits en español**, en imperativo y con scope: `feat(map): agregar cámara con flyTo`.
- **Scopes:** `data`, `world`, `map`, `radar`, `hud`, `dossier`, `onboarding`, `crew`, `sound`, `ui`, `docs`, `ci`, `deps`.
- Se commitea mientras se trabaja, sin reescribir la historia para que parezca otra.
- El trailer `Co-Authored-By` de Claude se mantiene en los commits donde participó.
- Antes de abrir el PR se puede ordenar la rama (juntar o reordenar commits propios). Después de abrirlo, cada arreglo
  de la review es un commit nuevo.

## El ciclo de PR

1. `/verificar`.
2. Push de la rama.
3. Abrir el PR con la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`).
4. Esperar el CI y la vista previa de Vercel.
5. Mateo corre `/pr-review <n>`.
6. Se arreglan los blocker y los mayores; los menores se arreglan o van a un issue.
7. Si `main` avanzó: `git fetch`, `git rebase origin/main` y `git push --force-with-lease`, solo sobre la rama propia.
8. Merge con `gh pr merge <n> --rebase --delete-branch`, con el OK de Mateo.
9. Volver a `main` actualizado: `git switch main` y `git pull --rebase`.

Push, PR, merge, crear el repo y deployar: siempre con OK explícito de Mateo en el chat.

## Versiones

- `v0.1.0`: MVP de la consigna completo y deployado.
- `v1.0.0`: entrega.
- Se crean con `gh release create vX.Y.Z --generate-notes` sobre `main` actualizado, con OK de Mateo.
