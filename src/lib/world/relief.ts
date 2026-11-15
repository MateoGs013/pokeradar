// El relieve pintado: el mundo como una imagen, con el color de cada punto según su altura y su
// humedad, y las laderas sombreadas. Es lo que se ve donde el radar despejó la niebla: el mapa la
// estira sobre el mundo como una capa raster (components/map/relief.ts), encima de los biomas
// planos, que quedan de respaldo.
//
// Corre en el servidor al compilar (app/relieve.png/route.ts) y sale de los mismos campos que los
// biomas (generate.ts, worldFields): la costa, la montaña, las ciudades y el volcán caen donde
// caen sus polígonos. Los colores no son tokens de globals.css: acá no hay CSS que leer, y son los
// de una ilustración, no los de la interfaz.
import "server-only";

import { createNoise2D } from "simplex-noise";

import { createRandom, deriveSeed } from "@/lib/geo/random";

import { CITY_RADIUS, type Thresholds, VOLCANO_RADIUS } from "./biomes";
import { SEA_BORDER_CELLS, terrainSampler } from "./fields";
import { WORLD_SEED, worldFields } from "./generate";
import { cellCenter, distanceToEdge, GRID_HEIGHT, GRID_WIDTH } from "./grid";
import { encodePng } from "./png";

/** Píxeles de la imagen por celda del mundo: con 8, la imagen mide 1600 × 1200. */
const PIXELS_PER_CELL = 8;
const WIDTH = GRID_WIDTH * PIXELS_PER_CELL;
const HEIGHT = GRID_HEIGHT * PIXELS_PER_CELL;

type Rgb = readonly [red: number, green: number, blue: number];

// Los colores de una carta impresa, gastados por el sol. El mar profundo es --bioma-sea
// (globals.css): el mismo color que el mapa pinta fuera del mundo.
const SEA_DEEP: Rgb = [169, 193, 198];
const SEA_SHELF: Rgb = [204, 222, 217];
const FOAM: Rgb = [246, 247, 240];
const SAND: Rgb = [224, 208, 162];
const MARSH: Rgb = [178, 194, 142];
const DRY: Rgb = [212, 181, 128];
const GRASS: Rgb = [176, 192, 136];
const FOREST: Rgb = [112, 148, 102];
const ROCK: Rgb = [192, 148, 112];
const SUMMIT: Rgb = [218, 192, 164];
const SNOW: Rgb = [247, 243, 233];
const PAVEMENT: Rgb = [208, 172, 158];
const BUILDING: Rgb = [72, 58, 52];
const BASALT: Rgb = [98, 74, 64];
const LAVA: Rgb = [214, 72, 30];
/** El color de las sombras: no van al negro, sino a este violáceo, como en un relieve impreso. */
const SHADOW: Rgb = [96, 78, 92];

/** Hasta qué profundidad (en unidades de altura) se ve la plataforma clara alrededor de la costa. */
const SHELF_DEPTH = 0.4;
/** Media franja, en unidades de humedad, en la que se mezclan dos zonas vecinas de la llanura. */
const MOISTURE_BLEND = 0.07;
/**
 * Cuánto exagera las pendientes el sombreado. Las alturas del mundo son números chicos: con la
 * semilla 151, de −1,41 en la costa a 0,55 en la cumbre.
 */
const RELIEF_DEPTH = 20;
/** Qué tan alta está la luz: más alta, sombras más cortas. Viene del noroeste, como en los mapas. */
const LIGHT_HEIGHT = 1.2;
/** Alto de las crestas que se le suman a la montaña, en unidades de altura. */
const RIDGE_HEIGHT = 0.2;
/** Lado, en píxeles, de una manzana de las ciudades, con su calle. */
const CITY_BLOCK = 3;
/** Cuántos ríos de lava bajan del cráter. */
const LAVA_STREAMS = 6;

/** Lo que el color de un punto de tierra necesita saber de él. */
interface LandPoint {
  /** Altura, la de los umbrales de los biomas. */
  h: number;
  /** Altura con las crestas: por ella sube la nieve. */
  crest: number;
  /** Humedad. */
  m: number;
  /** Distancia, en celdas, a la ciudad más cercana y al volcán, y hacia dónde queda el volcán. */
  city: number;
  volcano: number;
  volcanoAngle: number;
  px: number;
  py: number;
}

/** El relieve del mundo, como un PNG. */
export function paintRelief(seed: number = WORLD_SEED): Buffer {
  const { terrain, moisture, thresholds, height, cities, volcano } =
    worldFields(seed);
  const top = terrain.reduce((highest, value) => Math.max(highest, value));
  const heightAt = sampler(height);
  const moistureAt = sampler(moisture);
  const surface = reliefSurface(seed, thresholds);
  const cityCenters = cities.map(cellCenter);
  const [volcanoX, volcanoY] = cellCenter(volcano);

  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      // El centro del píxel, en celdas.
      const x = (px + 0.5) / PIXELS_PER_CELL;
      const y = (py + 0.5) / PIXELS_PER_CELL;
      const h = heightAt(x, y);
      const color =
        h < thresholds.coast
          ? seaColor(thresholds.coast - h)
          : shade(
              landColor(
                {
                  h,
                  crest: surface[px + py * WIDTH] ?? h,
                  m: moistureAt(x, y),
                  city: Math.min(
                    ...cityCenters.map(([cx, cy]) =>
                      Math.hypot(x - cx, y - cy),
                    ),
                  ),
                  volcano: Math.hypot(x - volcanoX, y - volcanoY),
                  volcanoAngle: Math.atan2(y - volcanoY, x - volcanoX),
                  px,
                  py,
                },
                thresholds,
                top,
              ),
              light(surface, px, py),
            );
      const pixel = (px + py * WIDTH) * 4;
      pixels[pixel] = color[0];
      pixels[pixel + 1] = color[1];
      pixels[pixel + 2] = color[2];
      // En la franja de mar del borde la imagen se vuelve transparente: debajo queda el mar de los
      // biomas, y el borde de la imagen no se nota aunque los dos mares no fueran idénticos.
      pixels[pixel + 3] =
        255 * smoothstep(0, SEA_BORDER_CELLS, distanceToEdge(x, y));
    }
  }
  return encodePng(WIDTH, HEIGHT, pixels);
}

/**
 * Un campo de la grilla leído en cualquier punto (en celdas): interpola entre los centros de las
 * cuatro celdas vecinas, en línea recta, como d3-contour al trazar los polígonos (polygons.ts) y
 * las curvas de la carta. Que la costa pintada cae sobre la de la carta se miró en capturas (el
 * mundo entero y acercado al volcán), no celda por celda.
 */
function sampler(field: readonly number[]): (x: number, y: number) => number {
  const grid = Float32Array.from(field);
  const at = (column: number, row: number) =>
    grid[column + row * GRID_WIDTH] ?? 0;
  return (x, y) => {
    // Los valores están en los centros de las celdas; más allá del último centro, vale el del borde.
    const u = Math.min(Math.max(x - 0.5, 0), GRID_WIDTH - 1);
    const v = Math.min(Math.max(y - 0.5, 0), GRID_HEIGHT - 1);
    const column = Math.min(Math.floor(u), GRID_WIDTH - 2);
    const row = Math.min(Math.floor(v), GRID_HEIGHT - 2);
    const north = mixNumber(at(column, row), at(column + 1, row), u - column);
    const south = mixNumber(
      at(column, row + 1),
      at(column + 1, row + 1),
      u - column,
    );
    return mixNumber(north, south, v - row);
  };
}

/**
 * La superficie que se sombrea, un valor por píxel: el terreno natural leído como función continua
 * (sin los quiebres de interpolar la grilla), con crestas en la montaña y un grano fino que crece
 * con la altura: la playa queda lisa y la montaña, quebrada. Las crestas salen de un ruido
 * "plegado" (1 − |ruido|), que deja filos donde el ruido cruza el cero. El agua es plana: todo lo
 * que está bajo la costa vale la costa.
 */
function reliefSurface(seed: number, t: Thresholds): Float32Array {
  const natural = terrainSampler(deriveSeed(seed, "altura"));
  const noise = createNoise2D(createRandom(deriveSeed(seed, "relieve")));
  const surface = new Float32Array(WIDTH * HEIGHT);
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      const x = (px + 0.5) / PIXELS_PER_CELL;
      const y = (py + 0.5) / PIXELS_PER_CELL;
      const base = natural(x, y);
      const rough = smoothstep(t.coast, t.mountain, base);
      const steep = smoothstep(t.mountain - 0.2, t.peak, base);
      const ridge =
        0.7 * (1 - Math.abs(noise(x / 14, y / 14))) +
        0.3 * (1 - Math.abs(noise(x / 6 + 40, y / 6)));
      const grain =
        0.022 * noise(x / 4, y / 4) + 0.008 * noise(x / 1.7, y / 1.7);
      surface[px + py * WIDTH] = Math.max(
        base + steep * RIDGE_HEIGHT * (ridge - 0.6) + rough * grain,
        t.coast,
      );
    }
  }
  return surface;
}

/**
 * Cuánta luz recibe un píxel, con 1 en el llano: más en las laderas que miran al noroeste, menos en
 * las que le dan la espalda. Es el coseno del ángulo entre la normal de la superficie y la luz
 * (sombreado de Lambert), dividido por el del llano.
 */
function light(surface: Float32Array, px: number, py: number): number {
  const at = (column: number, row: number) =>
    surface[
      Math.min(Math.max(column, 0), WIDTH - 1) +
        Math.min(Math.max(row, 0), HEIGHT - 1) * WIDTH
    ] ?? 0;
  // Cuánto sube el terreno hacia el este y hacia el sur.
  const east = (at(px + 1, py) - at(px - 1, py)) * RELIEF_DEPTH;
  const south = (at(px, py + 1) - at(px, py - 1)) * RELIEF_DEPTH;
  // Una ladera que sube hacia el este y el sur mira al noroeste, de donde viene la luz.
  return (
    (east + south + LIGHT_HEIGHT) / (Math.hypot(east, south, 1) * LIGHT_HEIGHT)
  );
}

/**
 * El color con su luz. La ladera iluminada se aclara un poco; la que queda a la sombra se mezcla
 * con el color de las sombras en vez de oscurecerse hacia el negro, para que el terreno se siga
 * leyendo.
 */
function shade(color: Rgb, lit: number): Rgb {
  if (lit < 1) return mix(color, SHADOW, Math.min(0.75 * (1 - lit), 0.62));
  const factor = Math.min(1 + 0.22 * (lit - 1), 1.1);
  return [
    Math.min(255, color[0] * factor),
    Math.min(255, color[1] * factor),
    Math.min(255, color[2] * factor),
  ];
}

/** El mar: la plataforma clara cerca de la costa, que se oscurece con la profundidad, y la rompiente. */
function seaColor(depth: number): Rgb {
  const water = mix(SEA_SHELF, SEA_DEEP, smoothstep(0, SHELF_DEPTH, depth));
  return mix(water, FOAM, 0.45 * (1 - smoothstep(0, 0.012, depth)));
}

/**
 * La tierra, de la costa a la cumbre: la orilla (arena y pantano), la llanura (árida, pradera o
 * bosque según la humedad), la roca de la montaña, las cumbres y la nieve. Cada franja empieza en
 * el umbral de su bioma (biomes.ts) y se mezcla con la anterior: la roca le gana de a poco a la
 * vegetación, y la nieve queda en las crestas. Encima van las ciudades y el volcán, con los radios
 * de sus biomas.
 */
function landColor(point: LandPoint, t: Thresholds, top: number): Rgb {
  const { h, crest, m } = point;
  const plain = mix(
    mix(
      DRY,
      GRASS,
      smoothstep(t.dry - MOISTURE_BLEND, t.dry + MOISTURE_BLEND, m),
    ),
    FOREST,
    smoothstep(t.wet - MOISTURE_BLEND, t.wet + MOISTURE_BLEND, m),
  );
  const shore = mix(SAND, MARSH, smoothstep(t.coast, t.lowland, h));
  let color = mix(
    shore,
    plain,
    smoothstep(t.lowland - 0.02, t.lowland + 0.04, h),
  );
  color = mix(color, ROCK, smoothstep(t.mountain - 0.03, t.mountain + 0.2, h));
  color = mix(color, SUMMIT, smoothstep(t.peak - 0.05, t.peak + 0.2, crest));
  color = mix(color, SNOW, 0.8 * smoothstep(t.peak + 0.3, top + 0.1, crest));

  const town = 1 - smoothstep(CITY_RADIUS - 2, CITY_RADIUS, point.city);
  if (town > 0) color = mix(color, cityColor(point, town), town);

  const flow =
    1 - smoothstep(VOLCANO_RADIUS - 1.6, VOLCANO_RADIUS, point.volcano);
  if (flow > 0) {
    // Basalto, con el cráter encendido en el centro y ríos de lava que bajan y se apagan.
    const stream =
      Math.max(
        0,
        Math.cos(point.volcanoAngle * LAVA_STREAMS + point.volcano * 2),
      ) ** 14;
    const glow = Math.max(
      1 - smoothstep(0, 0.7, point.volcano),
      stream * (1 - smoothstep(0.3, VOLCANO_RADIUS - 0.4, point.volcano)),
    );
    color = mix(color, mix(BASALT, LAVA, glow), flow);
  }
  return color;
}

/**
 * Una ciudad como en una carta: la mancha del área construida y, encima, los edificios como puntos
 * oscuros, más juntos hacia el centro.
 */
function cityColor({ px, py }: LandPoint, town: number): Rgb {
  const lit =
    px % CITY_BLOCK === 1 &&
    py % CITY_BLOCK === 1 &&
    hash(Math.floor(px / CITY_BLOCK), Math.floor(py / CITY_BLOCK)) < 0.5 * town;
  return lit ? BUILDING : PAVEMENT;
}

/** Un número fijo en [0, 1) para cada par de enteros: decide dónde va un edificio. */
function hash(a: number, b: number): number {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function mixNumber(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    mixNumber(from[0], to[0], amount),
    mixNumber(from[1], to[1], amount),
    mixNumber(from[2], to[2], amount),
  ];
}

/** 0 hasta `from`, 1 desde `to`, y en el medio una subida suave, sin esquinas. */
function smoothstep(from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
