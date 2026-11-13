// Las señales del mundo: qué especies aparecen y dónde. Se ubican en el servidor, al compilar, y
// con semilla: el mismo mundo y el mismo dataset dan siempre las mismas señales.
import "server-only";

import { HABITATS, type HabitatName, type Species } from "@/lib/pokeapi/types";
import { SEA_BORDER_CELLS } from "@/lib/world/fields";
import {
  cellCenter,
  cellDistance,
  distanceToEdge,
  gridToLngLat,
  lngLatToCell,
  neighbors4,
  valueAt,
} from "@/lib/world/grid";
import type { Spawn } from "@/lib/world/types";

import { createRandom, deriveSeed } from "./random";

/** Cuántas señales tiene el mundo. Cada una es una especie distinta. */
export const SPAWN_COUNT = 40;

/**
 * Separación mínima entre señales, en celdas de 0,08°. Los botones miden 20 px, y para botones de
 * menos de 24 px WCAG 2.5.8 pide los centros a 24 px o más. Medido con 14 celdas en pantallas
 * verticales: 24,2 px a 344 px de ancho, 25,2 a 360, 26,3 a 375 y 27,3 a 390; a 320 quedan a 22,2
 * y no cumple. Con 12 quedaban a 23,3 px a 390 (docs/errores.md, E-10).
 */
const MIN_SPACING = 14;

/** Las señales del mar van a lo sumo a esta cantidad de pasos de celda de la costa. */
const SEA_REACH = 8;

/** Intentos por señal antes de rendirse, como en placeCities. */
const MAX_ATTEMPTS = 1000;

/**
 * Elige SPAWN_COUNT especies y le da a cada una un lugar en su hábitat. Lanza si alguna no entra
 * o si el resultado no pasa el chequeo: el build falla en lugar de publicar señales rotas.
 */
export function placeSpawns(
  cells: readonly HabitatName[],
  species: readonly Species[],
  seed: number,
): Spawn[] {
  const random = createRandom(deriveSeed(seed, "señales"));
  const candidates = candidateCells(cells);
  const quotas = allocate(SPAWN_COUNT, speciesPerHabitat(species));
  const taken: number[] = [];
  const spawns: Spawn[] = [];

  // Primero los hábitats con menos lugar: si los grandes ocuparan antes, a los chicos podría no
  // quedarles dónde.
  const order = [...HABITATS].sort(
    (a, b) => candidates[a].length - candidates[b].length,
  );
  for (const habitat of order) {
    const pool = species.filter((s) => s.habitat === habitat);
    for (const { id } of pickSome(pool, quotas[habitat], random)) {
      const cell = pickCell(candidates[habitat], taken, random);
      if (cell === undefined) {
        throw new Error(
          `No entró la señal de la especie ${id} (${habitat}) a ${MIN_SPACING} celdas de las demás`,
        );
      }
      taken.push(cell);
      spawns.push({
        speciesId: id,
        habitat,
        position: gridToLngLat(...cellCenter(cell)),
      });
    }
  }

  spawns.sort((a, b) => a.speciesId - b.speciesId);
  assertSpawns(spawns, cells);
  return spawns;
}

/**
 * Dónde puede ir una señal de cada hábitat: en celdas rodeadas por su mismo hábitat, para que el
 * marcador no quede sobre el borde de un bioma. Las del mar, además, cerca de la costa y fuera
 * de la franja de mar del borde del mundo.
 */
function candidateCells(
  cells: readonly HabitatName[],
): Record<HabitatName, number[]> {
  const steps = stepsToLand(cells);
  const candidates = perHabitat((): number[] => []);
  cells.forEach((habitat, index) => {
    if (!neighbors4(index).every((neighbor) => cells[neighbor] === habitat)) {
      return;
    }
    if (habitat === "sea") {
      const [x, y] = cellCenter(index);
      if (
        valueAt(steps, index) > SEA_REACH ||
        distanceToEdge(x, y) < SEA_BORDER_CELLS
      ) {
        return;
      }
    }
    candidates[habitat].push(index);
  });
  return candidates;
}

/**
 * Pasos de celda vecina en celda vecina desde cada celda hasta la tierra más cercana (todo lo
 * que no es mar). La tierra vale 0.
 */
function stepsToLand(cells: readonly HabitatName[]): number[] {
  const steps = cells.map((habitat) => (habitat === "sea" ? Infinity : 0));
  // Búsqueda en anchura desde toda la tierra a la vez: la cola crece mientras se recorre.
  const queue = cells.flatMap((habitat, index) =>
    habitat === "sea" ? [] : [index],
  );
  for (const index of queue) {
    const next = valueAt(steps, index) + 1;
    for (const neighbor of neighbors4(index)) {
      if (valueAt(steps, neighbor) > next) {
        steps[neighbor] = next;
        queue.push(neighbor);
      }
    }
  }
  return steps;
}

/** Cuántas especies tiene cada hábitat. */
function speciesPerHabitat(
  species: readonly Species[],
): Record<HabitatName, number> {
  const counts = perHabitat(() => 0);
  for (const { habitat } of species) counts[habitat] += 1;
  return counts;
}

/**
 * Reparte `total` entre los hábitats en proporción a `weights`, con el método del mayor resto:
 * cada hábitat recibe la parte entera de su cuota, y las que faltan van a los de mayor resto.
 */
function allocate(
  total: number,
  weights: Record<HabitatName, number>,
): Record<HabitatName, number> {
  const sum = HABITATS.reduce((acc, habitat) => acc + weights[habitat], 0);
  const shares = HABITATS.map((habitat) => ({
    habitat,
    share: (total * weights[habitat]) / sum,
  }));
  const quotas = perHabitat(() => 0);
  for (const { habitat, share } of shares) quotas[habitat] = Math.floor(share);
  const missing =
    total - HABITATS.reduce((acc, habitat) => acc + quotas[habitat], 0);
  const byRemainder = [...shares].sort((a, b) => (b.share % 1) - (a.share % 1));
  for (const { habitat } of byRemainder.slice(0, missing)) quotas[habitat] += 1;
  return quotas;
}

/** Saca `count` elementos al azar de `items`, sin repetir: como sacar de una bolsa. */
function pickSome<T>(
  items: readonly T[],
  count: number,
  random: () => number,
): T[] {
  const bag = [...items];
  const picked: T[] = [];
  while (picked.length < count) {
    const [item] = bag.splice(Math.floor(random() * bag.length), 1);
    if (item === undefined) {
      throw new Error(`Se pidieron ${count} y había ${items.length}`);
    }
    picked.push(item);
  }
  return picked;
}

/** Una celda al azar de `candidates` a MIN_SPACING o más de las tomadas; undefined si no aparece. */
function pickCell(
  candidates: readonly number[],
  taken: readonly number[],
  random: () => number,
): number | undefined {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cell = candidates[Math.floor(random() * candidates.length)];
    if (cell === undefined) return undefined;
    if (taken.every((other) => cellDistance(other, cell) >= MIN_SPACING)) {
      return cell;
    }
  }
  return undefined;
}

/**
 * Comprueba el resultado desde las posiciones que viajan al mapa: la cantidad, que ninguna
 * especie se repita, que cada hábitat tenga al menos una señal, que cada una caiga en una celda
 * de su hábitat y que estén separadas. Lanza con el primer problema.
 */
function assertSpawns(
  spawns: readonly Spawn[],
  cells: readonly HabitatName[],
): void {
  if (spawns.length !== SPAWN_COUNT) {
    throw new Error(
      `Se esperaban ${SPAWN_COUNT} señales y hay ${spawns.length}`,
    );
  }
  if (new Set(spawns.map((s) => s.speciesId)).size !== spawns.length) {
    throw new Error("Hay una especie repetida entre las señales");
  }
  for (const habitat of HABITATS) {
    if (!spawns.some((s) => s.habitat === habitat)) {
      throw new Error(`El hábitat ${habitat} quedó sin señales`);
    }
  }
  const located = spawns.map((spawn) => ({
    spawn,
    cell: lngLatToCell(spawn.position),
  }));
  located.forEach(({ spawn, cell }, i) => {
    if (cells[cell] !== spawn.habitat) {
      throw new Error(
        `La señal de la especie ${spawn.speciesId} es de ${spawn.habitat} y cayó en ${cells[cell]}`,
      );
    }
    for (const other of located.slice(i + 1)) {
      if (cellDistance(cell, other.cell) < MIN_SPACING) {
        throw new Error(
          `Las señales de las especies ${spawn.speciesId} y ${other.spawn.speciesId} están a menos de ${MIN_SPACING} celdas`,
        );
      }
    }
  });
}

/** Un valor por hábitat, creado con `make`. Los 9 van escritos: TypeScript exige que estén todos. */
function perHabitat<T>(make: () => T): Record<HabitatName, T> {
  return {
    cave: make(),
    forest: make(),
    grassland: make(),
    mountain: make(),
    rare: make(),
    "rough-terrain": make(),
    sea: make(),
    urban: make(),
    "waters-edge": make(),
  };
}
