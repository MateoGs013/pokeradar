---
paths:
  - "src/components/**"
  - "src/app/**"
---

# Interfaz

- Tailwind primero. CSS propio solo para lo que Tailwind no expresa bien (máscaras, keyframes del radar).
- Tokens de diseño en un solo lugar: `src/app/globals.css` (`--hud-*`, incluidos los 3 colores verde, ámbar y cian).
  En componentes se usan las clases del tema (`bg-background`, `text-hud`, `border-border`), nunca hex ni valores sueltos.
- Animaciones con propósito: cada una comunica algo (detección, carga, cambio de estado). Con `motion` se importa de
  `"motion/react"` y se respeta movimiento reducido (`MotionConfig reducedMotion="user"` o `useReducedMotion`).
- Siempre los tres estados: carga (skeleton "Analizando firma…"), vacío y error ("Señal perdida. Reintentar").
- Sin saltos de layout: los skeletons tienen el tamaño del contenido final; las imágenes llevan dimensiones.
- Contraste AA en los tres colores del HUD, también sobre las superficies.
- El texto que va sobre el mapa lleva fondo, o su contraste se mide contra cada bioma (E-16).
- Los componentes de shadcn nunca quedan con su aspecto por defecto: se reestilan con los tokens del HUD.
- Se suman con `pnpm dlx shadcn@latest add <componente>` cuando se usan, y se leen antes de commitearlos.
- Sin librerías de efectos visuales fuera de las anotadas en `docs/decisiones.md`.
- Mobile-first: se diseña a 390 px; paneles abajo en mobile y al costado en desktop.
- Teclado: todo interactivo es alcanzable con Tab, con foco visible, y Esc cierra el panel abierto.
- Un comentario o un doc que diga que algo cumple un criterio de WCAG cita el criterio y una medición; nunca de memoria
  ni con una cuenta.
