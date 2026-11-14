// El marco del mapa (docs/concepto.md, "El mapa híbrido"): dónde se dibuja el mundo. El radar, la
// niebla, las señales y las antenas trabajan siempre en las coordenadas del mundo inventado, cerca
// del ecuador, donde un grado de longitud y uno de latitud miden casi lo mismo. El marco las pasa a
// las del mapa solo en el borde con MapLibre: en el modo mundo es la identidad; en el modo real,
// lleva el mundo a Río Negro.
import type { Bounds } from "@/lib/geo/bounds";
import type { Position, Spawn } from "@/lib/world/types";

import { describePlace, DIRECTIONS } from "./places";

export type MapMode = "mundo" | "real";

/** La consulta que abre la sala en un modo: el mundo generado es la dirección sin consulta. */
export function modeSearch(mode: MapMode): string {
  return mode === "real" ? "?modo=real" : "";
}

export interface Frame {
  mode: MapMode;
  /** De coordenadas del mundo a las del mapa. */
  toMap: (position: Position) => Position;
  /** De las del mapa a las del mundo. */
  fromMap: (position: Position) => Position;
  /**
   * Cuántos niveles de zoom más hacen falta para ver el mundo del mismo tamaño en pantalla: cuenta
   * la escala y, en el modo real, el estiramiento de Mercator.
   */
  zoomOffset: number;
  /** Dónde está una señal, en palabras: para su botón y para la ficha. */
  describe: (spawn: Spawn) => string;
}

export function worldFrame(places: Parameters<typeof describePlace>[1]): Frame {
  return {
    mode: "mundo",
    toMap: (position) => position,
    fromMap: (position) => position,
    zoomOffset: 0,
    describe: (spawn) => describePlace(spawn, places),
  };
}

/** Viedma, la capital de Río Negro: la zona del concepto cuando no hay ubicación. */
export const VIEDMA: Position = [-62.99, -40.81];

/**
 * Cuántos grados de latitud real mide un grado del mundo: los 12° de alto del mundo quedan en unos
 * 113 km, y los 16° de ancho, en unos 151 km.
 */
const REAL_SCALE = 0.085;

/** Kilómetros por grado de latitud. */
const KM_PER_DEGREE = 111.32;

/**
 * El mundo sobre el mapa real: el radar base (`anchor`, en el mundo) cae en `origin` (real). Lejos
 * del ecuador, un grado de longitud mide menos que uno de latitud (por el coseno de la latitud):
 * la longitud se estira en esa proporción, así un círculo del mundo sigue siendo un círculo en el
 * mapa (Mercator conserva las formas chicas).
 */
export function realFrame(
  anchor: Position,
  origin: Position,
  originName: string,
): Frame {
  const stretch = 1 / Math.cos((origin[1] * Math.PI) / 180);
  return {
    mode: "real",
    toMap: ([lng, lat]) => [
      origin[0] + (lng - anchor[0]) * REAL_SCALE * stretch,
      origin[1] + (lat - anchor[1]) * REAL_SCALE,
    ],
    fromMap: ([lng, lat]) => [
      anchor[0] + (lng - origin[0]) / (REAL_SCALE * stretch),
      anchor[1] + (lat - origin[1]) / REAL_SCALE,
    ],
    // En Mercator, un grado del mundo ocupa en pantalla lo que `REAL_SCALE * stretch` grados de
    // longitud del mapa: el zoom compensa los dos.
    zoomOffset: Math.log2(1 / (REAL_SCALE * stretch)),
    // Sobre el mapa real, los biomas y los lugares inventados no corresponden a lo que se ve: la
    // señal se ubica por la distancia y el rumbo desde el radar base.
    describe: ({ position }) => {
      const east = position[0] - anchor[0];
      const north = position[1] - anchor[1];
      const km = Math.round(
        Math.hypot(east, north) * REAL_SCALE * KM_PER_DEGREE,
      );
      if (km < 1) return `la zona de ${originName}`;
      // El ángulo en octavos de vuelta: de -4 a 4, donde 0 es el este y 2 el norte.
      const octant = Math.round(Math.atan2(north, east) / (Math.PI / 4));
      const direction = DIRECTIONS[(octant + 8) % 8];
      return `la zona de ${originName}, a ${km} km al ${direction}`;
    },
  };
}

/** Los límites del mundo en coordenadas del mapa: el marco no rota, así que las esquinas alcanzan. */
export function mapBounds(
  frame: Frame,
  [southWest, northEast]: Bounds,
): Bounds {
  return [frame.toMap(southWest), frame.toMap(northEast)];
}

type Corners = [Position, Position, Position, Position];

/** Las cuatro esquinas de la niebla (fog.ts, fogCorners) en coordenadas del mapa. */
export function mapCorners(frame: Frame, corners: Corners): Corners {
  const [a, b, c, d] = corners;
  return [frame.toMap(a), frame.toMap(b), frame.toMap(c), frame.toMap(d)];
}
