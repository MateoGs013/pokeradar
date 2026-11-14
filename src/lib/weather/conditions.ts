// El clima del mundo (docs/concepto.md, "Eventos del mundo"): el código WMO que da Open-Meteo se
// reduce a seis condiciones, y cada una potencia algunos tipos. El concepto fija tres (la lluvia
// potencia Agua y Eléctrico; la nieve, Hielo; el sol, Fuego); el resto completa la tabla. De noche
// no hay sol: el cielo despejado no potencia nada. Potenciar marca la señal y la ficha: no cambia
// qué señales hay.
import type { Boost } from "@/lib/boosts";
import type { TypeName } from "@/lib/pokeapi/types";

export type Condition = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export interface Weather {
  condition: Condition;
  /** En °C, a 2 m del suelo. */
  temperature: number;
}

export const CONDITIONS: Record<
  Condition,
  {
    /** Cómo se nombra en el HUD y en la ficha. */
    label: string;
    /** Para "potenciado por la lluvia". */
    by: string;
    boosted: readonly TypeName[];
  }
> = {
  clear: {
    label: "Despejado",
    by: "el sol",
    boosted: ["fire", "grass", "ground"],
  },
  cloudy: {
    label: "Nublado",
    by: "las nubes",
    boosted: ["fairy", "fighting", "poison"],
  },
  // Neblina y no niebla: la niebla es la del radar, la que tapa el mundo.
  fog: { label: "Neblina", by: "la neblina", boosted: ["ghost", "dark"] },
  rain: {
    label: "Lluvia",
    by: "la lluvia",
    boosted: ["water", "electric", "bug"],
  },
  snow: { label: "Nieve", by: "la nieve", boosted: ["ice", "steel"] },
  storm: {
    label: "Tormenta",
    by: "la tormenta",
    boosted: ["electric", "flying", "dragon"],
  },
};

/**
 * La condición de un código WMO, con la tabla de Open-Meteo (open-meteo.com/en/docs, "WMO Weather
 * interpretation codes"): 0 y 1, despejado; 2 y 3, nublado; 45 y 48, neblina; llovizna, lluvia y
 * chaparrones (51 a 67, 80 a 82), lluvia; nieve (71 a 77, 85 y 86); tormenta (95 a 99). Un código
 * fuera de la tabla da `null`.
 */
export function conditionOf(code: number): Condition | null {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return null;
}

/**
 * Lo que potencia el clima ahora, o nada: de noche, el cielo despejado no tiene sol (la noche
 * potencia lo suyo, lib/night.ts).
 */
export function weatherBoost(weather: Weather, night: boolean): Boost | null {
  if (night && weather.condition === "clear") return null;
  const { by, boosted } = CONDITIONS[weather.condition];
  return { by, types: boosted };
}
