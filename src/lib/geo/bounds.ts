// Rectángulos geográficos en grados. Sin `server-only`: el mapa (cliente) los usa para encuadrar.

/** Un rectángulo geográfico: [[oeste, sur], [este, norte]]. */
export type Bounds = [
  [west: number, south: number],
  [east: number, north: number],
];

/**
 * Hasta dónde puede crecer el límite. La proyección de Mercator del mapa llega a unos 85° de
 * latitud, y MapLibre lanza un error con más de 90°. En longitud, MapLibre lleva los bordes del
 * límite a una sola vuelta del mundo, de −180° a 180°: pasados los 180°, el límite cae en otro
 * lugar, y de −180° a 180° justos (el mismo meridiano) queda de ancho cero y el mapa no carga.
 * Por eso 179° (docs/errores.md, E-13).
 */
const MAX_LATITUDE = 85;
const MAX_LONGITUDE = 179;

/**
 * Agranda `bounds` hasta la proporción de la pantalla (`aspect` = ancho / alto) sin moverle el
 * centro. En una pantalla más alta que el rectángulo crece hacia arriba y abajo; en una más
 * ancha, hacia los costados. Usado como límite del mapa, no se puede salir de él, y el mundo
 * entra entero salvo en pantallas extremas (ver abajo).
 *
 * Calcula en grados y no en la proyección de Mercator del mapa. Cerca del ecuador la diferencia
 * es de alrededor de 1 %: en un teléfono el límite llega a unos ±17° de latitud.
 *
 * No pasa de ±85° de latitud ni de ±179° de longitud. En Mercator, de −85° a 85° mide unas 22
 * veces el ancho del mundo (16°), y de −179° a 179°, unas 30 veces su alto (12°). En una pantalla
 * más extrema que eso, MapLibre acerca el mapa para no salir del límite: el mundo queda recortado,
 * pero el mapa carga. Medido: entero a 100 × 2200 px y a 2800 × 100; recortado a 100 × 2400 y a
 * 4000 × 100.
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
