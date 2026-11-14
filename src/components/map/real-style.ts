// El estilo del modo real (docs/concepto.md, "El mapa híbrido"): las teselas vectoriales de
// OpenFreeMap, sin API key, con los colores del HUD. Se parte de su estilo oscuro y se cambian solo
// los colores; las fuentes y los íconos quedan como vienen. La atribución va en el panel de las
// antenas (monitoring-room.tsx).
import type {
  FillLayerSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

import type { Bounds } from "@/lib/geo/bounds";

import { cssNumber, cssToken } from "./css-token";

/** Responde con `access-control-allow-origin: *` (medido, 14/11/2026). */
export const REAL_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/** El color de relleno de una capa, por su id en el estilo de OpenFreeMap. */
function fillToken(id: string): string | null {
  if (id.includes("water")) return "--bioma-sea";
  if (id.includes("wood") || id.includes("park")) return "--bioma-forest";
  if (id.includes("ice") || id.includes("glacier")) return "--bioma-cave";
  if (
    id.includes("residential") ||
    id.includes("building") ||
    id.includes("aeroway") ||
    id.includes("pier")
  )
    return "--bioma-urban";
  return null;
}

/** Una capa con los colores del HUD; las que no tienen un color propio quedan como vienen. */
function recolor(layer: LayerSpecification): LayerSpecification {
  switch (layer.type) {
    case "background":
      return {
        ...layer,
        paint: { "background-color": cssToken("--bioma-grassland") },
      };
    case "fill": {
      const token = fillToken(layer.id);
      return token
        ? { ...layer, paint: { ...layer.paint, "fill-color": cssToken(token) } }
        : layer;
    }
    case "line":
      return {
        ...layer,
        paint: {
          ...layer.paint,
          "line-color": cssToken(
            layer.id.includes("waterway")
              ? "--bioma-waters-edge"
              : "--bioma-cave",
          ),
        },
      };
    case "symbol":
      return {
        ...layer,
        paint: {
          ...layer.paint,
          "text-color": cssToken("--hud-fg"),
          "text-halo-color": cssToken("--hud-bg"),
        },
      };
    default:
      return layer;
  }
}

const OUTSIDE = "afuera";

/**
 * Afuera del mundo no hay nada que despejar: como el mar de afuera del mundo generado, el mapa real
 * se ve ya cubierto por la niebla (su color y su opacidad). Es un rectángulo del tamaño del mapa con
 * un agujero donde está el mundo (`world`, en coordenadas del mapa); el agujero va en el sentido
 * contrario, que es como GeoJSON marca un hueco.
 */
function outsideLayer(world: Bounds): {
  source: GeoJSONSourceSpecification;
  layer: FillLayerSpecification;
} {
  const [[west, south], [east, north]] = world;
  return {
    source: {
      type: "geojson",
      data: {
        type: "Polygon",
        coordinates: [
          [
            [-180, -85],
            [180, -85],
            [180, 85],
            [-180, 85],
            [-180, -85],
          ],
          [
            [west, south],
            [west, north],
            [east, north],
            [east, south],
            [west, south],
          ],
        ],
      },
    },
    layer: {
      id: OUTSIDE,
      type: "fill",
      source: OUTSIDE,
      paint: {
        "fill-color": cssToken("--hud-bg"),
        "fill-opacity": cssNumber("--fog-opacity"),
      },
    },
  };
}

/**
 * El estilo de OpenFreeMap con los colores del HUD, `night` (la capa de la noche) antes de los
 * nombres, como en el mundo generado, y afuera del mundo, la niebla fija, encima de todo.
 */
export function hudStyle(
  style: StyleSpecification,
  night: LayerSpecification,
  world: Bounds,
): StyleSpecification {
  const layers = style.layers.map(recolor);
  const firstSymbol = layers.findIndex((layer) => layer.type === "symbol");
  layers.splice(firstSymbol === -1 ? layers.length : firstSymbol, 0, night);
  const outside = outsideLayer(world);
  return {
    ...style,
    sources: { ...style.sources, [OUTSIDE]: outside.source },
    layers: [...layers, outside.layer],
  };
}

/**
 * El punto de las ciudades. El estilo oscuro de OpenFreeMap pide la imagen "circle-11", pero su
 * sprite la llama "circle_11" (medido en `sprites/ofm_f384/ofm.json`): se dibuja acá, del color
 * de los nombres, cuando MapLibre la pide.
 */
export const MISSING_CITY_DOT = "circle-11";

export function cityDot(): ImageData {
  const size = 11;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("El navegador no dio un contexto 2D para el punto");
  context.fillStyle = cssToken("--hud-fg");
  context.beginPath();
  context.arc(size / 2, size / 2, 3, 0, 2 * Math.PI);
  context.fill();
  return context.getImageData(0, 0, size, size);
}
