"use client";

// Carga diferida del mapa, como indica el tip de la consigna: MapLibre usa `window`, así que
// no se puede renderizar en el servidor. `dynamic(..., { ssr: false })` tiene que vivir en un
// Client Component (en un Server Component no está permitido).
import dynamic from "next/dynamic";

import type { MapViewProps } from "./map-view";

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
  ssr: false,
  // Ocupa lo mismo que el mapa, con el color del mar: no hay salto de layout al cargar.
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-bioma-sea font-mono text-sm text-muted-foreground">
      Cargando mapa…
    </div>
  ),
});

export function MapLoader(props: MapViewProps) {
  return <MapView {...props} />;
}
