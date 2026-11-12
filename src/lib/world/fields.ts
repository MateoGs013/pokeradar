// Campos de ruido: un número por celda para la altura y otro para la humedad.
import "server-only";

import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

import { createRandom } from "@/lib/geo/random";

import {
  cellCenter,
  distanceToEdge,
  GRID_HEIGHT,
  GRID_WIDTH,
  mapGrid,
} from "./grid";

/** Tamaño, en celdas, de las formas más grandes del terreno. */
const HEIGHT_SCALE = 70;
const MOISTURE_SCALE = 45;

/**
 * Cuánto baja la altura hacia los bordes: le da forma de isla al continente. No asegura el mar
 * del borde (las proporciones de mar salen por percentil, ver HEIGHT_SHARES): eso lo hace sinkBorder.
 */
const EDGE_FALLOFF = 2.5;

/** Las últimas SEA_BORDER_CELLS celdas de cada borde son siempre mar (generate.ts lo comprueba). */
export const SEA_BORDER_CELLS = 10;

/** El hundimiento empieza a SINK_START_CELLS del borde y llega al máximo en SEA_BORDER_CELLS. */
const SINK_START_CELLS = 20;

/**
 * Hundimiento máximo. En la franja la altura vale a lo sumo 1 − 4 = −3 (el ruido no pasa de 1),
 * muy por debajo del nivel del mar del terreno natural (−1,41 con la semilla 151). Si otra
 * semilla no cumpliera, assertSeaBorder hace fallar el build.
 */
const SINK_DEPTH = 4;

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
 * Hundimiento cerca del borde: 0 a más de SINK_START_CELLS celdas, sube con una curva suave
 * (smoothstep) y vale SINK_DEPTH en las últimas SEA_BORDER_CELLS. La subida suave evita costas
 * rectas: el continente se apaga de a poco en lugar de cortarse contra una línea.
 */
function borderSink(x: number, y: number): number {
  const ramp =
    (SINK_START_CELLS - distanceToEdge(x, y)) /
    (SINK_START_CELLS - SEA_BORDER_CELLS);
  const t = Math.min(1, Math.max(0, ramp));
  return SINK_DEPTH * t * t * (3 - 2 * t);
}

/** Terreno natural de cada celda: ruido fractal menos una caída hacia los bordes. */
export function terrainField(seed: number): number[] {
  const noise = createNoise2D(createRandom(seed));
  return mapGrid(
    (x, y) =>
      fractalNoise(noise, x / HEIGHT_SCALE, y / HEIGHT_SCALE, 5) -
      EDGE_FALLOFF * distanceToCenter(x, y) ** 2,
  );
}

/**
 * Altura final: el terreno con el hundimiento del borde. Va aparte del terreno porque los
 * umbrales por percentil se calculan sobre el terreno natural: si se calcularan con el borde
 * hundido, la franja llenaría sola el cupo de mar y todo el interior quedaría como tierra.
 */
export function sinkBorder(terrain: readonly number[]): number[] {
  return terrain.map((value, index) => {
    const [x, y] = cellCenter(index);
    return value - borderSink(x, y);
  });
}

/** Humedad de cada celda: otro ruido, independiente de la altura. Separa bosque, llanura y zonas áridas. */
export function moistureField(seed: number): number[] {
  const noise = createNoise2D(createRandom(seed));
  return mapGrid((x, y) =>
    fractalNoise(noise, x / MOISTURE_SCALE, y / MOISTURE_SCALE, 3),
  );
}
