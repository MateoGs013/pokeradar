// La red de radares: una sola niebla para todas las estaciones (el radar base y las antenas), y las
// señales que ninguna detectó todavía. Cada estación barre por su cuenta (station.tsx); la red
// lleva la cuenta de los barridos en curso, porque mientras haya alguno el mapa tiene que copiar el
// canvas de la niebla en cada cuadro, y cuando no queda ninguno, dejar de hacerlo.
import type { CanvasSource } from "maplibre-gl";

import type { Position, Spawn } from "@/lib/world/types";

import { clearSector, type Fog, inSector } from "./fog";

/**
 * Alcance de cada estación, en grados: 2,4° son 30 celdas. Con la semilla 151, el radar base cubre
 * el 17 % de la isla (2271 de 13.292 celdas de tierra, medido): las antenas tienen terreno para
 * sumar.
 */
export const RADAR_RADIUS = 2.4;

/**
 * Cuántas antenas se pueden instalar: el concepto pide de 3 a 5, para que haya que elegir dónde
 * ponerlas. Tienen el mismo alcance que el radar base.
 */
export const MAX_ANTENNAS = 4;

export class RadarNetwork {
  readonly fog: Fog;
  /** Las señales que ninguna estación detectó todavía. */
  private pending: Spawn[];
  /** La fuente del mapa que muestra la niebla, mientras está en el mapa. */
  private source: CanvasSource | null = null;
  /** Cuántas estaciones están barriendo. */
  private sweeping = 0;

  constructor(fog: Fog, spawns: readonly Spawn[]) {
    this.fog = fog;
    this.pending = [...spawns];
  }

  /**
   * Despeja el sector del círculo de una estación (ver inSector) y devuelve las señales que toca y
   * que nadie había detectado: cada señal se detecta una sola vez, aunque dos círculos se pisen.
   */
  sweep(center: Position, from: number, to: number): Spawn[] {
    clearSector(this.fog, center, RADAR_RADIUS, from, to);
    const found = this.pending.filter(({ position }) =>
      inSector(center, RADAR_RADIUS, from, to, position),
    );
    if (found.length > 0) {
      this.pending = this.pending.filter((spawn) => !found.includes(spawn));
    }
    return found;
  }

  /**
   * La fuente recién sumada al mapa, o null cuando se saca. Si una estación ya estaba barriendo
   * (las estaciones arrancan antes que la fuente: React corre los efectos de los hijos primero),
   * empieza a copiar el canvas.
   */
  attach(source: CanvasSource | null) {
    this.source = source;
    if (source && this.sweeping > 0) source.play();
  }

  /** Qué parte del mundo despejaron las estaciones, de 0 a 1: celdas despejadas sobre el total. */
  coverage(): number {
    let cleared = 0;
    for (const cell of this.fog.cleared) cleared += cell;
    return cleared / this.fog.cleared.length;
  }

  /** Una estación empieza a barrer: el mapa copia el canvas en cada cuadro. */
  startSweep() {
    this.sweeping++;
    this.source?.play();
  }

  /**
   * Una estación terminó (o se cortó) su barrido. Con el último, el mapa sube la copia final y deja
   * de copiar: pause() la sube aunque el barrido haya sido de una vez, sin cuadros en el medio.
   */
  endSweep() {
    this.sweeping--;
    if (this.sweeping === 0) this.source?.pause();
  }
}
