"use client";

// Las señales sobre el mapa. Cada una es un Marker de MapLibre, que la mueve con la cámara, con un
// <button> de React adentro, montado con un portal. Son decenas, no cientos: como botones del DOM
// tienen foco, teclado y aria-label sin trabajo extra (docs/decisiones.md, "Señales").
import { type Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { Position, Spawn } from "@/lib/world/types";

import { HABITAT_PLACES } from "./places";

/**
 * Gestos que MapLibre escucha en el contenedor de los marcadores y que no tienen que llegarle
 * desde una señal: sin esto, un doble clic o un doble toque sobre una señal acercaba el mapa. A
 * cambio, un arrastre con el dedo que empieza sobre una señal no mueve el mapa (con el mouse sí).
 */
const MAP_GESTURES = [
  "dblclick",
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel",
] as const;

function stopPropagation(event: Event) {
  event.stopPropagation();
}

/**
 * Hasta dónde llega el contorno del foco desde el centro de una señal: 10 px de radio, 2 de
 * separación y 2 de contorno.
 */
const FOCUS_REACH = 14;

/**
 * Si la señal enfocada no se ve entera, el mapa va hasta ella. Pasa con el mapa acercado: el Tab
 * llega a señales fuera de la vista, y el navegador no puede mostrarlas porque MapLibre vuelve a 0
 * el scroll de su contenedor. `panTo` anima con `easeTo`, que con movimiento reducido no anima
 * (MapLibre pone la duración en 0).
 */
function revealSignal(map: MapLibreMap, position: Position) {
  const { x, y } = map.project(position);
  const { clientWidth, clientHeight } = map.getContainer();
  const visible =
    x >= FOCUS_REACH &&
    x <= clientWidth - FOCUS_REACH &&
    y >= FOCUS_REACH &&
    y <= clientHeight - FOCUS_REACH;
  if (!visible) map.panTo(position);
}

interface SignalMarkersProps {
  map: MapLibreMap;
  spawns: readonly Spawn[];
  selectedId: number | null;
  onSelect: (speciesId: number) => void;
}

export function SignalMarkers({
  map,
  spawns,
  selectedId,
  onSelect,
}: SignalMarkersProps) {
  // Un div por señal, que MapLibre posiciona. Lo comparten el Marker y el portal, así que tiene
  // que ser el mismo mientras el componente viva: useState lo crea una sola vez, al montar
  // (useMemo es una caché, y React puede descartarla). Las señales se ubican al compilar y no
  // cambian. Van de norte a sur: ese es el orden del Tab.
  const [anchors] = useState(() =>
    [...spawns]
      .sort(
        (a, b) =>
          b.position[1] - a.position[1] || a.position[0] - b.position[0],
      )
      .map((spawn) => ({ spawn, element: document.createElement("div") })),
  );

  useEffect(() => {
    const markers = anchors.map(({ spawn, element }) => {
      // passive: no cancelan el gesto, así que el navegador no tiene que esperarlos.
      for (const type of MAP_GESTURES) {
        element.addEventListener(type, stopPropagation, { passive: true });
      }
      return new Marker({ element }).setLngLat(spawn.position).addTo(map);
    });
    return () => {
      for (const marker of markers) marker.remove();
      for (const { element } of anchors) {
        for (const type of MAP_GESTURES) {
          element.removeEventListener(type, stopPropagation);
        }
      }
    };
  }, [map, anchors]);

  return anchors.map(({ spawn, element }) =>
    createPortal(
      <SignalButton
        spawn={spawn}
        selected={spawn.speciesId === selectedId}
        onSelect={onSelect}
        onFocus={() => revealSignal(map, spawn.position)}
      />,
      element,
      String(spawn.speciesId),
    ),
  );
}

interface SignalButtonProps {
  spawn: Spawn;
  selected: boolean;
  onSelect: (speciesId: number) => void;
  onFocus: () => void;
}

/**
 * Una señal sin identificar: un punto de 20 px con el pulso del radar. Con ese tamaño, WCAG 2.5.8
 * pide los centros a 24 px o más: lo cumple la separación (MIN_SPACING en src/lib/geo/spawns.ts,
 * con la medición). El foco se ve como un contorno verde separado del botón; la señal marcada,
 * como un anillo claro pegado a él, para que no se confundan cuando están en señales distintas.
 */
function SignalButton({
  spawn,
  selected,
  onSelect,
  onFocus,
}: SignalButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Señal sin identificar en ${HABITAT_PLACES[spawn.habitat]}`}
      aria-pressed={selected}
      onClick={() => onSelect(spawn.speciesId)}
      onFocus={onFocus}
      className="relative flex size-5 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:ring-2 aria-pressed:ring-foreground"
    >
      {/* Cada señal arranca el pulso en otro momento del ciclo, para que no laten todas juntas.
          Sin eventos de puntero: el anillo crece hasta 52 px, y si los recibiera, un toque cerca de
          otra señal podría caer en esta. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-hud/50 motion-safe:animate-pulso-radar motion-reduce:hidden"
        style={{ animationDelay: `${-(spawn.speciesId % 12) * 0.2}s` }}
      />
      <span aria-hidden className="relative size-2.5 rounded-full bg-hud" />
    </button>
  );
}
