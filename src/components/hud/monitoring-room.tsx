"use client";

// La sala de monitoreo: el rótulo de la esquina, el aviso de las detecciones y el mapa. Guarda qué
// señales detectó el radar, porque las usan los tres: el mapa muestra solo esas, el rótulo las
// cuenta y el aviso dice dónde aparecieron.
import { useState } from "react";

import { MapLoader } from "@/components/map/map-loader";
import type { MapViewProps } from "@/components/map/map-view";
import { northToSouth, signalPlaces } from "@/components/map/places";

interface MonitoringRoomProps extends Omit<
  MapViewProps,
  "detected" | "onDetect"
> {
  seed: number;
  /** Huella del mundo: si coincide entre local y producción, el mundo es el mismo. */
  hash: string;
}

export function MonitoringRoom({
  seed,
  hash,
  ...mapProps
}: MonitoringRoomProps) {
  const [detected, setDetected] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [announcement, setAnnouncement] = useState("");
  // La etiqueta de cada señal, la misma de su botón. Las señales se ubican al compilar y no
  // cambian: se calcula una vez.
  const [labels] = useState(
    () =>
      new Map(
        signalPlaces(northToSouth(mapProps.spawns), mapProps.places).map(
          ({ spawn, label }) => [spawn.speciesId, label],
        ),
      ),
  );

  // Un aviso por detección: con una sola señal, dónde está; con varias, cuántas.
  const onDetect = (ids: number[]) => {
    setDetected((previous) => new Set([...previous, ...ids]));
    const [first, ...others] = ids;
    if (first === undefined) return;
    setAnnouncement(
      others.length === 0
        ? `Señal detectada en ${labels.get(first)}`
        : `${ids.length} señales detectadas`,
    );
  };

  // El rótulo va antes que el mapa para que el encabezado sea lo primero que lee un lector de
  // pantalla; z-10 lo deja dibujado encima del mapa, que viene después. Lleva fondo porque al
  // mover el mapa puede quedar cualquier bioma debajo, y sin él el texto apagado no se lee bien
  // sobre los más claros. Desde md, cuando la ficha va al costado, el rótulo corta la línea antes
  // del panel (más un margen igual al de la izquierda) en vez de quedar tapado.
  // El aviso existe desde el HTML del servidor, vacío: un lector de pantalla anuncia los cambios de
  // una región viva que ya estaba, no siempre los de una que aparece con el texto puesto.
  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 z-10 bg-background/80 px-1.5 py-0.5 font-mono text-xs text-balance text-muted-foreground font-stretch-condensed md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))]">
        {/* Cada dato en un span sin cortes: si no entra en una línea, corta en un " · " y
            no entre un nombre y su valor. */}
        <h1 className="inline tracking-widest text-hud uppercase">PokéRadar</h1>{" "}
        · <span className="whitespace-nowrap">semilla {seed}</span> ·{" "}
        <span className="whitespace-nowrap">huella {hash}</span> ·{" "}
        <span className="whitespace-nowrap">
          {detected.size} de {mapProps.spawns.length} señales
        </span>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <MapLoader {...mapProps} detected={detected} onDetect={onDetect} />
    </>
  );
}
