"use client";

// Carga diferida del mapa, como indica el tip de la consigna: MapLibre usa `window`, así que
// no se puede renderizar en el servidor. `dynamic(..., { ssr: false })` tiene que vivir en un
// Client Component (en un Server Component no está permitido).
import dynamic from "next/dynamic";

import { MapLoading } from "./map-status";
import type { MapViewProps } from "./map-view";

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <MapLoading />,
});

export function MapLoader(props: MapViewProps) {
  return <MapView {...props} />;
}
