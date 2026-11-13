// Validación de forma en el borde: lo que llega de la red es `unknown` hasta que
// uno de estos guards confirma que tiene la forma que esperamos. Así no hace
// falta ningún `as` para convencer a TypeScript.
import {
  STATS,
  TYPES,
  type HabitatResponse,
  type NamedApiResource,
  type PokemonResponse,
  type PokemonSpeciesResponse,
  type StatName,
  type TypeName,
  type TypeResponse,
} from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNamedApiResource(value: unknown): value is NamedApiResource {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.url === "string"
  );
}

function isTypeName(value: unknown): value is TypeName {
  return TYPES.some((type) => type === value);
}

function isStatName(value: unknown): value is StatName {
  return STATS.some((stat) => stat === value);
}

/** Una lista de textos con idioma, donde cada uno tiene el texto en `key` (`name`, `genus`…). */
function isLocalizedList(value: unknown, key: string): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry[key] === "string" &&
        isNamedApiResource(entry.language),
    )
  );
}

export function isHabitatResponse(value: unknown): value is HabitatResponse {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.pokemon_species) &&
    value.pokemon_species.every(isNamedApiResource)
  );
}

export function isTypeResponse(value: unknown): value is TypeResponse {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.pokemon) &&
    value.pokemon.every(
      (entry) =>
        isRecord(entry) &&
        (entry.slot === 1 || entry.slot === 2) &&
        isNamedApiResource(entry.pokemon),
    )
  );
}

export function isPokemonResponse(value: unknown): value is PokemonResponse {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.height === "number" &&
    typeof value.weight === "number" &&
    isRecord(value.sprites) &&
    Array.isArray(value.types) &&
    value.types.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.slot === "number" &&
        isRecord(entry.type) &&
        isTypeName(entry.type.name),
    ) &&
    Array.isArray(value.stats) &&
    value.stats.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.base_stat === "number" &&
        isRecord(entry.stat) &&
        isStatName(entry.stat.name),
    )
  );
}

export function isPokemonSpeciesResponse(
  value: unknown,
): value is PokemonSpeciesResponse {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isLocalizedList(value.names, "name") &&
    isLocalizedList(value.genera, "genus") &&
    isLocalizedList(value.flavor_text_entries, "flavor_text")
  );
}
