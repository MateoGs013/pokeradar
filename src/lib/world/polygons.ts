// Del campo de un bioma a polígonos en [lng, lat], con marching squares (d3-contour).
import "server-only";

import { contours } from "d3-contour";

import { GRID_HEIGHT, GRID_WIDTH, gridToLngLat } from "./grid";
import type { Position } from "./types";

/**
 * Polígonos de la zona donde `field` vale 0 o más. d3-contour recorre la grilla y traza el borde
 * interpolando entre celdas vecinas, así que el borde sale suave y no en escalones.
 * Devuelve las coordenadas de un MultiPolygon: polígonos → anillos → puntos.
 */
export function fieldToPolygons(field: number[]): Position[][][] {
  const geometry = contours().size([GRID_WIDTH, GRID_HEIGHT]).contour(field, 0);
  return geometry.coordinates.map((polygon) =>
    polygon.map((ring) => ring.map(pointToLngLat)),
  );
}

/**
 * El mundo entero como un rectángulo de 5 puntos (el último repite el primero, como pide GeoJSON).
 * Es el polígono del mar: contornear su campo constante con d3-contour daría 701 puntos y cortaría
 * las 4 esquinas en diagonal, porque d3-contour trata lo que está fuera de la grilla como "debajo".
 * El anillo va antihorario en [lng, lat]: baja por el oeste, cruza el sur y sube por el este.
 */
export function worldRectangle(): Position[][][] {
  return [
    [
      [
        gridToLngLat(0, 0),
        gridToLngLat(0, GRID_HEIGHT),
        gridToLngLat(GRID_WIDTH, GRID_HEIGHT),
        gridToLngLat(GRID_WIDTH, 0),
        gridToLngLat(0, 0),
      ],
    ],
  ];
}

/** Punto de d3-contour ([x, y] en celdas) → [lng, lat]. */
function pointToLngLat(point: readonly number[]): Position {
  const [x, y] = point;
  if (x === undefined || y === undefined) {
    throw new Error(
      `d3-contour devolvió un punto incompleto: [${point.join(", ")}]`,
    );
  }
  return gridToLngLat(x, y);
}
