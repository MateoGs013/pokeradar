// Tipos del mundo generado. Sin `import "server-only"`: son solo tipos (se borran al compilar)
// y el mapa, que es cliente, los va a importar con `import type`.
// Se declaran a mano los campos de GeoJSON que se usan: @types/geojson no es dependencia directa.
import type { HabitatName } from "@/lib/pokeapi/types";

/** [longitud, latitud] en grados. */
export type Position = [lng: number, lat: number];

/** Un bioma: todas las zonas de un hábitat, como un MultiPolygon de GeoJSON. */
export interface BiomeFeature {
  type: "Feature";
  properties: { habitat: HabitatName };
  geometry: { type: "MultiPolygon"; coordinates: Position[][][] };
}

export interface BiomeCollection {
  type: "FeatureCollection";
  features: BiomeFeature[];
}

/**
 * Una señal del mundo: dónde aparece una especie. Es lo único de las señales que viaja al
 * navegador; el nombre y los datos de la especie se piden al identificarla.
 */
export interface Spawn {
  /** id de la especie en PokéAPI. Cada especie aparece una sola vez, así que identifica a la señal. */
  speciesId: number;
  habitat: HabitatName;
  position: Position;
}

/** Qué es un lugar con nombre del mundo. */
export type PlaceKind = "city" | "volcano" | "lake";

/** Un lugar con nombre inventado ("Villa Bruma"), para el texto del mapa. */
export interface Place {
  name: string;
  kind: PlaceKind;
  /** Dónde va el nombre: la ciudad, el volcán o una celda del lago cerca de su centro. */
  position: Position;
}

export interface World {
  seed: number;
  /** Polígonos de los 9 biomas, en el orden en que se pintan (de abajo hacia arriba). */
  biomes: BiomeCollection;
  /** Hábitat de cada celda de la grilla, fila por fila. Es la fuente de verdad para ubicar spawns. */
  cells: HabitatName[];
  /** Las ciudades, el volcán y los lagos, con su nombre. */
  places: Place[];
  /** Dónde está el radar base, la sala de monitoreo: la ciudad más cercana al centro del mundo. */
  radarBase: Position;
}
