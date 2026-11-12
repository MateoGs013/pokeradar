// Generación del mundo: de una semilla a los biomas en GeoJSON y el hábitat de cada celda.
// Corre en el servidor al compilar; el navegador recibe el resultado listo.
import "server-only";

import { createHash } from "node:crypto";

import { createRandom, deriveSeed } from "@/lib/geo/random";

import {
  assertEveryHabitat,
  classifyCells,
  computeThresholds,
  isLowland,
  LAYER_ORDER,
  layerFields,
  type Thresholds,
} from "./biomes";
import { heightField, moistureField } from "./fields";
import { valueAt } from "./grid";
import { fieldToPolygons } from "./polygons";
import { distanceField, highestCell, placeCities } from "./sites";
import type { World } from "./types";

/** La semilla del mundo. Cambiarla genera otro mundo; la misma semilla, siempre el mismo. */
export const WORLD_SEED = 151;

const CITY_COUNT = 4;
const CITY_MIN_SPACING = 30;

export function generateWorld(seed: number = WORLD_SEED): World {
  const height = heightField(deriveSeed(seed, "altura"));
  const moisture = moistureField(deriveSeed(seed, "humedad"));
  const thresholds = computeThresholds(height, moisture);

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
  });

  const cells = classifyCells(fields);
  assertEveryHabitat(cells);

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

/** Huella corta del mundo: si coincide entre local y producción, el mundo es el mismo. */
export function worldHash(world: World): string {
  return createHash("sha256")
    .update(JSON.stringify(world.biomes))
    .digest("hex")
    .slice(0, 12);
}
