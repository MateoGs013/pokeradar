// Validación de forma en el borde: lo que llega de la red es `unknown` hasta que
// uno de estos guards confirma que tiene la forma que esperamos. Así no hace
// falta ningún `as` para convencer a TypeScript.
import type { HabitatResponse, NamedApiResource, TypeResponse } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNamedApiResource(value: unknown): value is NamedApiResource {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.url === "string"
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
