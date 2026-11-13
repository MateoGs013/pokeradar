// La ficha de una especie, armada en el navegador con dos pedidos a PokéAPI: `/pokemon/{id}`
// (sprites, tipos, estadísticas, altura y peso) y `/pokemon-species/{id}` (nombre, clase y
// descripción). Sin `import "server-only"`: lo usa la ficha, que es cliente.
import {
  isPokemonResponse,
  isPokemonSpeciesResponse,
  isRecord,
} from "./guards";
import { requestJson } from "./request";
import {
  STATS,
  type LocalizedEntry,
  type PokemonResponse,
  type PokemonSpeciesResponse,
  type StatName,
  type TypeName,
} from "./types";

/** Si los dos pedidos juntos tardan más que esto, se cortan y la ficha muestra el error. */
const TIMEOUT_MS = 10_000;

export interface PokemonDetail {
  id: number;
  /** El nombre en español ("Mr. Mime"); `/pokemon/386` se llama "deoxys-normal". */
  name: string;
  /** La clase en español ("Pokémon Ratón"), si existe. */
  genus: string | null;
  /** Primario y, si tiene, secundario. */
  types: TypeName[];
  /** Las 6 estadísticas base, en el orden de STATS. */
  stats: { name: StatName; value: number }[];
  heightMeters: number;
  weightKilos: number;
  /** Una descripción de la especie en español, si existe. */
  description: string | null;
  /** El sprite animado (GIF) y uno quieto, para movimiento reducido. Cualquiera puede faltar. */
  sprites: { animated: string | null; still: string | null };
}

/**
 * Pide los dos recursos en paralelo y arma la ficha. `signal` corta los pedidos (la ficha se
 * cerró o cambió de señal). Si falla cualquiera de los dos, falla la identificación.
 */
export async function fetchPokemonDetail(
  id: number,
  signal: AbortSignal,
): Promise<PokemonDetail> {
  // Una señal que se corta con la de afuera o a los 10 s. Se arma a mano y no con
  // `AbortSignal.any`, que llega recién en Chrome 116, Firefox 124 y Safari 17.4 (MDN
  // browser-compat-data), y Next 16 soporta desde Chrome 111, Firefox 111 y Safari 16.4
  // (node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md).
  const controller = new AbortController();
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener("abort", abort);
  timeout.addEventListener("abort", abort);
  const init = { signal: controller.signal };
  try {
    const [pokemon, species] = await Promise.all([
      requestJson(`/pokemon/${id}`, isPokemonResponse, init),
      requestJson(`/pokemon-species/${id}`, isPokemonSpeciesResponse, init),
    ]);
    return buildPokemonDetail(pokemon, species);
  } finally {
    signal.removeEventListener("abort", abort);
    timeout.removeEventListener("abort", abort);
  }
}

/** Cruza las dos respuestas en la ficha. Es pura: no usa la red. */
export function buildPokemonDetail(
  pokemon: PokemonResponse,
  species: PokemonSpeciesResponse,
): PokemonDetail {
  const sprites = pokemon.sprites;
  return {
    id: pokemon.id,
    name: inSpanish(species.names)[0]?.name ?? species.name,
    genus: inSpanish(species.genera)[0]?.genus ?? null,
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name),
    stats: STATS.map((name) => ({ name, value: baseStat(pokemon, name) })),
    // `height` viene en decímetros y `weight` en hectogramos.
    heightMeters: pokemon.height / 10,
    weightKilos: pokemon.weight / 10,
    // Los textos traen saltos de línea en medio de las oraciones: se unen con espacios.
    description:
      inSpanish(species.flavor_text_entries)
        .at(-1)
        ?.flavor_text.replace(/\s+/g, " ")
        .trim() ?? null,
    // El orden de respaldo de docs/hallazgos-pokeapi.md ("Sprites animados").
    sprites: {
      animated:
        urlAt(sprites, [
          "versions",
          "generation-v",
          "black-white",
          "animated",
          "front_default",
        ]) ?? urlAt(sprites, ["other", "showdown", "front_default"]),
      still:
        urlAt(sprites, ["front_default"]) ??
        urlAt(sprites, ["other", "official-artwork", "front_default"]),
    },
  };
}

/** Las entradas en español (`language.name === "es"`), en el orden en que vienen. */
function inSpanish<T extends LocalizedEntry>(entries: readonly T[]): T[] {
  return entries.filter((entry) => entry.language.name === "es");
}

function baseStat(pokemon: PokemonResponse, name: StatName): number {
  const entry = pokemon.stats.find((stat) => stat.stat.name === name);
  if (!entry) {
    throw new Error(`/pokemon/${pokemon.id} no trae la estadística ${name}`);
  }
  return entry.base_stat;
}

/** La URL que está en `path` dentro de `value`, o `null` si en el camino falta algo. */
function urlAt(value: unknown, path: readonly string[]): string | null {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === "string" ? current : null;
}
