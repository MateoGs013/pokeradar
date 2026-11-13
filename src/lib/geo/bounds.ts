// Rectángulos geográficos en grados. Sin `server-only`: el mapa (cliente) los usa para encuadrar.

/** Un rectángulo geográfico: [[oeste, sur], [este, norte]]. */
export type Bounds = [
  [west: number, south: number],
  [east: number, north: number],
];

/**
 * Hasta dónde puede crecer el límite. La proyección de Mercator del mapa llega a unos 85° de
 * latitud, y MapLibre lanza un error con más de 90°.
 */
const MAX_LATITUDE = 85;
const MAX_LONGITUDE = 180;

/**
 * Agranda `bounds` hasta la proporción de la pantalla (`aspect` = ancho / alto) sin moverle el
 * centro. En una pantalla más alta que el rectángulo crece hacia arriba y abajo; en una más
 * ancha, hacia los costados. Usado como límite del mapa, el mundo entra entero en cualquier
 * pantalla y no se puede salir de él.
 *
 * Calcula en grados y no en la proyección de Mercator del mapa. Cerca del ecuador la diferencia
 * es de alrededor de 1 %: en un teléfono el límite llega a unos ±17° de latitud.
 *
 * No pasa de ±85° de latitud ni de ±180° de longitud. Con el mundo de 16° × 12°, el tope llega
 * con una pantalla unas 11 veces más alta que ancha, o 30 veces más ancha que alta: ahí MapLibre
 * acerca el mapa y el mundo queda recortado.
 */
export function expandToAspect(bounds: Bounds, aspect: number): Bounds {
  if (!Number.isFinite(aspect) || aspect <= 0) return bounds;
  const [[west, south], [east, north]] = bounds;
  const width = east - west;
  const height = north - south;
  if (width / height < aspect) {
    const extra = (height * aspect - width) / 2;
    return [
      [Math.max(west - extra, -MAX_LONGITUDE), south],
      [Math.min(east + extra, MAX_LONGITUDE), north],
    ];
  }
  const extra = (width / aspect - height) / 2;
  return [
    [west, Math.max(south - extra, -MAX_LATITUDE)],
    [east, Math.min(north + extra, MAX_LATITUDE)],
  ];
}
