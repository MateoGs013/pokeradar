// El marco del mapa (docs/concepto.md, "El mapa híbrido"): dónde se dibuja el mundo. El radar, la
// niebla, las señales y las antenas trabajan siempre en las coordenadas del mundo inventado, cerca
// del ecuador, donde un grado de longitud y uno de latitud miden casi lo mismo. El marco las pasa a
// las del mapa solo en el borde con MapLibre: en el modo mundo es la identidad; en el modo real,
// lleva el mundo a Argentina (argentina.ts).
import { ARGENTINA_SCALE, fromReal, toReal, zoneOf } from "@/lib/geo/argentina";
import type { Bounds } from "@/lib/geo/bounds";
import type { Position, Spawn } from "@/lib/world/types";

import { describePlace } from "./places";

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
   * la escala del marco.
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

/**
 * El mundo sobre el mapa real de Argentina, con sus propias señales (argentina-spawns.ts). El marco
 * es lineal en Mercator (argentina.ts, toReal): un grado del mundo ocupa en pantalla lo que
 * ARGENTINA_SCALE grados de longitud, en cualquier latitud.
 */
export function realFrame(): Frame {
  return {
    mode: "real",
    toMap: toReal,
    fromMap: fromReal,
    zoomOffset: Math.log2(1 / ARGENTINA_SCALE),
    // Sobre el mapa real, los biomas y los lugares inventados no corresponden a lo que se ve: la
    // señal se nombra por la zona real donde está.
    describe: (spawn) => zoneOf(spawn).name,
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
