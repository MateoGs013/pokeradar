// La carta del mundo: sus curvas de nivel, en tierra y bajo el mar (isobatas). El mapa las dibuja
// arriba de la niebla (components/map/chart.ts): la sala conoce la forma del mundo, como en una
// carta de relevamiento, aunque no sepa qué vive en él.
//
// Salen del terreno natural, sin el hundimiento del borde: con el borde hundido, las isobatas de
// afuera copiarían el rectángulo del mundo en vez de rodear la isla.
import "server-only";

import { contours } from "d3-contour";

import type { Thresholds } from "./biomes";
import { GRID_HEIGHT, GRID_WIDTH, gridToLngLat } from "./grid";
import type { ChartCollection, ChartKind, Position } from "./types";

/** Cuántas curvas hay entre la costa y la cumbre más alta. */
const LAND_CURVES = 9;
/** Una de cada tantas curvas de tierra es maestra. */
const INDEX_EVERY = 3;
/** Cuántas isobatas hay, y cuánto baja cada una respecto de la anterior (en unidades de altura). */
const SEA_CURVES = 7;
const SEA_STEP = 0.3;

interface Level {
  height: number;
  kind: ChartKind;
  index: boolean;
}

/** Las curvas de la carta: la costa, las de tierra hasta la cumbre y las isobatas. */
export function chartLines(
  terrain: number[],
  thresholds: Thresholds,
): ChartCollection {
  const top = terrain.reduce((highest, value) => Math.max(highest, value));
  const landStep = (top - thresholds.coast) / (LAND_CURVES + 1);
  const levels: Level[] = [
    { height: thresholds.coast, kind: "coast", index: true },
    ...Array.from({ length: LAND_CURVES }, (_, step): Level => ({
      height: thresholds.coast + (step + 1) * landStep,
      kind: "land",
      index: (step + 1) % INDEX_EVERY === 0,
    })),
    ...Array.from({ length: SEA_CURVES }, (_, step): Level => ({
      height: thresholds.coast - (step + 1) * SEA_STEP,
      kind: "sea",
      index: false,
    })),
  ];
  const generator = contours().size([GRID_WIDTH, GRID_HEIGHT]);
  return {
    type: "FeatureCollection",
    features: levels.map(({ height, kind, index }) => ({
      type: "Feature",
      properties: { kind, index },
      geometry: {
        type: "MultiLineString",
        coordinates: generator
          .contour(terrain, height)
          .coordinates.flatMap((polygon) => polygon.flatMap(openRing)),
      },
    })),
  };
}

/**
 * Un punto de la carta, con 3 decimales (unos 110 m, la octogésima parte de una celda): son líneas
 * finas, y con un decimal menos el GeoJSON que viaja al navegador pesa menos.
 */
function toChart([lng, lat]: Position): Position {
  return [Math.round(lng * 1000) / 1000, Math.round(lat * 1000) / 1000];
}

/**
 * Un anillo de d3-contour, como líneas en [lng, lat]. d3-contour cierra cada zona: donde la zona
 * llega al borde de la grilla, el anillo corre por el borde, que no es una curva de nivel. Ahí se
 * corta, y lo que queda son los tramos de adentro.
 */
function openRing(ring: readonly (readonly number[])[]): Position[][] {
  const lines: Position[][] = [];
  let line: Position[] = [];
  const close = () => {
    if (line.length > 1) lines.push(line);
    line = [];
  };
  for (const [x, y] of ring) {
    if (x === undefined || y === undefined) continue;
    const onBorder = x <= 0 || x >= GRID_WIDTH || y <= 0 || y >= GRID_HEIGHT;
    if (onBorder) close();
    else line.push(toChart(gridToLngLat(x, y)));
  }
  close();
  return lines;
}
