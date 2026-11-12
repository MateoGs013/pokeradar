// Rectángulos geográficos en grados. Sin `server-only`: el mapa (cliente) los usa para encuadrar.

/** Un rectángulo geográfico: [[oeste, sur], [este, norte]]. */
export type Bounds = [
  [west: number, south: number],
  [east: number, north: number],
];

/**
 * Agranda `bounds` hasta la proporción de la pantalla (`aspect` = ancho / alto) sin moverle el
 * centro. En una pantalla más alta que el rectángulo crece hacia arriba y abajo; en una más
 * ancha, hacia los costados. Usado como límite del mapa, el mundo entra entero en cualquier
 * pantalla y no se puede salir de él.
 *
 * Calcula en grados y no en la proyección de Mercator del mapa. Cerca del ecuador la diferencia
 * es de alrededor de 1 %: en un teléfono el límite llega a unos ±17° de latitud.
 */
export function expandToAspect(bounds: Bounds, aspect: number): Bounds {
  if (!Number.isFinite(aspect) || aspect <= 0) return bounds;
  const [[west, south], [east, north]] = bounds;
  const width = east - west;
  const height = north - south;
  if (width / height < aspect) {
    const extra = (height * aspect - width) / 2;
    return [
      [west - extra, south],
      [east + extra, north],
    ];
  }
  const extra = (width / aspect - height) / 2;
  return [
    [west, south - extra],
    [east, north + extra],
  ];
}
