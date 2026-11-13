// Cómo se nombran en la ficha los tipos y las estadísticas: los nombres oficiales en español, de
// `names` con `language.name === "es"` en `/type/{nombre}` y `/stat/{nombre}`
// (docs/hallazgos-pokeapi.md). Son fijos: no hace falta pedirlos cada vez.
import type { StatName, TypeName } from "@/lib/pokeapi/types";

export const TYPE_LABELS: Record<TypeName, string> = {
  normal: "Normal",
  fighting: "Lucha",
  flying: "Volador",
  poison: "Veneno",
  ground: "Tierra",
  rock: "Roca",
  bug: "Bicho",
  ghost: "Fantasma",
  steel: "Acero",
  fire: "Fuego",
  water: "Agua",
  grass: "Planta",
  electric: "Eléctrico",
  psychic: "Psíquico",
  ice: "Hielo",
  dragon: "Dragón",
  dark: "Siniestro",
  fairy: "Hada",
};

export const STAT_LABELS: Record<StatName, string> = {
  hp: "PS",
  attack: "Ataque",
  defense: "Defensa",
  "special-attack": "Ataque Especial",
  "special-defense": "Defensa Especial",
  speed: "Velocidad",
};
