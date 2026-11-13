// La niebla: un canvas con un píxel por celda del mundo, que MapLibre estira sobre el mapa como
// una capa raster (fuente `canvas`). Cada píxel es opaco mientras la celda está cubierta y
// transparente cuando el radar la despejó. MapLibre filtra la textura en lineal al estirarla, así
// que el borde entre lo cubierto y lo despejado sale suave sin dibujarlo.
//
// El canvas tiene un píxel más de cada lado, fuera del mundo, que nunca se despeja: el borde de
// una capa raster no cubre entero su último píxel de pantalla, y sin ese margen se veía una línea
// de mar sin niebla en el borde del mundo (medido a 320 px).
import type { Bounds } from "@/lib/geo/bounds";
import type { Position } from "@/lib/world/types";

export interface Fog {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  /** Los píxeles del canvas: se editan acá y se copian al canvas con putImageData. */
  image: ImageData;
  /** 1 si la celda ya se despejó: fila por fila, de norte a sur, como la grilla del mundo. */
  cleared: Uint8Array;
  /** Celdas de la grilla del mundo (el canvas tiene dos más en cada sentido, por el margen). */
  width: number;
  height: number;
  /** Extensión del mundo, sin el margen. */
  bounds: Bounds;
}

/** Píxeles de margen de cada lado del canvas. */
const MARGIN = 1;

/** Una niebla que cubre todo el mundo, pintada con `color` (un color de CSS). */
export function createFog(
  width: number,
  height: number,
  bounds: Bounds,
  color: string,
): Fog {
  const canvas = document.createElement("canvas");
  canvas.width = width + 2 * MARGIN;
  canvas.height = height + 2 * MARGIN;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("El navegador no dio un contexto 2D para la niebla");
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return {
    canvas,
    context,
    image: context.getImageData(0, 0, canvas.width, canvas.height),
    cleared: new Uint8Array(width * height),
    width,
    height,
    bounds,
  };
}

/** Las cuatro esquinas del canvas sobre el mapa, con el margen, en el orden que pide MapLibre. */
export function fogCorners(fog: Fog): [Position, Position, Position, Position] {
  const [[worldWest, worldSouth], [worldEast, worldNorth]] = fog.bounds;
  const margin = (MARGIN * (worldEast - worldWest)) / fog.width;
  const west = worldWest - margin;
  const east = worldEast + margin;
  const south = worldSouth - margin;
  const north = worldNorth + margin;
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}

export const FULL_TURN = 2 * Math.PI;

/**
 * Si `point` cae en el sector del círculo entre los ángulos `from` y `to`: en radianes, desde el
 * norte y en el sentido de las agujas del reloj, como un radar. Un sector de 0 a FULL_TURN es el
 * círculo entero.
 */
export function inSector(
  center: Position,
  radius: number,
  from: number,
  to: number,
  point: Position,
): boolean {
  const east = point[0] - center[0];
  const north = point[1] - center[1];
  if (east * east + north * north > radius * radius) return false;
  // atan2(este, norte): 0 al norte, π/2 al este. Se pasa a [0, 2π).
  const angle = (Math.atan2(east, north) + FULL_TURN) % FULL_TURN;
  return angle >= from && angle < to;
}

/**
 * Despeja las celdas del sector del círculo entre `from` y `to` (ver inSector). Cuenta una celda
 * si su centro cae adentro. Devuelve cuántas celdas despejó: si es 0, no hace falta volver a
 * dibujar.
 */
export function clearSector(
  fog: Fog,
  center: Position,
  radius: number,
  from: number,
  to: number,
): number {
  const {
    width,
    height,
    bounds: [[west], [, north]],
  } = fog;
  const degreesPerCell = (fog.bounds[1][0] - west) / width;
  // Solo las celdas del cuadrado que contiene al círculo.
  const firstX = Math.max(
    0,
    Math.floor((center[0] - radius - west) / degreesPerCell),
  );
  const lastX = Math.min(
    width - 1,
    Math.floor((center[0] + radius - west) / degreesPerCell),
  );
  const firstY = Math.max(
    0,
    Math.floor((north - center[1] - radius) / degreesPerCell),
  );
  const lastY = Math.min(
    height - 1,
    Math.floor((north - center[1] + radius) / degreesPerCell),
  );
  let count = 0;
  for (let y = firstY; y <= lastY; y++) {
    for (let x = firstX; x <= lastX; x++) {
      const index = x + y * width;
      if (fog.cleared[index]) continue;
      const cellCenter: Position = [
        west + (x + 0.5) * degreesPerCell,
        north - (y + 0.5) * degreesPerCell,
      ];
      if (!inSector(center, radius, from, to, cellCenter)) continue;
      fog.cleared[index] = 1;
      const pixel = x + MARGIN + (y + MARGIN) * (width + 2 * MARGIN);
      fog.image.data[pixel * 4 + 3] = 0;
      count++;
    }
  }
  if (count > 0) fog.context.putImageData(fog.image, 0, 0);
  return count;
}

/**
 * El color que se ve con la niebla encima de `color`, mezclado como lo hace el mapa (la niebla con
 * su opacidad, sobre el color). Es para lo que está fuera del mundo: mar que nunca se despeja.
 */
export function underFog(
  color: string,
  fogColor: string,
  opacity: number,
): string {
  const context = document.createElement("canvas").getContext("2d");
  if (!context)
    throw new Error("El navegador no dio un contexto 2D para la niebla");
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  context.globalAlpha = opacity;
  context.fillStyle = fogColor;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${red}, ${green}, ${blue})`;
}
