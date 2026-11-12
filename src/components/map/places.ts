// Cómo se nombra cada hábitat en la interfaz: el lugar del mundo donde aparece una señal.
// Vive junto a su único uso, los botones de las señales (cliente): src/lib/world/ es solo del servidor.
import type { HabitatName } from "@/lib/pokeapi/types";

/** El lugar de cada hábitat, para completar "Señal sin identificar en …". */
export const HABITAT_PLACES: Record<HabitatName, string> = {
  cave: "las cuevas",
  forest: "el bosque",
  grassland: "la llanura",
  mountain: "la montaña",
  rare: "el volcán",
  "rough-terrain": "la zona árida",
  sea: "el mar",
  urban: "la ciudad",
  "waters-edge": "la orilla",
};
