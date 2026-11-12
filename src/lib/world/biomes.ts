// De los campos de altura y humedad a los 9 biomas, uno por hábitat de PokéAPI.
//
// La idea: cada bioma es la zona donde su "campo" vale 0 o más, y los biomas se pintan en un
// orden fijo (LAYER_ORDER), uno encima del otro. Una celda pertenece al último bioma que la
// cubre. Los polígonos se sacan de esos mismos campos, así que el mapa y la grilla coinciden.
import "server-only";

import { HABITATS, type HabitatName } from "@/lib/pokeapi/types";

import { CELL_COUNT, valueAt } from "./grid";

/** Orden de pintado, de abajo hacia arriba. */
export const LAYER_ORDER: readonly HabitatName[] = [
  "sea",
  "waters-edge",
  "grassland",
  "rough-terrain",
  "forest",
  "urban",
  "mountain",
  "cave",
  "rare",
];

/**
 * Fracción del mundo por debajo de cada franja de altura (percentiles). Las proporciones quedan
 * fijas: endurecer la caída de `fields.ts` cambia la forma del continente, no cuánto mar hay.
 * Por eso el borde de mar se garantiza con un hundimiento propio (borderSink), no con la caída.
 */
const HEIGHT_SHARES = { coast: 0.4, lowland: 0.48, mountain: 0.85, peak: 0.95 };

/** Dentro de la tierra baja: el 25 % más seco es árido y el 40 % más húmedo, bosque. */
const MOISTURE_SHARES = { dry: 0.25, wet: 0.6 };

/** Radios, en celdas, de las ciudades y del volcán. */
const CITY_RADIUS = 3.5;
const VOLCANO_RADIUS = 3;

/** Menos celdas que esto en un hábitat es un mundo roto: no habría dónde ubicar sus especies. */
const MIN_CELLS_PER_HABITAT = 10;

export interface Thresholds {
  coast: number;
  lowland: number;
  mountain: number;
  peak: number;
  dry: number;
  wet: number;
}

/** El valor que deja por debajo a la fracción `share` de los valores. */
function quantile(values: readonly number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return valueAt(sorted, Math.floor(share * (sorted.length - 1)));
}

/** ¿La celda está en la franja de tierra baja (sobre la costa y debajo de la montaña)? */
export function isLowland(height: number, t: Thresholds): boolean {
  return height >= t.lowland && height < t.mountain;
}

/**
 * Umbrales por percentil en lugar de valores fijos: la proporción de cada franja es la misma con
 * cualquier semilla, y se ajusta cambiando HEIGHT_SHARES y MOISTURE_SHARES.
 */
export function computeThresholds(
  height: readonly number[],
  moisture: readonly number[],
): Thresholds {
  const lowland = quantile(height, HEIGHT_SHARES.lowland);
  const mountain = quantile(height, HEIGHT_SHARES.mountain);
  const lowlandMoisture = moisture.filter((_, index) => {
    const h = valueAt(height, index);
    return h >= lowland && h < mountain;
  });
  return {
    coast: quantile(height, HEIGHT_SHARES.coast),
    lowland,
    mountain,
    peak: quantile(height, HEIGHT_SHARES.peak),
    dry: quantile(lowlandMoisture, MOISTURE_SHARES.dry),
    wet: quantile(lowlandMoisture, MOISTURE_SHARES.wet),
  };
}

export interface FieldInputs {
  height: readonly number[];
  moisture: readonly number[];
  thresholds: Thresholds;
  /** Distancia de cada celda a la ciudad más cercana. */
  cityDistance: readonly number[];
  /** Distancia de cada celda al volcán. */
  volcanoDistance: readonly number[];
  /** Celdas de agua encerradas en tierra (ver water.ts). */
  lakes: ReadonlySet<number>;
}

/**
 * El campo de cada bioma: un número por celda, que es 0 o más donde el bioma está presente.
 * `Math.min` es la intersección: el bosque es tierra baja **y** húmeda.
 */
export function layerFields(input: FieldInputs): Record<HabitatName, number[]> {
  const { thresholds: t } = input;
  const h = (index: number) => valueAt(input.height, index);
  const m = (index: number) => valueAt(input.moisture, index);
  const field = (fn: (index: number) => number) =>
    Array.from({ length: CELL_COUNT }, (_, index) => fn(index));

  return {
    sea: field(() => 1),
    // Costa (sobre el nivel del mar) y lagos: una celda de lago vale 1 para quedar adentro.
    "waters-edge": field((i) => (input.lakes.has(i) ? 1 : h(i) - t.coast)),
    grassland: field((i) => h(i) - t.lowland),
    "rough-terrain": field((i) => Math.min(h(i) - t.lowland, t.dry - m(i))),
    forest: field((i) => Math.min(h(i) - t.lowland, m(i) - t.wet)),
    urban: field((i) =>
      Math.min(
        h(i) - t.lowland,
        t.mountain - h(i),
        CITY_RADIUS - valueAt(input.cityDistance, i),
      ),
    ),
    mountain: field((i) => h(i) - t.mountain),
    cave: field((i) => h(i) - t.peak),
    rare: field((i) => VOLCANO_RADIUS - valueAt(input.volcanoDistance, i)),
  };
}

/** Hábitat de cada celda: el último bioma de LAYER_ORDER cuyo campo vale 0 o más. */
export function classifyCells(
  fields: Record<HabitatName, number[]>,
): HabitatName[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    let habitat: HabitatName = "sea";
    for (const layer of LAYER_ORDER) {
      if (valueAt(fields[layer], index) >= 0) habitat = layer;
    }
    return habitat;
  });
}

/** Cantidad de celdas de cada hábitat. */
export function countCells(
  cells: readonly HabitatName[],
): Map<HabitatName, number> {
  const counts = new Map<HabitatName, number>(
    HABITATS.map((habitat) => [habitat, 0]),
  );
  for (const habitat of cells) {
    counts.set(habitat, (counts.get(habitat) ?? 0) + 1);
  }
  return counts;
}

/** Lanza si algún hábitat quedó sin lugar en el mundo (igual que el chequeo de las 386 especies). */
export function assertEveryHabitat(cells: readonly HabitatName[]): void {
  for (const [habitat, count] of countCells(cells)) {
    if (count < MIN_CELLS_PER_HABITAT) {
      throw new Error(
        `El hábitat ${habitat} tiene ${count} celdas; el mínimo es ${MIN_CELLS_PER_HABITAT}`,
      );
    }
  }
}
