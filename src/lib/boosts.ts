// Lo que potencia tipos: el clima (lib/weather/) y la noche (lib/night.ts). Potenciar marca la señal
// y la ficha; no cambia qué señales hay.
import type { TypeName } from "@/lib/pokeapi/types";

export interface Boost {
  /** Para "potenciado por la lluvia". */
  by: string;
  types: readonly TypeName[];
}

/** Lo primero que potencia alguno de los tipos, o nada. */
export function boostOf(
  boosts: readonly Boost[],
  types: readonly TypeName[],
): Boost | undefined {
  return boosts.find((boost) =>
    types.some((type) => boost.types.includes(type)),
  );
}
