// Argentina, el mapa real (`?modo=real`; docs/concepto.md, "El mapa híbrido"): el marco que lleva el
// mundo hasta allá y las zonas reales de cada hábitat. Sin `server-only`: el servidor ubica las
// señales con esto (argentina-spawns.ts), y el mapa, que es cliente, lo usa para dibujarlas y
// nombrarlas.
import type { HabitatName } from "@/lib/pokeapi/types";
import type { Position, Spawn } from "@/lib/world/types";

import type { Bounds } from "./bounds";
import { VIEDMA } from "./viedma";

/**
 * El mundo del modo real: 12° de ancho por 16 de alto, vertical como el país, en celdas de 0,08°
 * como las del mundo generado.
 */
export const ARGENTINA_BOUNDS: Bounds = [
  [-6, -8],
  [6, 8],
];

/** Las celdas de la niebla del modo real: 150 de ancho por 200 de alto, de 0,08°. */
export const ARGENTINA_GRID = { width: 150, height: 200 };

/** Dónde cae el centro del mundo, [0, 0], en el mapa real. */
const CENTER: Position = [-63.6, -40.4];

/**
 * Cuántos grados de longitud real mide un grado del mundo. Los 12° de ancho van de −80,7° a −46,5°
 * de longitud, y los 16° de alto, de −55,5° a −21° de latitud: Argentina entra entera.
 */
export const ARGENTINA_SCALE = 2.85;

const RAD = Math.PI / 180;

/** La y de Mercator (la proyección del mapa) de una latitud, en radianes. */
function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
}

/** La latitud de una y de Mercator. */
function latitudeOf(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;
}

const CENTER_Y = mercatorY(CENTER[1]);

/**
 * Del mundo al mapa real. Es lineal en Mercator, no en grados: un grado del mundo ocupa en pantalla
 * lo mismo en Salta que en Ushuaia, así que un círculo del mundo (el alcance de un radar) se ve
 * como un círculo, y la niebla, que MapLibre estira entre sus cuatro esquinas, coincide con el
 * radar y las señales también lejos del centro.
 */
export function toReal([x, y]: Position): Position {
  return [
    CENTER[0] + x * ARGENTINA_SCALE,
    latitudeOf(CENTER_Y + y * ARGENTINA_SCALE * RAD),
  ];
}

/** Del mapa real al mundo: la inversa de `toReal`. */
export function fromReal([lng, lat]: Position): Position {
  return [
    (lng - CENTER[0]) / ARGENTINA_SCALE,
    (mercatorY(lat) - CENTER_Y) / (ARGENTINA_SCALE * RAD),
  ];
}

/** El radar base del modo real, en el mundo: cae en Viedma. */
export const ARGENTINA_RADAR_BASE: Position = fromReal(VIEDMA);

/** Un lugar real donde aparece un hábitat: un círculo alrededor de `center`. */
export interface Zone {
  /** Cómo se lee después de "en": "Señal detectada en las Cataratas del Iguazú". */
  name: string;
  habitat: HabitatName;
  /** [longitud, latitud] reales. */
  center: Position;
  radiusKm: number;
}

/**
 * Las zonas de cada hábitat. Cada círculo se comprobó con un script, fuera del repo, contra las
 * teselas de OpenFreeMap que dibuja el mapa (a z9), en 65 puntos: el centro y cuatro anillos de 16.
 * Los del mar caen todos en el océano; los de la orilla, en agua y en tierra; los de los demás
 * hábitats, todos en tierra. Y cada círculo queda a medio km o más de los límites internacionales
 * (docs/decisiones.md, "Las señales del mapa real").
 */
export const ZONES: readonly Zone[] = [
  // El mar: el Mar Argentino, lejos de la costa y de Uruguay.
  zone("el mar frente a Mar del Plata", "sea", [-56.9, -38.5], 40),
  zone("el mar frente a Bahía Blanca", "sea", [-61.0, -39.6], 30),
  zone("el golfo San Matías", "sea", [-64.5, -41.6], 30),
  zone("el mar frente a Península Valdés", "sea", [-62.6, -42.6], 40),
  zone("el golfo San Jorge", "sea", [-66.6, -46.0], 30),
  zone("el mar frente a Tierra del Fuego", "sea", [-66.5, -53.4], 30),
  // La orilla: cataratas, esteros, el delta, una bahía y lagos.
  zone("las Cataratas del Iguazú", "waters-edge", [-54.455, -25.705], 1.5),
  zone("los Esteros del Iberá", "waters-edge", [-57.2, -28.55], 15),
  zone("el Delta del Paraná", "waters-edge", [-58.85, -34.05], 12),
  zone("la bahía de Samborombón", "waters-edge", [-57.3, -35.8], 12),
  zone("el lago Nahuel Huapi", "waters-edge", [-71.4, -41.05], 10),
  zone("el lago Argentino", "waters-edge", [-72.3, -50.25], 12),
  // El bosque: la selva, las yungas, el monte y los bosques andinos.
  zone("la selva misionera", "forest", [-54.2, -26.5], 15),
  zone("las yungas de Calilegua", "forest", [-64.85, -23.75], 12),
  zone("las yungas de El Rey", "forest", [-64.65, -24.72], 12),
  zone("el monte chaqueño", "forest", [-61.3, -25.3], 25),
  zone("los bosques de Los Alerces", "forest", [-71.5, -42.8], 6),
  zone("los bosques de Tierra del Fuego", "forest", [-68.25, -54.7], 5),
  // La pradera: la pampa y los campos.
  zone("la pampa, cerca de Pergamino", "grassland", [-60.6, -33.9], 25),
  zone("la pampa del Salado", "grassland", [-59.3, -35.9], 25),
  zone("la pampa, cerca de Tres Arroyos", "grassland", [-60.6, -38.3], 8),
  zone("la pampa seca", "grassland", [-63.9, -35.4], 15),
  zone("los campos del sur de Córdoba", "grassland", [-63.9, -33.1], 12),
  zone("los campos de Entre Ríos", "grassland", [-59.3, -31.9], 25),
  // La montaña: la cordillera y las sierras.
  zone("la cordillera, junto al Aconcagua", "mountain", [-69.9, -32.7], 8),
  zone("la sierra de Famatina", "mountain", [-67.75, -29.0], 12),
  zone("las sierras de Córdoba", "mountain", [-64.85, -31.85], 15),
  zone("el cerro Domuyo", "mountain", [-70.45, -36.65], 10),
  // La cueva.
  zone("la Cueva de las Manos", "cave", [-70.66, -47.15], 6),
  zone("la Caverna de las Brujas", "cave", [-69.82, -35.8], 6),
  // El terreno agreste: la puna, un cañón, los volcanes y las mesetas.
  zone(
    "la Puna, junto a las Salinas Grandes",
    "rough-terrain",
    [-65.9, -23.6],
    15,
  ),
  zone("el cañón de Talampaya", "rough-terrain", [-67.8, -29.8], 12),
  zone("la Payunia", "rough-terrain", [-69.2, -36.4], 20),
  zone("la meseta de Somuncurá", "rough-terrain", [-67.0, -41.3], 30),
  zone("la meseta patagónica", "rough-terrain", [-68.8, -43.9], 30),
  // La ciudad.
  zone("la ciudad de Buenos Aires", "urban", [-58.43, -34.61], 5),
  zone("la ciudad de Córdoba", "urban", [-64.19, -31.42], 4),
  zone("la ciudad de Rosario", "urban", [-60.69, -32.95], 3),
  zone("la ciudad de Mendoza", "urban", [-68.84, -32.89], 3),
  zone("la ciudad de San Miguel de Tucumán", "urban", [-65.21, -26.82], 3),
  zone("la ciudad de Salta", "urban", [-65.41, -24.79], 3),
  zone("la ciudad de Neuquén", "urban", [-68.07, -38.95], 2),
  zone("la ciudad de Mar del Plata", "urban", [-57.6, -38.01], 2),
  // Lo raro: un glaciar, un volcán y una isla.
  zone("el glaciar Perito Moreno", "rare", [-73.08, -50.49], 1),
  zone("el volcán Lanín", "rare", [-71.4, -39.63], 3),
  zone("la isla de los Estados", "rare", [-64.2, -54.79], 1),
];

function zone(
  name: string,
  habitat: HabitatName,
  center: Position,
  radiusKm: number,
): Zone {
  return { name, habitat, center, radiusKm };
}

/** Kilómetros por grado de latitud. */
export const KM_PER_DEGREE = 111.32;

/**
 * Kilómetros de `from` a `to`, con la Tierra plana alrededor de `from`: alcanza para las decenas de
 * km de una zona y para elegir la más cercana.
 */
export function distanceKm(
  [lng0, lat0]: Position,
  [lng, lat]: Position,
): number {
  return Math.hypot(
    (lng - lng0) * KM_PER_DEGREE * Math.cos(lat0 * RAD),
    (lat - lat0) * KM_PER_DEGREE,
  );
}

/**
 * La zona de una señal del mapa real: la de su hábitat con el centro más cerca. Las de un mismo
 * hábitat tienen los bordes a 85 km o más, así que es la zona donde se sorteó; el chequeo del
 * servidor lo confirma (argentina-spawns.ts).
 */
export function zoneOf({ habitat, position }: Spawn): Zone {
  const real = toReal(position);
  let nearest: Zone | undefined;
  for (const candidate of ZONES) {
    if (candidate.habitat !== habitat) continue;
    if (
      !nearest ||
      distanceKm(candidate.center, real) < distanceKm(nearest.center, real)
    ) {
      nearest = candidate;
    }
  }
  if (!nearest) throw new Error(`No hay zonas de ${habitat} en el mapa real`);
  return nearest;
}
