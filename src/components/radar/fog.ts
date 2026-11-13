// La niebla: un canvas con un píxel por celda del mundo, que MapLibre estira sobre el mapa como
// una capa raster (fuente `canvas`). Cada píxel es opaco mientras la celda está cubierta y
// transparente cuando el radar la despejó. MapLibre filtra la textura en lineal al estirarla, así
// que el borde entre lo cubierto y lo despejado sale suave sin dibujarlo.
import type { Bounds } from "@/lib/geo/bounds";
import type { Position } from "@/lib/world/types";

export interface Fog {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  /** Los píxeles del canvas: se editan acá y se copian al canvas con putImageData. */
  image: ImageData;
  /** 1 si la celda ya se despejó. Mismo orden que los píxeles: fila por fila, de norte a sur. */
  cleared: Uint8Array;
  width: number;
  height: number;
  bounds: Bounds;
}

/** Una niebla que cubre todo el mundo, pintada con `color` (un color de CSS). */
export function createFog(
  width: number,
  height: number,
  bounds: Bounds,
  color: string,
): Fog {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("El navegador no dio un contexto 2D para la niebla");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return {
    canvas,
    context,
    image: context.getImageData(0, 0, width, height),
    cleared: new Uint8Array(width * height),
    width,
    height,
    bounds,
  };
}

/** Las cuatro esquinas del canvas sobre el mapa, en el orden que pide MapLibre. */
export function fogCorners({
  bounds: [[west, south], [east, north]],
}: Fog): [Position, Position, Position, Position] {
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}

const FULL_TURN = 2 * Math.PI;

/**
 * Despeja las celdas del sector del círculo entre los ángulos `from` y `to` (en radianes, desde el
 * norte y en el sentido de las agujas del reloj, como un radar). Cuenta una celda si su centro cae
 * adentro. Devuelve cuántas celdas despejó: si es 0, no hace falta volver a dibujar.
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
      const east = west + (x + 0.5) * degreesPerCell - center[0];
      const northward = north - (y + 0.5) * degreesPerCell - center[1];
      if (east * east + northward * northward > radius * radius) continue;
      // atan2(este, norte): 0 al norte, π/2 al este. Se pasa a [0, 2π).
      const angle = (Math.atan2(east, northward) + FULL_TURN) % FULL_TURN;
      if (angle < from || angle >= to) continue;
      fog.cleared[index] = 1;
      fog.image.data[index * 4 + 3] = 0;
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
