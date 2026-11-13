// Cómo se nombra en la interfaz el lugar de cada señal: su hábitat y dónde está respecto del lugar
// con nombre más cercano ("el bosque, al noreste de Monte Brasa"); y de qué lado de su punto va el
// nombre de cada lugar del mapa. Es código de cliente, junto al mapa: src/lib/world/ es solo del
// servidor.
import type { HabitatName } from "@/lib/pokeapi/types";
import type { Place, Position, Spawn } from "@/lib/world/types";

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

/** Los 8 rumbos, desde el este y en sentido antihorario: el orden de los ángulos de Math.atan2. */
const DIRECTIONS = [
  "este",
  "noreste",
  "norte",
  "noroeste",
  "oeste",
  "sudoeste",
  "sur",
  "sudeste",
] as const;

/** Hasta qué distancia una señal está "en" un lugar y no "al norte de" él: 3 celdas (0,24°). */
const AT_PLACE_DEGREES = 0.24;

/** El lugar más cercano a un punto, o null si no hay lugares. */
function nearestPlace(
  [lng, lat]: Position,
  places: readonly Place[],
): Place | null {
  let nearest: Place | null = null;
  let nearestDistance = Infinity;
  for (const place of places) {
    const distance = Math.hypot(
      place.position[0] - lng,
      place.position[1] - lat,
    );
    if (distance < nearestDistance) {
      nearest = place;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Dónde está una señal, dicho desde el lugar con nombre más cercano, como en un mapa real: "la
 * llanura, al noreste de Campo Garza"; o "la ciudad de Villa Bruma" si está en el lugar mismo.
 * Los lagos no sirven de referencia: su nombre recién se ve con zoom.
 */
function describePlace(spawn: Spawn, places: readonly Place[]): string {
  const habitat = HABITAT_PLACES[spawn.habitat];
  const nearest = nearestPlace(
    spawn.position,
    places.filter((place) => place.kind !== "lake"),
  );
  if (!nearest) return habitat;
  const east = spawn.position[0] - nearest.position[0];
  const north = spawn.position[1] - nearest.position[1];
  if (Math.hypot(east, north) <= AT_PLACE_DEGREES) {
    return `${habitat} de ${nearest.name}`;
  }
  // El ángulo en octavos de vuelta: de -4 a 4, donde 0 es el este y 2 el norte.
  const octant = Math.round(Math.atan2(north, east) / (Math.PI / 4));
  const direction = DIRECTIONS[(octant + 8) % 8];
  if (direction === undefined)
    throw new RangeError(`Rumbo fuera de rango: ${octant}`);
  return `${habitat}, al ${direction} de ${nearest.name}`;
}

/**
 * El lugar de cada señal, en el orden en que vienen, y su etiqueta para el botón. Si varias
 * comparten lugar, la etiqueta las numera en ese orden ("el bosque, al noreste de Monte Brasa (2 de
 * 2)"): con lector de pantalla, dos botones con el mismo nombre no se distinguen. La ficha muestra
 * el lugar sin el número.
 */
export function signalPlaces(
  spawns: readonly Spawn[],
  places: readonly Place[],
) {
  const named = spawns.map((spawn) => ({
    spawn,
    place: describePlace(spawn, places),
  }));
  return named.map(({ spawn, place }, index) => {
    const total = named.filter((other) => other.place === place).length;
    if (total === 1) return { spawn, place, label: place };
    const order = named
      .slice(0, index + 1)
      .filter((other) => other.place === place).length;
    return { spawn, place, label: `${place} (${order} de ${total})` };
  });
}
