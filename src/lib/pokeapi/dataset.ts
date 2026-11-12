// Dataset de especies: qué Pokémon existen en el mundo, en qué hábitat viven y de qué tipo son.
// Se arma en el servidor con 27 pedidos (9 hábitats + 18 tipos) en lugar de 386.
import "server-only";

import { getJson } from "./client";
import { idFromUrl, isHabitatResponse, isTypeResponse } from "./guards";
import {
  HABITATS,
  TYPES,
  type HabitatName,
  type Species,
  type TypeName,
} from "./types";

/** Especies con hábitat en PokéAPI: generaciones 1 a 3 (docs/hallazgos-pokeapi.md). */
export const SPECIES_COUNT = 386;

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

  // id → nombre de la especie y hábitat. El hábitat define qué especies forman parte del mundo.
  const speciesById = new Map<number, { name: string; habitat: HabitatName }>();
  for (const { habitat, response } of habitats) {
    for (const species of response.pokemon_species) {
      speciesById.set(idFromUrl(species.url), { name: species.name, habitat });
    }
  }

  // id → tipos ordenados por slot (1 primario, 2 secundario). Los tipos listan también
  // especies de otras generaciones y formas alternativas: se ignoran las que no tienen hábitat.
  const typesById = new Map<number, TypeName[]>();
  for (const { type, response } of types) {
    for (const entry of response.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (!speciesById.has(id)) continue;
      const list = typesById.get(id) ?? [];
      list[entry.slot - 1] = type;
      typesById.set(id, list);
    }
  }

  const dataset: Species[] = [];
  for (const [id, { name, habitat }] of speciesById) {
    const [primary, secondary] = typesById.get(id) ?? [];
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
