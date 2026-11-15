// La carta: el terreno dibujado como curvas de nivel, encima de la niebla. La sala conoce la forma
// de la isla aunque no sepa qué vive en ella: la niebla tapa los colores y las señales, no el
// relieve, y el radar los revela al barrer.
//
// Las curvas son los bordes de los biomas que salen solo de la altura (lib/world/biomes.ts): la
// costa (y los lagos), la llanura, la montaña y las cumbres son franjas de altura, así que sus
// bordes son curvas de nivel. Quedan afuera los bordes que no lo son: el mar (su borde es el
// rectángulo del mundo), el bosque y la zona árida (siguen la humedad), y las ciudades y el volcán
// (son círculos).
import type {
  ExpressionSpecification,
  LineLayerSpecification,
} from "maplibre-gl";

import type { HabitatName } from "@/lib/pokeapi/types";

import { cssNumber } from "./css-token";

export const CONTOUR_LAYER = "curvas";

/** Los biomas cuyo borde es una curva de nivel, de la más baja a la más alta. */
const CONTOUR_HABITATS: HabitatName[] = [
  "waters-edge",
  "grassland",
  "mountain",
  "cave",
];

/**
 * La capa de las curvas, sobre la fuente de los biomas. La costa va más marcada que las curvas de
 * adentro, como en una carta: es la que da la forma de la isla.
 */
export function contourLayer(
  source: string,
  color: string,
): LineLayerSpecification {
  const coast: ExpressionSpecification = [
    "==",
    ["get", "habitat"],
    "waters-edge",
  ];
  return {
    id: CONTOUR_LAYER,
    type: "line",
    source,
    filter: ["in", ["get", "habitat"], ["literal", CONTOUR_HABITATS]],
    paint: {
      "line-color": color,
      "line-opacity": [
        "case",
        coast,
        cssNumber("--chart-coast-opacity"),
        cssNumber("--chart-opacity"),
      ],
      "line-width": ["case", coast, 1.25, 0.75],
    },
  };
}
