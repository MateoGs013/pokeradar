---
paths:
  - "src/components/map/**"
  - "src/components/radar/**"
---

# Mapa y radar

- Todo acá es código de cliente (`"use client"`). La carga diferida con `dynamic(..., { ssr: false })` vive en un
  Client Component que envuelve al mapa, nunca en un Server Component.
- El mapa se crea una sola vez (en un efecto) y se destruye con `map.remove()` al desmontar.
  Nada de recrearlo cuando cambian props: se actualizan fuentes y capas.
- Lo que son muchos elementos va como **capas**: los biomas con fuentes GeoJSON, la niebla con una fuente `canvas`
  (docs/decisiones.md, "Niebla"). Marcadores DOM solo para decenas como mucho: las señales (un `<button>` dentro de un
  `Marker`; docs/decisiones.md, "Señales"), las antenas y el haz de cada radar.
- El contenedor de los marcadores (`getCanvasContainer()`) también tiene el canvas del mapa, primero: un elemento que
  se mueve ahí va después del canvas (`map.getCanvas().after`), o el mapa lo tapa. Lo que se afirma de su lugar
  (encima o debajo de algo) se comprueba en una captura, no en el orden del DOM (E-26).
- La niebla es una **capa del mapa** (máscara), no elementos HTML encima del canvas.
- Cámara: `flyTo` con `padding` según el panel abierto (lateral en desktop, abajo en mobile). Con movimiento reducido,
  `jumpTo` con el mismo destino y padding.
- Barrido y pulsos: sin animación cuando hay `prefers-reduced-motion`.
- Importar el CSS de MapLibre: `import "maplibre-gl/dist/maplibre-gl.css"`.
- El div que recibe el mapa no lleva clases de posición: el CSS de MapLibre le gana a Tailwind; van en un div de
  afuera.
- Cada señal accesible: `<button>` con `aria-label` descriptivo y foco visible.
- Listeners de MapLibre (`map.on`) siempre con su `map.off` en la limpieza.
