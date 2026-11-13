"use client";

// El radar base, en la sala de monitoreo: un haz que gira y, en su primera vuelta, despeja la
// niebla del círculo que cubre (docs/concepto.md, "Niebla y radar"). La niebla es una capa del
// mapa (fog.ts); el haz es un elemento del DOM pegado al mapa con un Marker, así gira con CSS sin
// que MapLibre tenga que volver a dibujar el mapa en cada cuadro.
import {
  type CanvasSource,
  type Map as MapLibreMap,
  Marker,
} from "maplibre-gl";
import { useEffect, useEffectEvent } from "react";

import { cssNumber, cssToken } from "@/components/map/css-token";
import type { Bounds } from "@/lib/geo/bounds";
import type { Position, Spawn } from "@/lib/world/types";

import { clearSector, createFog, fogCorners, FULL_TURN, inSector } from "./fog";

const FOG_SOURCE = "niebla";
/** La niebla se dibuja debajo de los nombres: los lugares se ven aunque el terreno no. */
const FOG_BELOW = "nombres";
/**
 * Alcance del radar base, en grados: 2,4° son 30 celdas. Con la semilla 151 cubre el 17 % de la
 * isla (2271 de 13.292 celdas de tierra, medido): las antenas tienen terreno para sumar.
 */
const RADAR_RADIUS = 2.4;
/** Lo que tarda el haz en dar una vuelta. */
const TURN_MS = 4000;

interface RadarProps {
  map: MapLibreMap;
  /** Extensión del mundo, la misma de la grilla. */
  bounds: Bounds;
  /** Cuántas celdas tiene la grilla del mundo: un píxel de la niebla por celda. */
  grid: { width: number; height: number };
  /** Dónde está el radar base. */
  base: Position;
  /** Las señales del mundo: el radar detecta las que están a su alcance cuando el haz pasa. */
  spawns: readonly Spawn[];
  /** Avisa qué señales acaba de detectar (por speciesId). */
  onDetect: (ids: number[]) => void;
}

/**
 * El mundo, la base y las señales vienen del servidor y no cambian mientras el mapa vive, así que
 * el efecto corre una vez (dos en desarrollo, por el modo estricto: la limpieza deja el mapa como
 * estaba).
 */
export function Radar({
  map,
  bounds,
  grid,
  base,
  spawns,
  onDetect,
}: RadarProps) {
  // El aviso usa siempre el onDetect más reciente sin que el efecto, y el barrido, vuelvan a empezar.
  const detect = useEffectEvent(onDetect);

  useEffect(() => {
    // Las señales a su alcance que el haz todavía no tocó.
    let pending = spawns.filter(({ position }) =>
      inSector(base, RADAR_RADIUS, 0, FULL_TURN, position),
    );
    const detectSector = (from: number, to: number) => {
      const found = pending.filter(({ position }) =>
        inSector(base, RADAR_RADIUS, from, to, position),
      );
      if (found.length === 0) return;
      pending = pending.filter((spawn) => !found.includes(spawn));
      detect(found.map(({ speciesId }) => speciesId));
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fog = createFog(
      grid.width,
      grid.height,
      bounds,
      cssToken("--hud-bg"),
    );
    // Con movimiento reducido no hay barrido: el radar despeja su círculo de una vez.
    let revealed = reduce.matches;
    if (revealed) {
      clearSector(fog, base, RADAR_RADIUS, 0, FULL_TURN);
      detectSector(0, FULL_TURN);
    }

    // animate: MapLibre copia el canvas en cada cuadro solo mientras la niebla cambia, que es la
    // primera vuelta del haz; después se pausa y queda la última copia.
    map.addSource(FOG_SOURCE, {
      type: "canvas",
      canvas: fog.canvas,
      coordinates: fogCorners(fog),
      animate: !revealed,
    });
    map.addLayer(
      {
        id: FOG_SOURCE,
        type: "raster",
        source: FOG_SOURCE,
        paint: {
          "raster-opacity": cssNumber("--fog-opacity"),
          // Sin fundido al aparecer: el mapa no se ve descubierto antes de la niebla.
          "raster-fade-duration": 0,
        },
      },
      FOG_BELOW,
    );
    const source = map.getSource<CanvasSource>(FOG_SOURCE);

    // El haz: un círculo del tamaño del alcance, con un degradé cónico que gira. El Marker lo
    // centra en la base; el tamaño se recalcula al cambiar el zoom.
    const beam = document.createElement("div");
    beam.className =
      "absolute inset-0 rounded-full border border-hud/40 bg-conic from-transparent from-75% to-hud/35 motion-reduce:bg-none";
    const element = document.createElement("div");
    element.className = "pointer-events-none";
    element.append(beam);
    const marker = new Marker({ element }).setLngLat(base).addTo(map);
    const resize = () => {
      const center = map.project(base);
      const edge = map.project([base[0] + RADAR_RADIUS, base[1]]);
      const size = `${2 * (edge.x - center.x)}px`;
      element.style.width = size;
      element.style.height = size;
    };
    resize();
    map.on("zoom", resize);
    map.on("resize", resize);

    let frame = 0;
    let start: number | null = null;
    let swept = 0;
    const tick = (now: number) => {
      start ??= now;
      const angle = ((now - start) / TURN_MS) * FULL_TURN;
      if (!revealed) {
        // Lo que barrió el haz desde el cuadro anterior, sin pasar de la vuelta completa.
        const to = Math.min(angle, FULL_TURN);
        clearSector(fog, base, RADAR_RADIUS, swept, to);
        detectSector(swept, to);
        swept = to;
        if (to === FULL_TURN || reduce.matches) {
          clearSector(fog, base, RADAR_RADIUS, 0, FULL_TURN);
          detectSector(0, FULL_TURN);
          revealed = true;
          source?.pause();
        }
      }
      // Si el movimiento reducido se activa con la página abierta, el haz se detiene acá.
      if (reduce.matches) {
        frame = 0;
        return;
      }
      beam.style.rotate = `${angle % FULL_TURN}rad`;
      frame = requestAnimationFrame(tick);
    };
    const onMotionChange = () => {
      if (!reduce.matches && !frame) frame = requestAnimationFrame(tick);
    };
    reduce.addEventListener("change", onMotionChange);
    if (!reduce.matches) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      reduce.removeEventListener("change", onMotionChange);
      map.off("zoom", resize);
      map.off("resize", resize);
      marker.remove();
      // Si el mapa ya se destruyó, no tiene estilo y no hay nada que sacar.
      if (map.getLayer(FOG_SOURCE)) map.removeLayer(FOG_SOURCE);
      if (map.getSource(FOG_SOURCE)) map.removeSource(FOG_SOURCE);
    };
  }, [map, bounds, grid, base, spawns]);

  return null;
}
