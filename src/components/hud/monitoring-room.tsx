"use client";

// La sala de monitoreo: el rótulo de la esquina y el mapa. Guarda qué señales detectó el radar,
// porque las usan los dos: el mapa muestra solo esas, y el rótulo las cuenta.
import { useState } from "react";

import { MapLoader } from "@/components/map/map-loader";
import type { MapViewProps } from "@/components/map/map-view";

interface MonitoringRoomProps extends Omit<
  MapViewProps,
  "detected" | "onDetect"
> {
  seed: number;
  /** Huella del mundo: si coincide entre local y producción, el mundo es el mismo. */
  hash: string;
}

export function MonitoringRoom({ seed, hash, ...map }: MonitoringRoomProps) {
  const [detected, setDetected] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  // El rótulo va antes que el mapa para que el encabezado sea lo primero que lee un lector de
  // pantalla; z-10 lo deja dibujado encima del mapa, que viene después. Lleva fondo porque al
  // mover el mapa puede quedar cualquier bioma debajo, y sin él el texto apagado no se lee bien
  // sobre los más claros. Desde md, cuando la ficha va al costado, el rótulo corta la línea antes
  // del panel (más un margen igual al de la izquierda) en vez de quedar tapado.
  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 z-10 bg-background/80 px-1.5 py-0.5 font-mono text-xs text-balance text-muted-foreground font-stretch-condensed md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))]">
        {/* Cada dato en un span sin cortes: si no entra en una línea, corta en un " · " y
            no entre un nombre y su valor. */}
        <h1 className="inline tracking-widest text-hud uppercase">PokéRadar</h1>{" "}
        · <span className="whitespace-nowrap">semilla {seed}</span> ·{" "}
        <span className="whitespace-nowrap">huella {hash}</span> ·{" "}
        <span className="whitespace-nowrap">
          {detected.size} de {map.spawns.length} señales
        </span>
      </div>
      <MapLoader
        {...map}
        detected={detected}
        onDetect={(ids) =>
          setDetected((previous) => new Set([...previous, ...ids]))
        }
      />
    </>
  );
}
