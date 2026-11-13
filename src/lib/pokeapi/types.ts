// Tipos de PokéAPI que usa la app, en un solo lugar.
// Solo se declaran los campos que leemos; el resto de cada respuesta se ignora.

/** Los 9 hábitats de PokéAPI (solo los tienen las especies de las generaciones 1 a 3). */
export const HABITATS = [
  "cave",
  "forest",
  "grassland",
  "mountain",
  "rare",
  "rough-terrain",
  "sea",
  "urban",
  "waters-edge",
] as const;

export type HabitatName = (typeof HABITATS)[number];

/** Los 18 tipos con especies. PokéAPI lista además stellar, unknown y shadow, sin especies entre 1 y 386. */
export const TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

export type TypeName = (typeof TYPES)[number];

/** Las 6 estadísticas base, en el orden en que las lista `/pokemon/{id}` → `stats`. */
export const STATS = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const;

export type StatName = (typeof STATS)[number];

/** Referencia a otro recurso de PokéAPI: nombre y URL. */
export interface NamedApiResource {
  name: string;
  url: string;
}

/** Respuesta de `/pokemon-habitat/{nombre}`. */
export interface HabitatResponse {
  name: string;
  pokemon_species: NamedApiResource[];
}

/** Respuesta de `/type/{nombre}`. `slot` es 1 para el tipo primario y 2 para el secundario. */
export interface TypeResponse {
  name: string;
  pokemon: { slot: 1 | 2; pokemon: NamedApiResource }[];
}

/**
 * Respuesta de `/pokemon/{id}`: altura en decímetros y peso en hectogramos. `sprites` solo se
 * valida como objeto: cada ruta adentro puede faltar o venir en `null`, y detail.ts la lee con
 * cuidado.
 */
export interface PokemonResponse {
  id: number;
  height: number;
  weight: number;
  types: { slot: number; type: { name: TypeName } }[];
  stats: { base_stat: number; stat: { name: StatName } }[];
  sprites: Record<string, unknown>;
}

/** Un texto de PokéAPI en un idioma (`language.name`: "es", "en", …). */
export interface LocalizedEntry {
  language: NamedApiResource;
}

/** Respuesta de `/pokemon-species/{id}`: nombre, clase ("Pokémon Ratón") y descripciones. */
export interface PokemonSpeciesResponse {
  name: string;
  names: (LocalizedEntry & { name: string })[];
  genera: (LocalizedEntry & { genus: string })[];
  flavor_text_entries: (LocalizedEntry & { flavor_text: string })[];
}

/** Una especie del dataset: lo mínimo para ubicarla en el mundo y mostrarla como señal. */
export interface Species {
  id: number;
  name: string;
  habitat: HabitatName;
  types: readonly [TypeName] | readonly [TypeName, TypeName];
}
