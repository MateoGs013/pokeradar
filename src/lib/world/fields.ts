// Campos de ruido: un número por celda para la altura y otro para la humedad.
import "server-only";

import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

import { createRandom } from "@/lib/geo/random";

import { GRID_HEIGHT, GRID_WIDTH, mapGrid } from "./grid";

/** Tamaño, en celdas, de las formas más grandes del terreno. */
const HEIGHT_SCALE = 70;
const MOISTURE_SCALE = 45;

/** Cuánto baja la altura hacia los bordes: con esto el continente queda rodeado de mar. */
const EDGE_FALLOFF = 1.4;
const BORDER_CELLS = 10;

/**
 * Ruido fractal: suma `octaves` capas de ruido simplex, cada una con el doble de detalle y la
 * mitad de peso que la anterior. Las primeras dan las formas grandes; las últimas, el borde
 * irregular. Devuelve un valor aproximadamente en [-1, 1].
 */
function fractalNoise(
  noise: NoiseFunction2D,
  x: number,
  y: number,
  octaves: number,
): number {
  let sum = 0;
  let weight = 1;
  let frequency = 1;
  let totalWeight = 0;
  for (let octave = 0; octave < octaves; octave++) {
    sum += weight * noise(x * frequency, y * frequency);
    totalWeight += weight;
    weight /= 2;
    frequency *= 2;
  }
  return sum / totalWeight;
}

/** Distancia al centro de la grilla: 0 en el centro, 1 en el medio de cada borde. */
function distanceToCenter(x: number, y: number): number {
  const dx = (x / GRID_WIDTH) * 2 - 1;
  const dy = (y / GRID_HEIGHT) * 2 - 1;
  return Math.hypot(dx, dy);
}

/**
 * Hundimiento en las últimas BORDER_CELLS celdas de cada borde: crece de 0 a 2, más que
 * cualquier valor del ruido, así que el borde siempre es mar y el continente nunca queda cortado.
 */
function borderSink(x: number, y: number): number {
  const toEdge = Math.min(x, GRID_WIDTH - x, y, GRID_HEIGHT - y);
  return 2 * Math.max(0, 1 - toEdge / BORDER_CELLS);
}

/** Altura de cada celda: ruido fractal menos una caída hacia los bordes y el hundimiento del borde. */
export function heightField(seed: number): number[] {
  const noise = createNoise2D(createRandom(seed));
  return mapGrid(
    (x, y) =>
      fractalNoise(noise, x / HEIGHT_SCALE, y / HEIGHT_SCALE, 5) -
      EDGE_FALLOFF * distanceToCenter(x, y) ** 2 -
      borderSink(x, y),
  );
}

/** Humedad de cada celda: otro ruido, independiente de la altura. Separa bosque, llanura y zonas áridas. */
export function moistureField(seed: number): number[] {
  const noise = createNoise2D(createRandom(seed));
  return mapGrid((x, y) =>
    fractalNoise(noise, x / MOISTURE_SCALE, y / MOISTURE_SCALE, 3),
  );
}
