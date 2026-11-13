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
import { cellCenter, distanceToEdge, lngLatToCell, valueAt } from "./grid";
import { namePlaces } from "./names";
import { fieldToPolygons, worldRectangle } from "./polygons";
import { distanceField, highestCell, placeCities } from "./sites";
import type { Place, PlaceKind, World } from "./types";
import { findLakes, lakeLabelCell, splitLakes } from "./water";

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
  const volcano = highestCell(height);
  const lakes = findLakes(height, thresholds.coast);

  const fields = layerFields({
    height,
    moisture,
    thresholds,
    cityDistance: distanceField(cities),
    volcanoDistance: distanceField([volcano]),
    lakes,
  });

  const cells = classifyCells(fields);
  assertEveryHabitat(cells);
  assertSeaBorder(cells);

  const places = namePlaces(
    {
      city: cities,
      volcano: [volcano],
      lake: splitLakes(lakes).map(lakeLabelCell),
    },
    createRandom(deriveSeed(seed, "nombres")),
  );
  assertPlaces(places, cells);

  return {
    seed,
    cells,
    places,
    biomes: {
      type: "FeatureCollection",
      features: LAYER_ORDER.map((habitat) => ({
        type: "Feature",
        properties: { habitat },
        geometry: {
          type: "MultiPolygon",
          // El mar es el fondo: el rectángulo del mundo. Los demás biomas, sus contornos.
          coordinates:
            habitat === "sea"
              ? worldRectangle()
              : fieldToPolygons(fields[habitat]),
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

/** El hábitat que tiene que tener la celda de cada tipo de lugar. */
const PLACE_HABITAT: Record<PlaceKind, HabitatName> = {
  city: "urban",
  volcano: "rare",
  lake: "waters-edge",
};

/**
 * Lanza si dos lugares se llaman igual o si un nombre cae en una celda que no es de su hábitat
 * (una ciudad fuera de la ciudad, un lago en tierra). Se comprueba desde la posición que va a usar
 * el mapa, como `assertSpawns`.
 */
function assertPlaces(
  places: readonly Place[],
  cells: readonly HabitatName[],
): void {
  const names = new Set(places.map((place) => place.name));
  if (names.size !== places.length) {
    throw new Error("Hay dos lugares con el mismo nombre");
  }
  for (const place of places) {
    const habitat = cells[lngLatToCell(place.position)];
    if (habitat !== PLACE_HABITAT[place.kind]) {
      throw new Error(
        `${place.name} (${place.kind}) cae en ${habitat ?? "ninguna celda"}`,
      );
    }
  }
}

/**
 * Huella corta del mundo, de los biomas y los lugares: si coincide entre local y producción, el
 * mapa y sus nombres son los mismos.
 */
export function worldHash(world: World): string {
  return createHash("sha256")
    .update(JSON.stringify({ biomes: world.biomes, places: world.places }))
    .digest("hex")
    .slice(0, 12);
}
