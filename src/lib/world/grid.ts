// La grilla del mundo y su lugar en el mapa. Todo lo que pase de celdas a [lng, lat]
// (polígonos de biomas, y más adelante los spawns) usa estas funciones.
import "server-only";

import type { Position } from "./types";

export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 150;
export const CELL_COUNT = GRID_WIDTH * GRID_HEIGHT;

/**
 * Extensión del mundo en grados. Está sobre el ecuador, donde la proyección de Mercator casi
 * no deforma, y las celdas son cuadradas: 16° / 200 = 12° / 150 = 0,08° (unos 9 km).
 */
export const WORLD_BOUNDS = { west: -8, east: 8, south: -6, north: 6 } as const;

const DEGREES_PER_CELL = (WORLD_BOUNDS.east - WORLD_BOUNDS.west) / GRID_WIDTH;

/** Coordenadas de la grilla → índice en los arreglos planos (fila por fila). */
export function cellIndex(x: number, y: number): number {
  return x + y * GRID_WIDTH;
}

/** Centro de la celda `index`, en coordenadas de la grilla. */
export function cellCenter(index: number): [x: number, y: number] {
  return [(index % GRID_WIDTH) + 0.5, Math.floor(index / GRID_WIDTH) + 0.5];
}

/**
 * Punto de la grilla (x hacia la derecha, y hacia abajo, en celdas) → [lng, lat] con 4 decimales
 * (unos 11 m: de sobra para el mapa y achica el GeoJSON). La y se invierte: la latitud crece hacia arriba.
 */
export function gridToLngLat(x: number, y: number): Position {
  return [
    round4(WORLD_BOUNDS.west + x * DEGREES_PER_CELL),
    round4(WORLD_BOUNDS.north - y * DEGREES_PER_CELL),
  ];
}

/**
 * [lng, lat] → índice de la celda que contiene ese punto: la vuelta de gridToLngLat. La usa el
 * chequeo de las señales para ver, desde la posición que viaja al mapa, en qué celda cayó cada una.
 *
 * Es para puntos interiores, como esos centros de celda. Cada celda incluye su borde oeste y su
 * borde norte, pero no el este ni el sur: un punto sobre el borde este (lng 8) o el sur (lat −6)
 * del mundo lanza. Y sobre una línea de la grilla, el redondeo puede dejarlo en la celda anterior.
 */
export function lngLatToCell([lng, lat]: Position): number {
  const x = Math.floor((lng - WORLD_BOUNDS.west) / DEGREES_PER_CELL);
  const y = Math.floor((WORLD_BOUNDS.north - lat) / DEGREES_PER_CELL);
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    throw new RangeError(`Punto fuera del mundo: [${lng}, ${lat}]`);
  }
  return cellIndex(x, y);
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Vecinas de una celda por los 4 lados (arriba, abajo, izquierda, derecha), sin salir de la grilla. */
export function neighbors4(index: number): number[] {
  const x = index % GRID_WIDTH;
  const y = Math.floor(index / GRID_WIDTH);
  const neighbors: number[] = [];
  if (x > 0) neighbors.push(index - 1);
  if (x < GRID_WIDTH - 1) neighbors.push(index + 1);
  if (y > 0) neighbors.push(index - GRID_WIDTH);
  if (y < GRID_HEIGHT - 1) neighbors.push(index + GRID_WIDTH);
  return neighbors;
}

/** Índices de las celdas del borde de la grilla. */
export function borderCells(): number[] {
  const cells: number[] = [];
  for (let x = 0; x < GRID_WIDTH; x++) {
    cells.push(cellIndex(x, 0), cellIndex(x, GRID_HEIGHT - 1));
  }
  for (let y = 1; y < GRID_HEIGHT - 1; y++) {
    cells.push(cellIndex(0, y), cellIndex(GRID_WIDTH - 1, y));
  }
  return cells;
}

/** Distancia, en celdas, de un punto de la grilla al borde más cercano. */
export function distanceToEdge(x: number, y: number): number {
  return Math.min(x, GRID_WIDTH - x, y, GRID_HEIGHT - y);
}

/** Distancia en celdas entre los centros de dos celdas. */
export function cellDistance(a: number, b: number): number {
  const [ax, ay] = cellCenter(a);
  const [bx, by] = cellCenter(b);
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Valor de un campo en la celda `index`. Con `noUncheckedIndexedAccess`, leer un arreglo puede
 * dar `undefined`; acá eso es un error de programación y se lanza en lugar de seguir con basura.
 */
export function valueAt(field: readonly number[], index: number): number {
  const value = field[index];
  if (value === undefined) {
    throw new RangeError(`Celda fuera de la grilla: ${index}`);
  }
  return value;
}

/** Arma un campo (un número por celda) a partir de una función de las coordenadas del centro. */
export function mapGrid(fn: (x: number, y: number) => number): number[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const [x, y] = cellCenter(index);
    return fn(x, y);
  });
}
