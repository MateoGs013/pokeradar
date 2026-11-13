---
name: verificar
description: Verificación antes de cada commit importante y antes de abrir un PR. Corre lint, typecheck y build, levanta la app y saca capturas en 390, 768 y 1440 px con los errores de consola. Usar cuando se pide verificar, o como paso 1 del ciclo de PR.
---

# Verificar

Reporta; no corrige. Si algo falla, contale a Mateo qué y proponé el arreglo (CLAUDE.md: pasos chicos con OK).

## 1. Chequeos estáticos

Correr en orden y frenar en el primero que falle (mostrar la salida relevante):

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## 2. Capturas y consola

```bash
node .claude/skills/verificar/capturar.mjs          # la home
node .claude/skills/verificar/capturar.mjs "?modo=mundo&p=25"   # otra ruta (en Git Bash, sin "/" inicial)
```

El script (sin dependencias) se encarga solo del servidor: levanta el build de producción con `next start` en el
puerto 3100 (lo más parecido a Vercel, y sin chocar con un `pnpm dev` abierto), y lo cierra al terminar aunque algo
falle. No uses `pnpm start` en segundo plano: en Windows, detener esa tarea deja vivo el proceso de Node. Si el 3100
ya responde, el script frena en vez de capturar un build viejo.

Abre Chrome o Edge headless, se conecta por el protocolo de DevTools y, para cada ancho (390×844 y 768×1024
emulando móvil, 1440×900 escritorio), carga la página, espera 4 s, guarda `.verificar/captura-<ancho>.png` y
devuelve un JSON con:

- `anchoReal`: el `innerWidth` medido (tiene que coincidir con el ancho pedido);
- `desbordaHorizontal`: `true` si hay scroll horizontal (`scrollWidth > innerWidth`);
- `errores`: `console.error`, `console.warn`, excepciones no capturadas y errores de red del navegador.

Si no encuentra el navegador, definir `CHROME_PATH`. Para una URL externa sin servidor (por ejemplo, la vista previa
de Vercel): `VERIFICAR_URL=<url> node .claude/skills/verificar/capturar.mjs`.

## 3. Revisar

- Abrir cada PNG con la herramienta Read y mirarlo de verdad: textos cortados o superpuestos, elementos fuera de
  pantalla, HUD tapando el mapa, contraste, paneles abajo en mobile y al costado en desktop, aspecto de template.
- Cruzar con el JSON: `desbordaHorizontal`, `anchoReal` distinto del pedido, cualquier error de consola.
- Si el cambio toca animaciones, mencionar que el movimiento reducido no se cubre con estas capturas y cómo probarlo
  (DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`).
- Si el cambio agrega o toca una animación (un panel que entra, una transición, un sprite), las capturas muestran solo
  el estado final: medir también la entrada, cuadro por cuadro desde el disparo, y la duración real contra la que
  dicen los comentarios y la descripción del PR (E-18).

## 4. Limpiar

Confirmar que los puertos quedaron libres (`netstat -ano | grep -E "[:.](3100|9333)\s"` sin `LISTENING`).
`.verificar/` está en `.gitignore`.

## 5. Reporte

```md
## Verificación

| Paso                     | Resultado                  |
| ------------------------ | -------------------------- |
| lint / typecheck / build | ok o error (con la salida) |
| 390 / 768 / 1440         | ok o problemas vistos      |
| Consola                  | sin errores o la lista     |

Problemas visuales: …
Propuesta de arreglo: … (esperando OK)
```

Si un problema es un error real (de la IA, de una librería, del entorno), sugerir la entrada para `docs/errores.md`.
