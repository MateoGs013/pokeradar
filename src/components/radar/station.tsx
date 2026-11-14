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
  /** Avisa qué señales acaba de detectar (por speciesId). */
  onDetect: (ids: number[]) => void;
}

/**
 * La estación no cambia de lugar mientras vive: el efecto corre una vez (dos en desarrollo, por el
 * modo estricto: la limpieza corta el barrido y la vuelta empieza de nuevo).
 */
export function RadarStation({
  map,
  network,
  position,
  onDetect,
}: RadarStationProps) {
  // El aviso usa siempre el onDetect más reciente sin que el efecto, y el barrido, vuelvan a empezar.
  const detect = useEffectEvent(onDetect);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const turn = cssNumber("--radar-turn");
    const sweep = (from: number, to: number) => {
      const found = network.sweep(position, from, to);
      if (found.length > 0) detect(found.map(({ speciesId }) => speciesId));
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
    const marker = new Marker({ element }).setLngLat(position).addTo(map);
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
    // Al completar la vuelta, o si el movimiento reducido se activa con la página abierta, la
    // estación despeja lo que faltara, avisa a la red que terminó y el haz se apaga.
    const finish = () => {
      sweep(0, FULL_TURN);
      network.endSweep();
      beam.style.opacity = "0";
      frame = 0;
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
    // Con movimiento reducido no hay barrido: la estación despeja su círculo de una vez.
    if (reduce.matches) finish();
    else frame = requestAnimationFrame(tick);

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
  }, [map, network, position]);

  return null;
}
