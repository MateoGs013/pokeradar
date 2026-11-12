// Mar abierto y lagos: los dos están por debajo del nivel del mar, pero el concepto pone los
// lagos en el hábitat waters-edge (costas, lagos y ríos) y el mar abierto en sea.
import "server-only";

import { borderCells, CELL_COUNT, neighbors4, valueAt } from "./grid";

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
