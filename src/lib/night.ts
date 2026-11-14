// Día y noche (docs/concepto.md, "Eventos del mundo"): con la hora del reloj del operador. De noche
// el mapa se oscurece, Noctowl toma la guardia y se potencian Fantasma y Siniestro.
import type { Boost } from "@/lib/boosts";

/** De 20:00 a 6:59. */
export function isNight(hour: number): boolean {
  return hour >= 20 || hour < 7;
}

export const NIGHT_BOOST: Boost = { by: "la noche", types: ["ghost", "dark"] };
