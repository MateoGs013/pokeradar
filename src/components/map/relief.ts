// El relieve pintado sobre el mapa: la imagen que el servidor genera al compilar
// (app/relieve.png/route.ts, lib/world/relief.ts), estirada sobre el mundo como una capa raster.
// Va encima de los biomas planos y debajo de la noche y de la niebla: es lo que se ve donde el
// radar despejó.
import type { Map as MapLibreMap } from "maplibre-gl";

import type { Bounds } from "@/lib/geo/bounds";

const RELIEF = "relieve";

/**
 * Suma el relieve al mapa, justo debajo de la capa `before`. Se llama después de `load`: si la
 * imagen no baja, MapLibre lo avisa en la consola y el mapa sigue con los biomas planos; antes de
 * `load`, ese error lo dejaría sin dibujar (map-view.tsx, onError).
 */
export function addRelief(
  map: MapLibreMap,
  [[west, south], [east, north]]: Bounds,
  before: string,
): void {
  map.addSource(RELIEF, {
    type: "image",
    url: "/relieve.png",
    // Las cuatro esquinas de la imagen, en el orden que pide MapLibre: desde arriba a la izquierda,
    // en el sentido de las agujas del reloj.
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  });
  map.addLayer({ id: RELIEF, type: "raster", source: RELIEF }, before);
}
