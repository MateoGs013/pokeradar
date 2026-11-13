// La cámara de la ficha. Al abrirla vuela hasta la señal y la deja en la parte del mapa que el
// panel no tapa: en el centro, salvo que el límite del mapa la corra (docs/concepto.md, "Señales e
// identificación"). Con movimiento reducido salta al mismo destino con jumpTo (docs/concepto.md,
// sección 12).
import type { JumpToOptions, Map as MapLibreMap } from "maplibre-gl";

import {
  PANEL_DESKTOP_QUERY,
  PANEL_HEIGHT_PERCENT,
  PANEL_WIDTH,
} from "@/components/dossier/panel-size";
import type { Bounds } from "@/lib/geo/bounds";
import type { Position } from "@/lib/world/types";

/** Cuántos niveles se acerca la cámara, como mínimo, respecto del mundo entero. */
const FOCUS_ZOOM_STEP = 1;

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const NO_PADDING: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Lo que tapa la ficha: el costado derecho en escritorio, la parte de abajo en el celular. */
function panelPadding(map: MapLibreMap): Insets {
  if (window.matchMedia(PANEL_DESKTOP_QUERY).matches) {
    return { ...NO_PADDING, right: PANEL_WIDTH };
  }
  const { clientHeight } = map.getContainer();
  return { ...NO_PADDING, bottom: (clientHeight * PANEL_HEIGHT_PERCENT) / 100 };
}

/**
 * Pone el padding sin mover la vista. flyTo y jumpTo ajustan el destino al límite del mapa con el
 * padding que el mapa tiene al empezar, y recién después ponen el nuevo (maplibre-gl:
 * handleFlyTo en src/geo/projection/mercator_camera_helper.ts, y jumpTo en src/ui/camera.ts). Sin
 * este paso, a 768 px una señal del borde quedaba debajo del panel o fuera de la pantalla
 * (medido). El centro pasa a ser el punto que ya se veía en el medio de la parte libre, así que la
 * vista queda donde estaba.
 */
function setPaddingInPlace(map: MapLibreMap, padding: Insets) {
  const { clientWidth, clientHeight } = map.getContainer();
  const freeCenter = map.unproject([
    (padding.left + clientWidth - padding.right) / 2,
    (padding.top + clientHeight - padding.bottom) / 2,
  ]);
  map.setPadding(padding);
  map.setCenter(freeCenter);
}

/**
 * Lleva la cámara a la señal. El padding le dice a MapLibre qué parte del mapa tapa la ficha: el
 * centro va al resto, y el padding queda puesto hasta que otro movimiento lo cambie. Se acerca un
 * nivel más que el mundo entero, salvo que ya esté más cerca.
 */
export function focusSignal(
  map: MapLibreMap,
  world: Bounds,
  position: Position,
  {
    animate = true,
    keepZoom = map.getZoom(),
  }: {
    animate?: boolean;
    /** El zoom que no tiene que bajar: por defecto, el actual. */
    keepZoom?: number;
  } = {},
) {
  // absolutePadding: el zoom del mundo entero en toda la pantalla, sin el padding que tenga el mapa.
  const worldZoom =
    map.cameraForBounds(world, { absolutePadding: true })?.zoom ??
    map.getZoom();
  const padding = panelPadding(map);
  setPaddingInPlace(map, padding);
  const camera: JumpToOptions = {
    center: position,
    zoom: Math.max(keepZoom, worldZoom + FOCUS_ZOOM_STEP),
    padding,
  };
  if (animate && !prefersReducedMotion()) map.flyTo(camera);
  else map.jumpTo(camera);
}

/** Al cerrar la ficha, el mapa vuelve a usar toda la pantalla: se saca el padding. */
export function releaseFocus(map: MapLibreMap) {
  if (prefersReducedMotion()) map.jumpTo({ padding: NO_PADDING });
  else map.easeTo({ padding: NO_PADDING });
}
