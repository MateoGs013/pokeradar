"use client";

// El radar de la sala de monitoreo: la niebla que cubre el mundo y las estaciones que la despejan,
// el radar base y las antenas (docs/concepto.md, "Niebla y radar" y "Antenas"). La niebla es una
// sola capa del mapa (fog.ts) para todas las estaciones; cada una barre por su cuenta
// (station.tsx), y la red (network.ts) reparte las señales y decide cuándo el mapa copia la niebla.
import { CanvasSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useEffectEvent, useState } from "react";

import { cssNumber, cssToken } from "@/components/map/css-token";
import { PLACE_NAMES_LAYER } from "@/components/map/places";
import type { Bounds } from "@/lib/geo/bounds";
import type { Position, Spawn } from "@/lib/world/types";

import { createFog, fogCorners } from "./fog";
import { RadarNetwork } from "./network";
import { RadarStation } from "./station";

const FOG_SOURCE = "niebla";

/** Una estación de radar: el radar base o una antena. */
export interface Station {
  /** Fijo mientras la estación vive: es la key de React. */
  id: number;
  position: Position;
}

interface RadarProps {
  map: MapLibreMap;
  /** Extensión del mundo, la misma de la grilla. */
  bounds: Bounds;
  /** Cuántas celdas tiene la grilla del mundo: un píxel de la niebla por celda. */
  grid: { width: number; height: number };
  /** Las estaciones, en el orden en que se instalaron. Una estación nueva barre al aparecer. */
  stations: readonly Station[];
  /** Las señales del mundo: cada estación detecta las que están a su alcance cuando el haz pasa. */
  spawns: readonly Spawn[];
  /** Avisa qué señales acaba de detectar una estación (por speciesId). */
  onDetect: (ids: number[]) => void;
  /** Avisa que el mapa ya dibujó un cuadro con la niebla: recién ahí se puede sacar el cartel. */
  onFogDrawn: () => void;
}

export function Radar({
  map,
  bounds,
  grid,
  stations,
  spawns,
  onDetect,
  onFogDrawn,
}: RadarProps) {
  const fogDrawn = useEffectEvent(onFogDrawn);
  // La red, con la niebla entera, se crea una vez: el mundo y las señales vienen del servidor y no
  // cambian mientras el mapa vive. useState la guarda (useMemo es una caché, y React puede
  // descartarla). El radar se monta solo en el cliente, después de que el mapa cargó, así que acá
  // ya hay document y estilos.
  const [network] = useState(
    () =>
      new RadarNetwork(
        createFog(grid.width, grid.height, bounds, cssToken("--hud-bg")),
        spawns,
      ),
  );

  // La niebla en el mapa, una vez (dos en desarrollo, por el modo estricto: la limpieza deja el mapa
  // como estaba). Sin `animate`: la red pide que se copie el canvas mientras alguna estación barre.
  useEffect(() => {
    map.addSource(FOG_SOURCE, {
      type: "canvas",
      canvas: network.fog.canvas,
      coordinates: fogCorners(network.fog),
      animate: false,
    });
    map.addLayer(
      {
        id: FOG_SOURCE,
        type: "raster",
        source: FOG_SOURCE,
        paint: {
          "raster-opacity": cssNumber("--fog-opacity"),
          // Sin fundido al aparecer: el mapa no se ve descubierto antes de la niebla.
          "raster-fade-duration": 0,
        },
      },
      PLACE_NAMES_LAYER,
    );
    // getSource<T> no valida el tipo, solo lo afirma: instanceof sí lo comprueba.
    const source = map.getSource(FOG_SOURCE);
    if (!(source instanceof CanvasSource)) {
      throw new Error("La niebla no quedó como fuente canvas del mapa");
    }
    network.attach(source);
    // El primer cuadro que el mapa dibuja después de sumar la capa ya tiene la niebla.
    const onRender = () => {
      map.off("render", onRender);
      fogDrawn();
    };
    map.on("render", onRender);

    return () => {
      network.attach(null);
      map.off("render", onRender);
      // Si el mapa ya se destruyó, no tiene estilo y no hay nada que sacar.
      if (map.getLayer(FOG_SOURCE)) map.removeLayer(FOG_SOURCE);
      if (map.getSource(FOG_SOURCE)) map.removeSource(FOG_SOURCE);
    };
  }, [map, network]);

  return stations.map(({ id, position }) => (
    <RadarStation
      key={id}
      map={map}
      network={network}
      position={position}
      onDetect={onDetect}
    />
  ));
}
