// Cómo se nombra en la interfaz el lugar de cada señal: su hábitat y la parte del mundo donde está
// ("el bosque del norte"); y de qué lado de su punto va el nombre de cada lugar del mapa. Es código
// de cliente, junto al mapa: src/lib/world/ es solo del servidor.
import type { Bounds } from "@/lib/geo/bounds";
import type { HabitatName } from "@/lib/pokeapi/types";
import type { Position, Spawn } from "@/lib/world/types";

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

/** De qué lado del punto va un nombre del mapa: el ancla de MapLibre es el borde del texto que lo toca. */
export type LabelAnchor = "top" | "bottom" | "left" | "right";

/** Los cuatro lados posibles del nombre, con la dirección (este, norte) hacia donde queda el texto. */
const LABEL_SIDES: readonly {
  anchor: LabelAnchor;
  east: number;
  north: number;
}[] = [
  { anchor: "top", east: 0, north: -1 }, // el texto abajo del punto
  { anchor: "bottom", east: 0, north: 1 }, // arriba
  { anchor: "left", east: 1, north: 0 }, // a la derecha
  { anchor: "right", east: -1, north: 0 }, // a la izquierda
];

/** Las señales que cuentan para elegir el lado: las que están a menos de 1° (12,5 celdas). */
const NEARBY_DEGREES = 1;

/**
 * De qué lado del punto va el nombre de un lugar: el que tiene menos señales cerca. Cada señal suma
 * al lado hacia el que está, más cuanto más de frente (el coseno del ángulo) y cuanto más cerca (1
 * sobre la distancia). La señal de cada ciudad y la del volcán caen a 1 o 2 celdas del lugar y
 * pesan mucho: el nombre suele ir del otro lado y, al acercar, se alejan en lugar de cruzarse. Si
 * empatan, gana el primero de la lista: abajo del punto.
 */
export function labelAnchor(
  [lng, lat]: Position,
  spawns: readonly Spawn[],
): LabelAnchor {
  let best: LabelAnchor = "top";
  let bestScore = Infinity;
  for (const side of LABEL_SIDES) {
    let score = 0;
    for (const { position } of spawns) {
      const east = position[0] - lng;
      const north = position[1] - lat;
      const distance = Math.hypot(east, north);
      if (distance === 0 || distance > NEARBY_DEGREES) continue;
      const facing = (east * side.east + north * side.north) / distance;
      if (facing > 0) score += facing / distance;
    }
    if (score < bestScore) {
      bestScore = score;
      best = side.anchor;
    }
  }
  return best;
}

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
