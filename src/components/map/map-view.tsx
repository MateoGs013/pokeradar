"use client";

// El mapa: MapLibre con el mundo generado como única fuente, sin tiles externos.
// Se carga solo en el navegador (ver map-loader.tsx): MapLibre necesita `window` y WebGL.
import "maplibre-gl/dist/maplibre-gl.css";

import {
  type ErrorEvent as MapErrorEvent,
  type FillLayerSpecification,
  Map as MapLibreMap,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { type Bounds, expandToAspect } from "@/lib/geo/bounds";
import type { BiomeCollection, Spawn } from "@/lib/world/types";

import { MapLoading } from "./map-status";
import { SignalMarkers } from "./signal-markers";

// MapLibre v6 arma la URL de su worker con `import.meta.url`, y si no empieza con http(s) la deja
// vacía. Turbopack reemplaza ese valor por una ruta `file:///ROOT/...`, así que el worker terminaba
// pidiendo la página (docs/errores.md, E-07). Esta expresión, en cambio, Turbopack la reconoce:
// copia el worker como asset en /_next/static/media/ y nos da su URL.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);

export interface MapViewProps {
  /** Los 9 biomas, en el orden en que se pintan (de abajo hacia arriba). */
  biomes: BiomeCollection;
  /** Extensión del mundo: [[oeste, sur], [este, norte]]. */
  bounds: Bounds;
  /** Las señales del mundo, ya ubicadas en el servidor. */
  spawns: readonly Spawn[];
}

const BIOMES_SOURCE = "biomas";

/** Lee un token de color de globals.css (los colores viven en un solo lugar). */
function cssToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/** Límite del mapa: el mundo agrandado a la proporción actual del contenedor. */
function worldLimit(world: Bounds, container: HTMLElement): Bounds {
  return expandToAspect(world, container.clientWidth / container.clientHeight);
}

/** Una capa de relleno por bioma, en el mismo orden que la colección. */
function biomeLayers(biomes: BiomeCollection): FillLayerSpecification[] {
  return biomes.features.map(({ properties: { habitat } }) => ({
    id: `bioma-${habitat}`,
    type: "fill",
    source: BIOMES_SOURCE,
    filter: ["==", ["get", "habitat"], habitat],
    paint: { "fill-color": cssToken(`--bioma-${habitat}`) },
  }));
}

export function MapView({ biomes, bounds, spawns }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Props con las que se crea el mapa. El mundo se genera al compilar y no cambia: el mapa se crea
  // una sola vez, con ellas.
  const initialRef = useRef({ biomes, bounds });
  // El mapa, cuando ya cargó su estilo: recién ahí se montan las señales.
  const [loadedMap, setLoadedMap] = useState<MapLibreMap | null>(null);
  // Un error del mapa antes de `load`, que lo deja sin dibujar.
  const [failure, setFailure] = useState<Error | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Crea el mapa una sola vez y lo destruye al desmontar.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initial = initialRef.current;

    const map = new MapLibreMap({
      container,
      style: {
        version: 8,
        sources: {
          [BIOMES_SOURCE]: { type: "geojson", data: initial.biomes },
        },
        layers: [
          {
            id: "fondo",
            type: "background",
            paint: { "background-color": cssToken("--bioma-sea") },
          },
          ...biomeLayers(initial.biomes),
        ],
      },
      bounds: initial.bounds,
      // Si el límite fuera el mundo tal cual, en una pantalla angosta MapLibre acercaría el mapa
      // para no mostrar nada afuera, y la isla quedaría cortada a los costados.
      maxBounds: worldLimit(initial.bounds, container),
      // El canvas de MapLibre ya es una región con nombre (role="region", y tabindex="0" para
      // moverlo con las flechas). `locale` traduce ese nombre, que por defecto es "Map".
      locale: { "Map.Title": "Mapa del mundo" },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    // Al rotar el teléfono o cambiar el tamaño de la ventana: límite nuevo y el mundo encuadrado
    // otra vez. MapLibre se redimensiona con el límite viejo, que puede dejar el mapa acercado
    // y la isla cortada; el límite nuevo solo impide salir, no aleja.
    const onResize = () => {
      map.setMaxBounds(worldLimit(initial.bounds, container));
      map.fitBounds(initial.bounds, { animate: false });
    };
    map.on("resize", onResize);
    // Antes de `load`, un error deja el mapa sin dibujar: por ejemplo, si no baja el worker (como
    // en E-07). Después de `load` se deja de escuchar, y MapLibre los muestra en la consola.
    const onError = ({ error }: MapErrorEvent) =>
      setFailure(new Error(error.message));
    map.on("error", onError);
    const onLoad = () => {
      map.off("error", onError);
      setLoadedMap(map);
    };
    map.on("load", onLoad);

    return () => {
      map.off("resize", onResize);
      map.off("error", onError);
      map.off("load", onLoad);
      map.remove();
      setLoadedMap(null);
    };
  }, []);

  // React lleva al error boundary (map-error.tsx) lo que se lanza al renderizar o en un efecto,
  // como el GPUInitializationError del constructor, pero no lo que llega en un evento: por eso
  // el error del mapa se guarda en el estado y se lanza acá.
  if (failure) throw failure;

  // MapLibre le pone `position: relative` al contenedor (.maplibregl-map), y su CSS le gana a
  // las clases de Tailwind: por eso el posicionamiento va en un div de afuera. Hasta `load`, el
  // cartel de carga tapa el mapa todavía vacío.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      {loadedMap ? (
        <SignalMarkers
          map={loadedMap}
          spawns={spawns}
          selectedId={selectedId}
          // Tocar la señal marcada la desmarca (por eso el botón usa aria-pressed).
          onSelect={(id) =>
            setSelectedId((current) => (current === id ? null : id))
          }
        />
      ) : (
        <MapLoading />
      )}
    </div>
  );
}
