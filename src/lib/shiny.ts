// Las anomalías (docs/concepto.md, "Eventos del mundo"): de vez en cuando una señal es un Pokémon
// variocolor (shiny). Sale de la semilla, como el mundo: la misma señal es variocolor en cada carga y
// no cambia al abrirla de nuevo. Sin `import "server-only"`: lo usa la sala, en el navegador.
import { createRandom, deriveSeed } from "@/lib/geo/random";

/** Una de cada 64 señales, como propone el concepto para la demo. */
export const SHINY_ODDS = 64;

/** Si la señal de esta especie es variocolor en el mundo de esta semilla. */
export function isShiny(seed: number, speciesId: number): boolean {
  return (
    createRandom(deriveSeed(seed, `variocolor-${speciesId}`))() < 1 / SHINY_ODDS
  );
}
