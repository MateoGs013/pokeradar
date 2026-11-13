"use client";

// Las señales sobre el mapa. Cada una es un Marker de MapLibre, que la mueve con la cámara, con un
// <button> de React adentro, montado con un portal. Son decenas, no cientos: como botones del DOM
// tienen foco, teclado y aria-label sin trabajo extra (docs/decisiones.md, "Señales"). El botón
// existe recién cuando el radar detectó la señal: antes no se ve ni se alcanza con Tab.
import { type Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { hasSprite, PokemonSprite } from "@/components/dossier/pokemon-sprite";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import type { Place, Position, Spawn } from "@/lib/world/types";

import { northToSouth, signalPlaces } from "./places";

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

/** La señal que se tocó: dónde está, cómo se nombra y su botón, para devolverle el foco. */
export interface SignalSelection {
  spawn: Spawn;
  place: string;
  button: HTMLButtonElement;
}

interface SignalMarkersProps {
  map: MapLibreMap;
  /** Los lugares con nombre, para decir dónde está cada señal. */
  places: readonly Place[];
  spawns: readonly Spawn[];
  /** La señal con la ficha abierta, si hay una. */
  selectedId: number | null;
  /** Las especies ya identificadas, por id: esas señales muestran su sprite. */
  identified: ReadonlyMap<number, PokemonDetail>;
  /** Las señales que el radar ya detectó, por speciesId: solo esas tienen botón. */
  detected: ReadonlySet<number>;
  onSelect: (selection: SignalSelection) => void;
}

export function SignalMarkers({
  map,
  places,
  spawns,
  selectedId,
  identified,
  detected,
  onSelect,
}: SignalMarkersProps) {
  // Un div por señal, que MapLibre posiciona, y el lugar que la nombra. El div lo comparten el
  // Marker y el portal, así que tiene que ser el mismo mientras el componente viva: useState lo
  // guarda (useMemo es una caché, y React puede descartarla). Las señales se ubican al compilar y
  // no cambian. Van de norte a sur: ese es el orden del Tab.
  const [anchors] = useState(() =>
    signalPlaces(northToSouth(spawns), places).map(
      ({ spawn, place, label }) => ({
        spawn,
        place,
        label,
        element: document.createElement("div"),
      }),
    ),
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

  // Los Marker de todas las señales existen desde el principio, en el orden de norte a sur: un
  // botón que aparece después queda en su lugar del Tab.
  const buttons = anchors.map(
    ({ spawn, place, label, element }) =>
      detected.has(spawn.speciesId) &&
      createPortal(
        <SignalButton
          spawn={spawn}
          place={place}
          label={label}
          selected={spawn.speciesId === selectedId}
          detail={identified.get(spawn.speciesId)}
          onSelect={onSelect}
          onFocus={() => revealSignal(map, spawn.position)}
        />,
        element,
        String(spawn.speciesId),
      ),
  );

  return buttons;
}

interface SignalButtonProps {
  spawn: Spawn;
  /** Dónde está, para la ficha: "el bosque, al noreste de Monte Brasa". */
  place: string;
  /** El lugar para el aria-label, con "(n de m)" si otra señal comparte el lugar. */
  label: string;
  selected: boolean;
  /** La ficha de la especie, si ya se identificó. */
  detail: PokemonDetail | undefined;
  onSelect: (selection: SignalSelection) => void;
  onFocus: () => void;
}

/**
 * Una señal sin identificar: un punto de 20 px con el pulso del radar. Con ese tamaño, WCAG 2.5.8
 * pide los centros a 24 px o más. Medido en pantallas verticales, la separación lo cumple desde
 * 344 px de ancho; a 320 px quedan a 22,2 px (MIN_SPACING en src/lib/geo/spawns.ts, con las
 * mediciones). El foco se ve como un contorno verde separado del botón; la señal con la ficha
 * abierta, como un anillo claro pegado a él, para que no se confundan cuando están en señales
 * distintas. Abre la ficha, que es un diálogo: aria-haspopup y aria-expanded, como el Trigger de
 * Base UI (dialog/trigger/DialogTrigger.js). Identificada, muestra el sprite y su nombre.
 */
function SignalButton({
  spawn,
  place,
  label,
  selected,
  detail,
  onSelect,
  onFocus,
}: SignalButtonProps) {
  return (
    <button
      type="button"
      aria-label={
        detail
          ? `${detail.name} en ${label}`
          : `Señal sin identificar en ${label}`
      }
      aria-haspopup="dialog"
      aria-expanded={selected}
      onClick={(event) =>
        onSelect({ spawn, place, button: event.currentTarget })
      }
      onFocus={onFocus}
      className="relative flex size-5 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-expanded:ring-2 aria-expanded:ring-foreground"
    >
      {/* El ping de la detección: el botón aparece cuando el haz pasa por la señal, y este anillo
          crece una sola vez desde ahí. Va primero para que no se vuelva a montar, y animarse,
          cuando la señal se identifica. Termina invisible y no recibe toques. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-hud opacity-0 motion-safe:animate-deteccion"
      />
      {detail && hasSprite(detail.sprites) ? (
        // La señal se transforma en el sprite (docs/concepto.md, "Señales e identificación"); sin
        // sprite, sigue siendo el punto, con el nombre en el aria-label. Mide
        // 40 px, el doble que el botón, y no recibe eventos de puntero: el área para tocar sigue
        // siendo el botón de 20 px, el que cuenta para WCAG 2.5.8. max-w-none: el estilo base de
        // Tailwind (max-width: 100%) la dejaba en 20 px, el ancho del botón (medido).
        <PokemonSprite
          sprites={detail.sprites}
          size={40}
          className="pointer-events-none absolute size-10 max-w-none motion-safe:animate-in motion-safe:duration-300 motion-safe:zoom-in-50 motion-safe:fade-in"
        />
      ) : (
        <>
          {/* Cada señal arranca el pulso en otro momento del ciclo, para que no laten todas
              juntas. Sin eventos de puntero: el anillo crece hasta 52 px, y si los recibiera, un
              toque cerca de otra señal podría caer en esta. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-hud/50 motion-safe:animate-pulso-radar motion-reduce:hidden"
            style={{ animationDelay: `${-(spawn.speciesId % 12) * 0.2}s` }}
          />
          <span aria-hidden className="relative size-2.5 rounded-full bg-hud" />
        </>
      )}
    </button>
  );
}
