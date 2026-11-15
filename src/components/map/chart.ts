// La carta: el mundo dibujado como una carta de relevamiento, encima de la niebla. La sala conoce
// la forma del mundo aunque no sepa qué vive en él: la niebla tapa los colores del terreno y las
// señales, no el relieve, y el radar los revela al barrer.
//
// Tiene dos partes. Las curvas de nivel vienen del servidor (lib/world/chart.ts): la costa, las de
// tierra (una de cada tres, maestra) y las isobatas, punteadas. La grilla se arma acá, de los
// límites del mundo: un meridiano y un paralelo cada 2°, con sus grados, el marco del mundo (fuera
// de él no se puede instalar una antena) y el nombre de la isla, escrito en el mar con las letras
// separadas, como los rótulos de una carta. Todo va en el color del HUD.
import type {
  GeoJSONSourceSpecification,
  LayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";

import type { Bounds } from "@/lib/geo/bounds";
import type { ChartCollection, Position } from "@/lib/world/types";

import { cssFontFamilies, cssNumber, cssToken } from "./css-token";

const CURVES_SOURCE = "carta";
const GRID_SOURCE = "carta-grilla";

/** La capa de más abajo de la carta: la niebla va justo debajo de ella (radar.tsx). */
export const CHART_BOTTOM_LAYER = "carta-grilla";
const SEA_LAYER = "carta-isobatas";
const LAND_LAYER = "carta-curvas";
const COAST_LAYER = "carta-costa";
const DEGREES_LAYER = "carta-grados";
const TITLE_LAYER = "carta-titulo";

/**
 * Dónde va el nombre de la isla, como parte del ancho y del alto del mundo desde su esquina
 * sudoeste: en el mar del sudoeste, lejos de la costa (visto en capturas con la semilla 151).
 */
const TITLE_PLACE = { east: 0.27, north: 0.085 };

/** Cada cuántos grados va una línea de la grilla. */
const GRID_STEP = 2;

/** "4°O", "0°", "2°N": los grados de un meridiano o de un paralelo. */
function degrees(value: number, positive: string, negative: string): string {
  if (value === 0) return "0°";
  return `${Math.abs(value)}°${value > 0 ? positive : negative}`;
}

/** Los múltiplos de GRID_STEP que caen adentro de un intervalo, sin sus extremos. */
function gridSteps(from: number, to: number): number[] {
  const steps: number[] = [];
  for (
    let value = Math.ceil(from / GRID_STEP) * GRID_STEP;
    value < to;
    value += GRID_STEP
  ) {
    if (value > from) steps.push(value);
  }
  return steps;
}

/**
 * La grilla de la carta, en GeoJSON: las líneas, el marco del mundo (`frame`), un punto con los
 * grados de cada línea, sobre el borde sur (los meridianos) o el oeste (los paralelos), y el punto
 * del nombre de la isla.
 */
function chartGrid([[west, south], [east, north]]: Bounds, name: string) {
  const line = (coordinates: Position[], frame: boolean) => ({
    type: "Feature" as const,
    properties: { frame },
    geometry: { type: "LineString" as const, coordinates },
  });
  const label = (position: Position, text: string, anchor: string) => ({
    type: "Feature" as const,
    properties: { label: text, anchor },
    geometry: { type: "Point" as const, coordinates: position },
  });
  const meridians = gridSteps(west, east);
  const parallels = gridSteps(south, north);
  return {
    type: "FeatureCollection" as const,
    features: [
      ...meridians.map((lng) =>
        line(
          [
            [lng, south],
            [lng, north],
          ],
          false,
        ),
      ),
      ...parallels.map((lat) =>
        line(
          [
            [west, lat],
            [east, lat],
          ],
          false,
        ),
      ),
      line(
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
        true,
      ),
      ...meridians.map((lng) =>
        label([lng, south], degrees(lng, "E", "O"), "bottom-left"),
      ),
      ...parallels.map((lat) =>
        label([west, lat], degrees(lat, "N", "S"), "bottom-left"),
      ),
      {
        type: "Feature" as const,
        properties: { title: name },
        geometry: {
          type: "Point" as const,
          coordinates: [
            west + TITLE_PLACE.east * (east - west),
            south + TITLE_PLACE.north * (north - south),
          ],
        },
      },
    ],
  };
}

/** Las fuentes de la carta: las curvas del servidor y la grilla, con el nombre de la isla. */
export function chartSources(
  chart: ChartCollection,
  bounds: Bounds,
  name: string,
): Record<string, GeoJSONSourceSpecification> {
  return {
    [CURVES_SOURCE]: { type: "geojson", data: chart },
    [GRID_SOURCE]: { type: "geojson", data: chartGrid(bounds, name) },
  };
}

/**
 * Las capas de la carta, de abajo hacia arriba: la grilla, las isobatas, las curvas de tierra, la
 * costa (la más marcada: es la que da la forma de la isla) y los grados. Los grados llevan el halo
 * de los nombres de lugares; su contraste sobre el relieve pintado está sin medir.
 */
export function chartLayers(color: string): LayerSpecification[] {
  return [
    {
      id: CHART_BOTTOM_LAYER,
      type: "line",
      source: GRID_SOURCE,
      filter: ["has", "frame"],
      paint: {
        "line-color": color,
        "line-opacity": [
          "case",
          ["get", "frame"],
          cssNumber("--chart-frame-opacity"),
          cssNumber("--chart-grid-opacity"),
        ],
        "line-width": 1,
      },
    },
    {
      id: SEA_LAYER,
      type: "line",
      source: CURVES_SOURCE,
      filter: ["==", ["get", "kind"], "sea"],
      paint: {
        "line-color": color,
        "line-opacity": cssNumber("--chart-sea-opacity"),
        "line-width": 0.75,
        "line-dasharray": [4, 3],
      },
    },
    {
      id: LAND_LAYER,
      type: "line",
      source: CURVES_SOURCE,
      filter: ["==", ["get", "kind"], "land"],
      paint: {
        "line-color": color,
        "line-opacity": [
          "case",
          ["get", "index"],
          cssNumber("--chart-index-opacity"),
          cssNumber("--chart-opacity"),
        ],
        "line-width": ["case", ["get", "index"], 1, 0.6],
      },
    },
    {
      id: COAST_LAYER,
      type: "line",
      source: CURVES_SOURCE,
      filter: ["==", ["get", "kind"], "coast"],
      paint: {
        "line-color": color,
        "line-opacity": cssNumber("--chart-coast-opacity"),
        "line-width": 1.4,
      },
    },
    {
      id: DEGREES_LAYER,
      type: "symbol",
      source: GRID_SOURCE,
      filter: ["has", "label"],
      layout: {
        "text-field": ["get", "label"],
        "text-font": cssFontFamilies("--font-martian-mono"),
        "text-size": cssNumber("--chart-label-size"),
        "text-anchor": ["get", "anchor"],
        "text-radial-offset": 0.5,
      },
      paint: {
        "text-color": color,
        "text-opacity": cssNumber("--chart-label-opacity"),
        "text-halo-color": cssToken("--hud-bg"),
        "text-halo-width": cssNumber("--map-label-halo"),
      },
    },
    {
      id: TITLE_LAYER,
      type: "symbol",
      source: GRID_SOURCE,
      filter: ["has", "title"],
      layout: {
        "text-field": ["get", "title"],
        "text-font": cssFontFamilies("--font-martian-mono"),
        "text-size": cssNumber("--chart-title-size"),
        "text-transform": "uppercase",
        "text-letter-spacing": cssNumber("--chart-title-tracking"),
        // En un solo renglón: sin esto, MapLibre corta el texto a los 10 em de ancho.
        "text-max-width": 40,
      },
      paint: {
        "text-color": color,
        "text-opacity": cssNumber("--chart-title-opacity"),
      },
    },
  ];
}

/** Cambia el color de la carta: sigue al del HUD cuando se elige otro en los ajustes. */
export function setChartColor(map: MapLibreMap, color: string): void {
  for (const id of [CHART_BOTTOM_LAYER, SEA_LAYER, LAND_LAYER, COAST_LAYER]) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-color", color);
  }
  for (const id of [DEGREES_LAYER, TITLE_LAYER]) {
    if (map.getLayer(id)) map.setPaintProperty(id, "text-color", color);
  }
}
