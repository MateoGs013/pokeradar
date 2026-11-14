// La tripulación (docs/concepto.md, "La tripulación"): PokéAPI no tiene personajes humanos, así que
// los que avisan son Pokémon, cada uno de lo suyo. Los sprites son los de PokéAPI, como los de la
// ficha.
const SPRITES =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const CREW = {
  /** El sistema: arranque, radar y cobertura. */
  rotom: { name: "Rotom", sprite: `${SPRITES}/479.png` },
  /** Los análisis: la especie identificada y su nivel de amenaza. */
  porygon: { name: "Porygon", sprite: `${SPRITES}/137.png` },
  /** Los avistamientos: las señales que detecta el radar. */
  pelipper: { name: "Pelipper", sprite: `${SPRITES}/279.png` },
  /** El pronóstico: el clima y los tipos que potencia. */
  xatu: { name: "Xatu", sprite: `${SPRITES}/178.png` },
  /** La guardia nocturna. */
  noctowl: { name: "Noctowl", sprite: `${SPRITES}/164.png` },
} as const;

export type CrewMember = keyof typeof CREW;

/**
 * Las prioridades de un sistema de monitoreo. Un aviso crítico se anuncia como alerta al lector de
 * pantalla; los otros, sin interrumpir.
 */
export type NoticePriority = "informativo" | "alerta" | "critico";
