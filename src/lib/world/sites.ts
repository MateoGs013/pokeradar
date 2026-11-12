// Lugares puntuales del mundo: las ciudades (hábitat urban) y el volcán (hábitat rare).
import "server-only";

import { CELL_COUNT, cellDistance, valueAt } from "./grid";

/** Índice de la celda más alta. Ahí va el volcán, el lugar único del hábitat `rare`. */
export function highestCell(height: readonly number[]): number {
  let highest = 0;
  for (let index = 1; index < height.length; index++) {
    if (valueAt(height, index) > valueAt(height, highest)) highest = index;
  }
  return highest;
}

/**
 * Elige `count` ciudades entre las celdas candidatas, al azar con semilla y separadas por al
 * menos `minSpacing` celdas. Lanza si no encuentra lugar para todas.
 */
export function placeCities(
  candidates: readonly number[],
  random: () => number,
  count: number,
  minSpacing: number,
): number[] {
  const cities: number[] = [];
  for (let attempt = 0; attempt < 1000 && cities.length < count; attempt++) {
    const candidate = candidates[Math.floor(random() * candidates.length)];
    if (candidate === undefined) break;
    if (cities.every((city) => cellDistance(city, candidate) >= minSpacing)) {
      cities.push(candidate);
    }
  }
  if (cities.length < count) {
    throw new Error(
      `Solo entraron ${cities.length} de ${count} ciudades separadas por ${minSpacing} celdas`,
    );
  }
  return cities;
}

/** Distancia, en celdas, de cada celda al punto más cercano de `points`. */
export function distanceField(points: readonly number[]): number[] {
  return Array.from({ length: CELL_COUNT }, (_, index) =>
    Math.min(...points.map((point) => cellDistance(index, point))),
  );
}
