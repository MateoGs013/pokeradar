// Cómo se nombra en la interfaz el lugar de cada señal: su hábitat y la parte del mundo donde está
// ("el bosque del norte"). Vive junto a su único uso, los botones de las señales (cliente):
// src/lib/world/ es solo del servidor.
import type { Bounds } from "@/lib/geo/bounds";
import type { HabitatName } from "@/lib/pokeapi/types";
import type { Spawn } from "@/lib/world/types";

/** El lugar de cada hábitat. */
const HABITAT_PLACES: Record<HabitatName, string> = {
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

/** Las 9 partes del mundo: filas de sur a norte y columnas de oeste a este. */
const SECTORS = [
  ["sudoeste", "sur", "sudeste"],
  ["oeste", "centro", "este"],
  ["noroeste", "norte", "noreste"],
] as const;

/** En qué tercio de [min, max] cae un valor: 0 el primero y 2 el último. */
function third(value: number, min: number, max: number): 0 | 1 | 2 {
  const fraction = (value - min) / (max - min);
  if (fraction < 1 / 3) return 0;
  if (fraction < 2 / 3) return 1;
  return 2;
}

/**
 * El lugar de cada señal, en el orden en que vienen: su hábitat y la parte del mundo donde cae.
 * Si varias comparten lugar, se numeran en ese orden ("las cuevas del centro (2 de 3)"): con
 * lector de pantalla, dos botones con el mismo nombre no se distinguen.
 */
export function signalPlaces(
  spawns: readonly Spawn[],
  [[west, south], [east, north]]: Bounds,
) {
  const named = spawns.map((spawn) => {
    const [lng, lat] = spawn.position;
    const sector = SECTORS[third(lat, south, north)][third(lng, west, east)];
    return { spawn, place: `${HABITAT_PLACES[spawn.habitat]} del ${sector}` };
  });
  return named.map(({ spawn, place }, index) => {
    const total = named.filter((other) => other.place === place).length;
    if (total === 1) return { spawn, place };
    const order = named
      .slice(0, index + 1)
      .filter((other) => other.place === place).length;
    return { spawn, place: `${place} (${order} de ${total})` };
  });
}
