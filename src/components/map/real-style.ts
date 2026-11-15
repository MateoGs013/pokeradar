// El estilo del modo real (docs/concepto.md, "El mapa híbrido"): las teselas vectoriales de
// OpenFreeMap, sin API key, con los colores del HUD. Se parte de su estilo oscuro: se cambian los
// colores y la fuente de los nombres, y se suman dos capas, la de la noche y la niebla fija de
// afuera del mundo; los íconos quedan como vienen. La atribución va en el panel de las antenas
// (monitoring-room.tsx).
import type {
  FillLayerSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

import type { Bounds } from "@/lib/geo/bounds";

import { cssFontFamilies, cssNumber, cssToken } from "./css-token";

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
      if (!token) return layer;
      // Con un patrón, MapLibre ignora el color: el bosque del estilo (`landcover_wood`) pide la
      // imagen "wood-pattern", y se saca para que se pinte con el token.
      const paint = { ...layer.paint, "fill-color": cssToken(token) };
      delete paint["fill-pattern"];
      return { ...layer, paint };
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
      // Los nombres en Martian Mono, como los del mundo generado (placeLayers, en map-view.tsx).
      return {
        ...layer,
        layout: {
          ...layer.layout,
          "text-font": cssFontFamilies("--font-martian-mono"),
        },
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
 * El estilo de OpenFreeMap con los colores del HUD, `night` (la capa de la noche) después de la
 * última capa que no es de nombres, y afuera del mundo, la niebla fija, encima de todo. La noche no
 * va antes del primer nombre: el estilo intercala los nombres del agua entre los rellenos y las
 * rutas, y las rutas, los límites y los edificios quedaban encima de la noche, sin oscurecer.
 */
export function hudStyle(
  style: StyleSpecification,
  night: LayerSpecification,
  world: Bounds,
): StyleSpecification {
  const layers = style.layers.map(recolor);
  const lastNotSymbol = layers
    .map((layer) => layer.type !== "symbol")
    .lastIndexOf(true);
  layers.splice(lastNotSymbol + 1, 0, night);
  const outside = outsideLayer(world);
  const hud: StyleSpecification = {
    ...style,
    sources: { ...style.sources, [OUTSIDE]: outside.source },
    layers: [...layers, outside.layer],
  };
  // Sin `glyphs`, MapLibre dibuja los nombres con la fuente que ya cargó la página (recolor):
  // OpenFreeMap sirve solo Noto Sans, sin una fuente monoespaciada (docs/decisiones.md).
  delete hud.glyphs;
  return hud;
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
