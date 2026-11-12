// Generación del mundo: de una semilla a los biomas en GeoJSON y el hábitat de cada celda.
// Corre en el servidor al compilar; el navegador recibe el resultado listo.
import "server-only";

import { createHash } from "node:crypto";

import { createRandom, deriveSeed } from "@/lib/geo/random";
import type { HabitatName } from "@/lib/pokeapi/types";

import {
  assertEveryHabitat,
  classifyCells,
  computeThresholds,
  isLowland,
  LAYER_ORDER,
  layerFields,
  type Thresholds,
} from "./biomes";
import {
  moistureField,
  SEA_BORDER_CELLS,
  sinkBorder,
  terrainField,
} from "./fields";
import { cellCenter, distanceToEdge, valueAt } from "./grid";
import { fieldToPolygons } from "./polygons";
import { distanceField, highestCell, placeCities } from "./sites";
import type { World } from "./types";
import { findLakes } from "./water";

/** La semilla del mundo. Cambiarla genera otro mundo; la misma semilla, siempre el mismo. */
export const WORLD_SEED = 151;

const CITY_COUNT = 4;
const CITY_MIN_SPACING = 30;

export function generateWorld(seed: number = WORLD_SEED): World {
  // Los umbrales salen del terreno natural; el hundimiento del borde se aplica después.
  const terrain = terrainField(deriveSeed(seed, "altura"));
  const moisture = moistureField(deriveSeed(seed, "humedad"));
  const thresholds = computeThresholds(terrain, moisture);
  const height = sinkBorder(terrain);

  const cities = placeCities(
    plainsCells(height, moisture, thresholds),
    createRandom(deriveSeed(seed, "ciudades")),
    CITY_COUNT,
    CITY_MIN_SPACING,
  );

  const fields = layerFields({
    height,
    moisture,
    thresholds,
    cityDistance: distanceField(cities),
    volcanoDistance: distanceField([highestCell(height)]),
    lakes: findLakes(height, thresholds.coast),
  });

  const cells = classifyCells(fields);
  assertEveryHabitat(cells);
  assertSeaBorder(cells);

  return {
    seed,
    cells,
    biomes: {
      type: "FeatureCollection",
      features: LAYER_ORDER.map((habitat) => ({
        type: "Feature",
        properties: { habitat },
        geometry: {
          type: "MultiPolygon",
          coordinates: fieldToPolygons(fields[habitat]),
        },
      })),
    },
  };
}

/** Celdas de llanura (tierra baja, ni árida ni bosque): donde pueden ir las ciudades. */
function plainsCells(
  height: readonly number[],
  moisture: readonly number[],
  t: Thresholds,
): number[] {
  const cells: number[] = [];
  for (let index = 0; index < height.length; index++) {
    const m = valueAt(moisture, index);
    if (isLowland(valueAt(height, index), t) && m > t.dry && m < t.wet) {
      cells.push(index);
    }
  }
  return cells;
}

/**
 * Lanza si alguna celda de las últimas SEA_BORDER_CELLS de cada borde no es mar. borderSink lo
 * garantiza; este chequeo lo comprueba en cada build, para no depender de mirar una captura.
 */
function assertSeaBorder(cells: readonly HabitatName[]): void {
  cells.forEach((habitat, index) => {
    const [x, y] = cellCenter(index);
    if (distanceToEdge(x, y) < SEA_BORDER_CELLS && habitat !== "sea") {
      throw new Error(
        `La celda (${Math.floor(x)}, ${Math.floor(y)}) es ${habitat} dentro de la franja de mar del borde`,
      );
    }
  });
}

/** Huella corta del mundo: si coincide entre local y producción, el mundo es el mismo. */
export function worldHash(world: World): string {
  return createHash("sha256")
    .update(JSON.stringify(world.biomes))
    .digest("hex")
    .slice(0, 12);
}
