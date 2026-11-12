---
name: registrar-error
description: Agrega una entrada real a docs/errores.md con el formato del archivo. La invoca Mateo cuando aparece un error.
disable-model-invocation: true
argument-hint: "[descripción breve del error]"
---

# Registrar un error

Descripción que pasó Mateo: $ARGUMENTS

Regla de oro: **no inventar nada.** Cada campo sale de un hecho que se puede señalar (la conversación, git, un
archivo, una salida de comando) o de lo que conteste Mateo. Si un campo no se sabe, se pregunta.

## 1. Leer el formato

Leer `docs/errores.md`: el formato de entrada, los valores válidos de origen y área, y el último número usado
(la entrada nueva es el siguiente: E-01, E-02…).

## 2. Completar lo que se sabe

- **Fecha y hora:** `date "+%Y-%m-%d %H:%M"`.
- **Commit y archivos:** `git log -1 --format="%h %s"`, `git status --short` y, si aplica, `git diff --stat`.
- **Síntoma, causa, detección y arreglo:** solo si están en la conversación o en un resultado concreto (salida del
  hook, del typecheck, del CI, de `/pr-review`, de la vista previa). Citar la salida tal cual cuando ayude.
- **Origen:** `IA`, `mío`, `librería`, `API externa` o `entorno`. Si el error lo cometió Claude, el origen es `IA`
  aunque lo haya detectado un hook.
- **Área:** uno de los scopes de commits (`data`, `world`, `map`, `radar`, `hud`, `dossier`, `onboarding`, `crew`,
  `sound`, `ui`, `docs`, `ci`, `deps`).

## 3. Preguntar lo que falta

En una sola pregunta (con AskUserQuestion si alcanza con opciones), pedir solo los campos que no se pudieron
completar en el paso 2. Si Mateo no sabe la causa, se escribe "Causa sin confirmar: …" con lo que sí se sabe;
nunca una causa supuesta presentada como cierta.

## 4. Prevención

Cada entrada termina con una prevención concreta o con "ninguna" y el porqué.
Si la prevención es una regla (`.claude/rules/`), una línea de CLAUDE.md, un hook o un chequeo (CI, `/pr-review`,
`/verificar`), **proponer el cambio exacto** (archivo y texto) y esperar el OK antes de aplicarlo.

## 5. Escribir

- Agregar la entrada al final de la sección "Entradas" (quitar "Sin entradas todavía." si estaba).
- Agregar la fila al índice: `| E-NN | AAAA-MM-DD | origen | área | resumen de una línea |`.
- Mostrar la entrada final a Mateo. No commitear sin su OK; el commit sugerido es
  `docs(docs): registrar E-NN <resumen>`.
