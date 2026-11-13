// Los nombres inventados del mundo: ciudades, volcán y lagos. Salen de listas propias, elegidos
// con semilla y sin repetir: misma semilla, mismos nombres. No vienen de los juegos de Pokémon.
import "server-only";

import { cellCenter, gridToLngLat } from "./grid";
import type { Place, PlaceKind } from "./types";

/** Nombres posibles de cada tipo de lugar. Las ciudades están tierra adentro: nada de "Puerto". */
const NAMES: Record<PlaceKind, readonly string[]> = {
  city: [
    "Villa Bruma",
    "Villa Escarcha",
    "Cruz del Viento",
    "Paso Liebre",
    "Llano Ámbar",
    "Alto Ceniza",
    "Campo Garza",
  ],
  volcano: ["Monte Brasa", "Cerro Tizón", "Monte Rescoldo", "Cerro Hollín"],
  lake: [
    "Laguna Espejo",
    "Lago Quieto",
    "Laguna Cobre",
    "Lago Niebla",
    "Laguna Sal",
  ],
};

/**
 * Elige `count` nombres distintos de la lista, al azar con semilla: un Fisher-Yates que se corta
 * después de `count` pasos. Lanza si la lista no alcanza.
 */
export function pickNames(
  names: readonly string[],
  count: number,
  random: () => number,
): string[] {
  if (count > names.length) {
    throw new Error(
      `Hacen falta ${count} nombres y la lista tiene ${names.length}`,
    );
  }
  const pool = [...names];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    const picked = pool[j];
    const current = pool[i];
    if (picked === undefined || current === undefined) {
      throw new RangeError(`Índice fuera de la lista: ${j}`);
    }
    pool[i] = picked;
    pool[j] = current;
  }
  return pool.slice(0, count);
}

/** Las celdas de cada tipo de lugar, en el orden en que se generaron. */
export interface PlaceCells {
  city: readonly number[];
  volcano: readonly number[];
  /** Una celda por lago: la de su nombre (`lakeLabelCell`). */
  lake: readonly number[];
}

/** Un nombre para cada celda, con el lugar en [lng, lat] del centro de la celda. */
export function namePlaces(cells: PlaceCells, random: () => number): Place[] {
  const kinds: PlaceKind[] = ["city", "volcano", "lake"];
  return kinds.flatMap((kind) => {
    const names = pickNames(NAMES[kind], cells[kind].length, random);
    return cells[kind].map((cell, i) => {
      const name = names[i];
      if (name === undefined) throw new RangeError(`Falta el nombre ${i}`);
      return { name, kind, position: gridToLngLat(...cellCenter(cell)) };
    });
  });
}
