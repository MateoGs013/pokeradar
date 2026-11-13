// Mar abierto y lagos: los dos están por debajo del nivel del mar, pero el concepto pone los
// lagos en el hábitat waters-edge (costas, lagos y ríos) y el mar abierto en sea.
import "server-only";

import {
  borderCells,
  CELL_COUNT,
  cellCenter,
  neighbors4,
  valueAt,
} from "./grid";

/**
 * Celdas de lago: agua (altura por debajo de `seaLevel`) que no se conecta con el borde del mundo.
 * Se rellena desde el borde, como el balde de pintura de un editor de imágenes: todo el agua que
 * se alcanza pasando de vecina en vecina es mar abierto; la que queda sin alcanzar es lago.
 */
export function findLakes(
  height: readonly number[],
  seaLevel: number,
): Set<number> {
  const isWater = (index: number) => valueAt(height, index) < seaLevel;

  const openSea = new Set<number>(borderCells().filter(isWater));
  // `for...of` sobre un arreglo también recorre lo que se agrega durante el recorrido: es una cola.
  const queue = [...openSea];
  for (const cell of queue) {
    for (const neighbor of neighbors4(cell)) {
      if (isWater(neighbor) && !openSea.has(neighbor)) {
        openSea.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  const lakes = new Set<number>();
  for (let index = 0; index < CELL_COUNT; index++) {
    if (isWater(index) && !openSea.has(index)) lakes.add(index);
  }
  return lakes;
}

/**
 * Separa las celdas de lago en lagos: cada grupo de celdas que se tocan por un lado es uno. El
 * mismo relleno que `findLakes`, empezando desde cada celda que todavía no tiene lago.
 */
export function splitLakes(lakeCells: ReadonlySet<number>): number[][] {
  const assigned = new Set<number>();
  const lakes: number[][] = [];
  for (const start of lakeCells) {
    if (assigned.has(start)) continue;
    assigned.add(start);
    const lake = [start];
    for (const cell of lake) {
      for (const neighbor of neighbors4(cell)) {
        if (lakeCells.has(neighbor) && !assigned.has(neighbor)) {
          assigned.add(neighbor);
          lake.push(neighbor);
        }
      }
    }
    lakes.push(lake);
  }
  return lakes;
}

/**
 * La celda del lago más cercana a su centro: ahí va el nombre. El centro de un lago con forma de
 * medialuna puede caer en tierra; la celda más cercana a él siempre es agua.
 */
export function lakeLabelCell(lake: readonly number[]): number {
  const centers = lake.map(cellCenter);
  const cx = centers.reduce((sum, [x]) => sum + x, 0) / centers.length;
  const cy = centers.reduce((sum, [, y]) => sum + y, 0) / centers.length;
  let best: number | undefined;
  let bestDistance = Infinity;
  centers.forEach(([x, y], i) => {
    const distance = Math.hypot(x - cx, y - cy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = lake[i];
    }
  });
  if (best === undefined) throw new Error("Un lago sin celdas");
  return best;
}
