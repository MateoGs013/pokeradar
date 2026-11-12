// Dataset de especies: qué Pokémon existen en el mundo, en qué hábitat viven y de qué tipo son.
// Se arma en el servidor con 27 pedidos (9 hábitats + 18 tipos) en lugar de 386.
import "server-only";

import { getJson } from "./client";
import { isHabitatResponse, isTypeResponse } from "./guards";
import {
  HABITATS,
  TYPES,
  type HabitatName,
  type HabitatResponse,
  type Species,
  type TypeName,
  type TypeResponse,
} from "./types";
import { idFromUrl } from "./url";

/** Especies con hábitat en PokéAPI: generaciones 1 a 3 (docs/hallazgos-pokeapi.md). */
export const SPECIES_COUNT = 386;

/** Respuesta de `/pokemon-habitat/{habitat}` junto con el hábitat pedido. */
export interface HabitatEntry {
  habitat: HabitatName;
  response: HabitatResponse;
}

/** Respuesta de `/type/{type}` junto con el tipo pedido. */
export interface TypeEntry {
  type: TypeName;
  response: TypeResponse;
}

interface SpeciesInfo {
  name: string;
  habitat: HabitatName;
}

interface SlotTypes {
  primary?: TypeName;
  secondary?: TypeName;
}

/** Pide los 9 hábitats y los 18 tipos en paralelo y arma el dataset con ellos. */
export async function getSpeciesDataset(): Promise<Species[]> {
  const [habitats, types] = await Promise.all([
    Promise.all(
      HABITATS.map(async (habitat) => ({
        habitat,
        response: await getJson(
          `/pokemon-habitat/${habitat}`,
          isHabitatResponse,
        ),
      })),
    ),
    Promise.all(
      TYPES.map(async (type) => ({
        type,
        response: await getJson(`/type/${type}`, isTypeResponse),
      })),
    ),
  ]);
  return buildSpeciesDataset(habitats, types);
}

/**
 * Cruza hábitats y tipos en la lista de especies, ordenada por id. Es pura: no usa la red.
 * Lanza si una especie no tiene tipo primario o si el total no es SPECIES_COUNT.
 */
export function buildSpeciesDataset(
  habitats: readonly HabitatEntry[],
  types: readonly TypeEntry[],
): Species[] {
  const speciesById = indexSpecies(habitats);
  const typesById = indexTypes(types, speciesById);

  const dataset: Species[] = [];
  for (const [id, { name, habitat }] of speciesById) {
    const { primary, secondary } = typesById.get(id) ?? {};
    if (!primary) {
      throw new Error(
        `La especie ${id} (${name}) no tiene tipo primario en /type`,
      );
    }
    dataset.push({
      id,
      name,
      habitat,
      types: secondary ? [primary, secondary] : [primary],
    });
  }

  if (dataset.length !== SPECIES_COUNT) {
    throw new Error(
      `Se esperaban ${SPECIES_COUNT} especies con hábitat y llegaron ${dataset.length}`,
    );
  }

  return dataset.sort((a, b) => a.id - b.id);
}

/** id de especie → nombre y hábitat. El hábitat define qué especies forman parte del mundo. */
function indexSpecies(
  habitats: readonly HabitatEntry[],
): Map<number, SpeciesInfo> {
  const speciesById = new Map<number, SpeciesInfo>();
  for (const { habitat, response } of habitats) {
    for (const species of response.pokemon_species) {
      speciesById.set(idFromUrl(species.url), { name: species.name, habitat });
    }
  }
  return speciesById;
}

/**
 * id de especie → tipo primario (slot 1) y secundario (slot 2).
 * `/type` lista Pokémon (`/pokemon/{id}`), no especies. La forma por defecto comparte el id con
 * su especie, así que cruza con `speciesById`. Las formas alternativas (ids desde 10001) y las
 * especies de otras generaciones no cruzan con ninguna especie con hábitat y se ignoran.
 */
function indexTypes(
  types: readonly TypeEntry[],
  speciesById: ReadonlyMap<number, SpeciesInfo>,
): Map<number, SlotTypes> {
  const typesById = new Map<number, SlotTypes>();
  for (const { type, response } of types) {
    for (const { slot, pokemon } of response.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!speciesById.has(id)) continue;
      const current = typesById.get(id) ?? {};
      typesById.set(
        id,
        slot === 1
          ? { ...current, primary: type }
          : { ...current, secondary: type },
      );
    }
  }
  return typesById;
}
