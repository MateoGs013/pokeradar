// Las señales del mapa real: especies del mundo generado, en zonas reales de Argentina de su
// hábitat (argentina.ts). Se ubican en el servidor, al compilar, y con semilla, como las del mundo
// (spawns.ts): el mismo mundo da siempre las mismas.
import "server-only";

import { HABITATS, type HabitatName } from "@/lib/pokeapi/types";
import type { Position, Spawn } from "@/lib/world/types";

import {
  ARGENTINA_BOUNDS,
  ARGENTINA_GRID,
  distanceKm,
  fromReal,
  KM_PER_DEGREE,
  toReal,
  type Zone,
  ZONES,
  zoneOf,
} from "./argentina";
import { createRandom, deriveSeed } from "./random";
import { allocate, countByHabitat, MIN_SPACING, pickSome } from "./spawns";

/**
 * Cuántas señales tiene el mapa real. Menos que el mundo: las zonas son pocas por hábitat, y la
 * separación mínima es la misma. Repartidas como las 40 del mundo, con 16 o con 20 el hábitat raro
 * se queda sin señales, y con 22, con la semilla 151, no entran en 500 vueltas (docs/decisiones.md,
 * "Las señales del mapa real").
 */
export const ARGENTINA_SPAWN_COUNT = 18;

/** Vueltas de sorteo antes de rendirse: si una señal no entra, se sortean todas de nuevo. */
const MAX_ROUNDS = 500;

/** Puntos al azar que se prueban para cada señal, en cada vuelta. */
const MAX_ATTEMPTS = 1000;

/**
 * La separación mínima del mundo (spawns.ts, MIN_SPACING), en grados del mundo. El mundo del modo
 * real es vertical, así que el caso peor de WCAG 2.5.8 (con botones de 20 px, centros a 24 px o
 * más) cambia de lado. Medido entre los centros de las 18 señales: 30,5 px a 320 × 568, 36,8 a
 * 390 × 844 y 63,7 a 1440 × 900; en horizontal, 24,7 desde 345 px de alto, y no cumple con menos:
 * 23,8 a 340 y 22,5 a 568 × 320.
 */
const MIN_DISTANCE =
  MIN_SPACING *
  ((ARGENTINA_BOUNDS[1][0] - ARGENTINA_BOUNDS[0][0]) / ARGENTINA_GRID.width);

/** Redondear la posición a 4 decimales la mueve hasta unos 20 m: el chequeo lo tolera. */
const ROUNDING_KM = 0.1;

const RAD = Math.PI / 180;

/**
 * Elige ARGENTINA_SPAWN_COUNT especies entre las señales del mundo, con cupos por hábitat en la
 * misma proporción, y le da a cada una un punto en una zona de su hábitat. Lanza si no entran en
 * MAX_ROUNDS vueltas o si el resultado no pasa el chequeo: el build falla en lugar de publicar
 * señales rotas.
 */
export function placeArgentinaSpawns(
  world: readonly Spawn[],
  seed: number,
): Spawn[] {
  const quotas = allocate(ARGENTINA_SPAWN_COUNT, countByHabitat(world));
  // Primero los hábitats con menos lugar, como en el mundo: los de zonas más chicas.
  const order = [...HABITATS].sort((a, b) => zoneArea(a) - zoneArea(b));
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const random = createRandom(
      deriveSeed(seed, round === 0 ? "argentina" : `argentina-${round}`),
    );
    const spawns = placeRound(world, quotas, order, random);
    if (spawns) {
      spawns.sort((a, b) => a.speciesId - b.speciesId);
      assertArgentinaSpawns(spawns);
      return spawns;
    }
  }
  throw new Error(
    `Las señales del mapa real no entraron en ${MAX_ROUNDS} vueltas`,
  );
}

/** El área de las zonas de un hábitat, sin el π: alcanza para ordenarlos. */
function zoneArea(habitat: HabitatName): number {
  return ZONES.filter((zone) => zone.habitat === habitat).reduce(
    (total, zone) => total + zone.radiusKm ** 2,
    0,
  );
}

/** Una vuelta de sorteo: las señales, o null si alguna no entró. */
function placeRound(
  world: readonly Spawn[],
  quotas: Record<HabitatName, number>,
  order: readonly HabitatName[],
  random: () => number,
): Spawn[] | null {
  const spawns: Spawn[] = [];
  for (const habitat of order) {
    const zones = ZONES.filter((zone) => zone.habitat === habitat);
    const pool = world.filter((spawn) => spawn.habitat === habitat);
    for (const { speciesId } of pickSome(pool, quotas[habitat], random)) {
      const position = pickPosition(zones, spawns, random);
      if (!position) return null;
      spawns.push({ speciesId, habitat, position });
    }
  }
  return spawns;
}

/**
 * Un punto al azar en una de las zonas, dentro del mundo y a MIN_DISTANCE o más de las señales
 * tomadas; undefined si no aparece.
 */
function pickPosition(
  zones: readonly Zone[],
  taken: readonly Spawn[],
  random: () => number,
): Position | undefined {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const zone = zones[Math.floor(random() * zones.length)];
    if (zone === undefined) return undefined;
    const [x, y] = fromReal(pointInZone(zone, random));
    const position: Position = [round4(x), round4(y)];
    if (!insideWorld(position)) continue;
    if (
      taken.every(
        (other) => worldDistance(other.position, position) >= MIN_DISTANCE,
      )
    ) {
      return position;
    }
  }
  return undefined;
}

/**
 * Un punto al azar en el círculo de la zona, parejo por área: con la distancia al centro pareja,
 * se amontonarían cerca del centro. A pocos km, la Tierra se toma plana.
 */
function pointInZone(
  { center: [lng, lat], radiusKm }: Zone,
  random: () => number,
): Position {
  const distance = radiusKm * Math.sqrt(random());
  const bearing = 2 * Math.PI * random();
  return [
    lng +
      (distance * Math.sin(bearing)) / (KM_PER_DEGREE * Math.cos(lat * RAD)),
    lat + (distance * Math.cos(bearing)) / KM_PER_DEGREE,
  ];
}

function round4(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

function insideWorld([x, y]: Position): boolean {
  const [[west, south], [east, north]] = ARGENTINA_BOUNDS;
  return x >= west && x <= east && y >= south && y <= north;
}

function worldDistance([x1, y1]: Position, [x2, y2]: Position): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

/**
 * Comprueba el resultado desde las posiciones que viajan al mapa: la cantidad, que ninguna especie
 * se repita, que cada hábitat tenga al menos una señal, que cada una caiga dentro del mundo y de la
 * zona que la nombra (zoneOf), y que estén separadas. Lanza con el primer problema.
 */
function assertArgentinaSpawns(spawns: readonly Spawn[]): void {
  if (spawns.length !== ARGENTINA_SPAWN_COUNT) {
    throw new Error(
      `Se esperaban ${ARGENTINA_SPAWN_COUNT} señales en el mapa real y hay ${spawns.length}`,
    );
  }
  if (new Set(spawns.map((s) => s.speciesId)).size !== spawns.length) {
    throw new Error("Hay una especie repetida entre las señales del mapa real");
  }
  for (const habitat of HABITATS) {
    if (!spawns.some((s) => s.habitat === habitat)) {
      throw new Error(
        `El hábitat ${habitat} quedó sin señales en el mapa real`,
      );
    }
  }
  spawns.forEach((spawn, i) => {
    if (!insideWorld(spawn.position)) {
      throw new Error(
        `La señal de la especie ${spawn.speciesId} quedó fuera del mapa real`,
      );
    }
    const zone = zoneOf(spawn);
    const km = distanceKm(zone.center, toReal(spawn.position));
    if (km > zone.radiusKm + ROUNDING_KM) {
      throw new Error(
        `La señal de la especie ${spawn.speciesId} quedó a ${km.toFixed(1)} km del centro de ${zone.name}, de ${zone.radiusKm} km de radio`,
      );
    }
    for (const other of spawns.slice(i + 1)) {
      if (worldDistance(spawn.position, other.position) < MIN_DISTANCE) {
        throw new Error(
          `Las señales de las especies ${spawn.speciesId} y ${other.speciesId} están a menos de ${MIN_SPACING} celdas`,
        );
      }
    }
  });
}
