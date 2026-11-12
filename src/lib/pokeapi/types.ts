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
  pokemon: { slot: number; pokemon: NamedApiResource }[];
}

/** Una especie del dataset: lo mínimo para ubicarla en el mundo y mostrarla como señal. */
export interface Species {
  id: number;
  name: string;
  habitat: HabitatName;
  types: readonly [TypeName] | readonly [TypeName, TypeName];
}
