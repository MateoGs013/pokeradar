"use client";

// Una estación de radar: el radar base o una antena. Da una vuelta con su haz, despeja la niebla del
// círculo que cubre y detecta las señales que toca (docs/concepto.md, "Niebla y radar"). Después se
// apaga: no hay más nada que barrer. El haz es un elemento del DOM pegado al mapa con un Marker,
// que gira con requestAnimationFrame: rotarlo no le pide nada al mapa, que se redibuja en cada
// cuadro de la vuelta solo porque la niebla cambia.
import { type Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useEffectEvent } from "react";

import { cssNumber } from "@/components/map/css-token";
import type { Position } from "@/lib/world/types";

import { FULL_TURN } from "./fog";
import { RADAR_RADIUS, type RadarNetwork } from "./network";

interface RadarStationProps {
  map: MapLibreMap;
  network: RadarNetwork;
  /** Dónde está la estación. */
  position: Position;
  /** Si lleva la marca del puesto en el centro: las antenas sí; el radar base está en una ciudad. */
  mark: boolean;
  /** Avisa qué señales acaba de detectar (por speciesId). */
  onDetect: (ids: number[]) => void;
  /** Avisa que terminó la vuelta y cuántas señales detectó en total. */
  onSweepEnd: (found: number) => void;
}

/**
 * La estación no cambia de lugar mientras vive: el efecto corre una vez (dos en desarrollo, por el
 * modo estricto: la limpieza corta el barrido y la vuelta empieza de nuevo).
 */
export function RadarStation({
  map,
  network,
  position,
  mark,
  onDetect,
  onSweepEnd,
}: RadarStationProps) {
  // Los avisos usan siempre las funciones más recientes sin que el efecto, y el barrido, vuelvan a
  // empezar.
  const detect = useEffectEvent(onDetect);
  const sweepEnd = useEffectEvent(onSweepEnd);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const turn = cssNumber("--radar-turn");
    let total = 0;
    const sweep = (from: number, to: number) => {
      const found = network.sweep(position, from, to);
      if (found.length === 0) return;
      total += found.length;
      detect(found.map(({ speciesId }) => speciesId));
    };

    // El alcance es un aro fijo del tamaño del círculo; el haz, un degradé cónico adentro, que da
    // la vuelta y se desvanece. Con movimiento reducido el haz no se ve. El Marker centra el aro
    // en la estación, y su tamaño se recalcula al cambiar el zoom.
    const beam = document.createElement("div");
    beam.className =
      "absolute inset-0 rounded-full bg-conic from-transparent from-75% to-hud/35 transition-opacity duration-700 motion-reduce:hidden";
    const element = document.createElement("div");
    element.className = "pointer-events-none rounded-full border border-hud/40";
    element.append(beam);
    if (mark) {
      const post = document.createElement("div");
      post.className =
        "absolute top-1/2 left-1/2 size-2 -translate-1/2 rotate-45 bg-hud";
      element.append(post);
    }
    const marker = new Marker({ element }).setLngLat(position).addTo(map);
    // Marker lo agrega al final del contenedor, encima de las señales. El contenedor también tiene
    // el canvas del mapa, primero: justo después del canvas, el aro queda encima del mapa y debajo
    // de las señales, también en una antena que se instala con las señales ya puestas. Al
    // principio del contenedor, el mapa lo tapaba (E-26).
    map.getCanvas().after(element);
    const resize = () => {
      const center = map.project(position);
      const edge = map.project([position[0] + RADAR_RADIUS, position[1]]);
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
    // Al completar la vuelta, o en el primer cuadro con movimiento reducido (también si se activa
    // con la página abierta), la estación despeja lo que faltara, avisa a la red que terminó y el
    // haz se apaga.
    const finish = () => {
      sweep(0, FULL_TURN);
      network.endSweep();
      beam.style.opacity = "0";
      frame = 0;
      sweepEnd(total);
    };
    const tick = (now: number) => {
      start ??= now;
      // Lo que barrió el haz desde el cuadro anterior, sin pasar de la vuelta completa.
      const to = Math.min(((now - start) / turn) * FULL_TURN, FULL_TURN);
      sweep(swept, to);
      swept = to;
      beam.style.rotate = `${to}rad`;
      if (to === FULL_TURN || reduce.matches) {
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    network.startSweep();
    // Con movimiento reducido no hay barrido: en el primer cuadro, tick despeja el círculo de una
    // vez. Esperar ese cuadro también con movimiento reducido deja que la limpieza del modo estricto
    // corte la primera corrida antes de detectar nada; si no, la segunda no encontraba señales y
    // avisaba "ninguna señal en alcance" (medido en desarrollo).
    frame = requestAnimationFrame(tick);

    return () => {
      // Un barrido cortado a la mitad también termina para la red.
      if (frame) {
        cancelAnimationFrame(frame);
        network.endSweep();
      }
      map.off("zoom", resize);
      map.off("resize", resize);
      marker.remove();
    };
  }, [map, network, position, mark]);

  return null;
}
