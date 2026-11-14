"use client";

// Carga diferida del mapa, como indica el tip de la consigna: MapLibre usa `window`, así que
// no se puede renderizar en el servidor. `dynamic(..., { ssr: false })` tiene que vivir en un
// Client Component (en un Server Component no está permitido). Si el mapa falla, el error
// boundary muestra un mensaje en su lugar (map-error.tsx).
import dynamic from "next/dynamic";

import { SystemBoot } from "@/components/onboarding/system-boot";

import { MapErrorBoundary } from "./map-error";
import type { MapViewProps } from "./map-view";

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <SystemBoot step="calibrating" />,
});

export function MapLoader(props: MapViewProps) {
  return (
    <MapErrorBoundary>
      <MapView {...props} />
    </MapErrorBoundary>
  );
}
