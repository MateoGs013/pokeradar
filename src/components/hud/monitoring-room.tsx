"use client";

// La sala de monitoreo: el rótulo de la esquina, el control de las antenas, el aviso de las
// detecciones y el mapa. Guarda qué señales detectó el radar, porque las usan todos: el mapa
// muestra solo esas, el rótulo las cuenta y el aviso dice dónde aparecieron. Y guarda las antenas:
// el control las instala y el mapa las dibuja.
import { useEffect, useState } from "react";

import { MapLoader } from "@/components/map/map-loader";
import type { MapViewProps } from "@/components/map/map-view";
import { northToSouth, signalPlaces } from "@/components/map/places";
import { MAX_ANTENNAS } from "@/components/radar/network";
import type { Station } from "@/components/radar/radar";
import { Button } from "@/components/ui/button";
import type { Position } from "@/lib/world/types";

interface MonitoringRoomProps extends Omit<
  MapViewProps,
  | "antennas"
  | "installing"
  | "onToggleInstall"
  | "onInstall"
  | "detected"
  | "onDetect"
  | "onSweepEnd"
> {
  seed: number;
  /** Huella del mundo: si coincide entre local y producción, el mundo es el mismo. */
  hash: string;
}

export function MonitoringRoom({
  seed,
  hash,
  ...mapProps
}: MonitoringRoomProps) {
  const [detected, setDetected] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [announcement, setAnnouncement] = useState("");
  const [antennas, setAntennas] = useState<readonly Station[]>([]);
  // Si se está eligiendo dónde va la próxima antena.
  const [installing, setInstalling] = useState(false);
  // Lo último que pasó con las antenas, a la vista: el resultado de su vuelta o un punto inválido.
  const [radarStatus, setRadarStatus] = useState("");
  // La etiqueta de cada señal, la misma de su botón. Las señales se ubican al compilar y no
  // cambian: se calcula una vez.
  const [labels] = useState(
    () =>
      new Map(
        signalPlaces(northToSouth(mapProps.spawns), mapProps.places).map(
          ({ spawn, label }) => [spawn.speciesId, label],
        ),
      ),
  );

  // Un aviso para el lector de pantalla. Si es igual al anterior, el texto de la región viva no
  // cambiaría y no se volvería a anunciar: se alterna un espacio duro al final, que no se lee.
  const announce = (text: string) =>
    setAnnouncement((previous) => (previous === text ? `${text} ` : text));

  // Un aviso por detección: con una sola señal, dónde está; con varias, cuántas.
  const onDetect = (ids: number[]) => {
    setDetected((previous) => new Set([...previous, ...ids]));
    const [first, ...others] = ids;
    if (first === undefined) return;
    announce(
      others.length === 0
        ? `Señal detectada en ${labels.get(first)}`
        : `${ids.length} señales detectadas`,
    );
  };

  // Lo que dice una estación al terminar su vuelta: si no detectó nada, el estado vacío, también al
  // lector de pantalla; si detectó, ya se anunció cada señal y solo queda a la vista el total.
  const onSweepEnd = ({ id, kind }: Station, found: number) => {
    const name = kind === "base" ? "Radar base" : `Antena ${id}`;
    if (found === 0) {
      const empty = `${name}: ninguna señal en alcance`;
      setRadarStatus(empty);
      announce(empty);
    } else if (kind === "antenna") {
      setRadarStatus(
        `${name}: ${found} ${found === 1 ? "señal detectada" : "señales detectadas"}`,
      );
    }
  };

  // El punto elegido tiene que estar dentro del mundo: afuera no hay nada que despejar.
  const onInstall = ([lng, lat]: Position) => {
    const [[west, south], [east, north]] = mapProps.bounds;
    if (lng < west || lng > east || lat < south || lat > north) {
      const outside = "Ese punto está fuera del mundo";
      setRadarStatus(outside);
      announce(outside);
      return;
    }
    if (antennas.length >= MAX_ANTENNAS) return;
    const id = antennas.length + 1;
    setAntennas([...antennas, { id, kind: "antenna", position: [lng, lat] }]);
    setInstalling(false);
    const installed = `Antena ${id} de ${MAX_ANTENNAS} instalada`;
    setRadarStatus(installed);
    announce(installed);
  };

  // Entra o sale del modo de instalación, desde el botón o con la tecla A. Al entrar, el resultado
  // de la antena anterior ya no hace falta, y el lector de pantalla recibe cómo seguir.
  const toggleInstall = () => {
    if (installing) {
      setInstalling(false);
      announce("Instalación cancelada");
      return;
    }
    if (antennas.length >= MAX_ANTENNAS) {
      announce(`Las ${MAX_ANTENNAS} antenas ya están instaladas`);
      return;
    }
    setRadarStatus("");
    announce(
      "Instalando una antena: tocá el mapa donde va, o mové la mira con las flechas y apretá Enter para instalarla ahí. Esc cancela.",
    );
    setInstalling(true);
  };

  // Esc sale del modo de instalación sin instalar. Con la ficha abierta (un clic en una señal la
  // abre también en el modo), ese Esc es de la ficha: la cierra y el modo sigue.
  useEffect(() => {
    if (!installing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"]')) return;
      setInstalling(false);
      announce("Instalación cancelada");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [installing]);

  const full = antennas.length >= MAX_ANTENNAS;

  // El rótulo va antes que el mapa para que el encabezado sea lo primero que lee un lector de
  // pantalla; z-10 lo deja dibujado encima del mapa, que viene después. Lleva fondo porque al
  // mover el mapa puede quedar cualquier bioma debajo, y sin él el texto apagado no se lee bien
  // sobre los más claros. Desde md, cuando la ficha va al costado, el rótulo corta la línea antes
  // del panel (más un margen igual al de la izquierda) en vez de quedar tapado.
  // El aviso existe desde el HTML del servidor, vacío: un lector de pantalla anuncia los cambios de
  // una región viva que ya estaba, no siempre los de una que aparece con el texto puesto.
  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 z-10 bg-background/80 px-1.5 py-0.5 font-mono text-xs text-balance text-muted-foreground font-stretch-condensed md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))]">
        {/* Cada dato en un span sin cortes: si no entra en una línea, corta en un " · " y
            no entre un nombre y su valor. */}
        <h1 className="inline tracking-widest text-hud uppercase">PokéRadar</h1>{" "}
        · <span className="whitespace-nowrap">semilla {seed}</span> ·{" "}
        <span className="whitespace-nowrap">huella {hash}</span> ·{" "}
        <span className="whitespace-nowrap">
          {detected.size} de {mapProps.spawns.length} señales
        </span>
      </div>
      {/* El control de las antenas, abajo a la izquierda. El botón alterna el modo de instalación
          (aria-pressed); con las cuatro instaladas queda deshabilitado, y el contador dice por qué.
          Arriba, a la vista, lo último que pasó y, en el modo, qué hacer: el panel está anclado
          abajo y crece hacia arriba, así que el botón no se mueve cuando esas líneas aparecen o se
          van. El fondo es opaco: con el del rótulo (al 80 %), el pulso de una señal debajo bajaba
          el contraste del texto (medido). Con `data-antenna-control`, el mapa sabe que la tecla A
          vale también con el foco acá (map-view.tsx). */}
      <div
        data-antenna-control
        className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-(--spacing(6)))] flex-col items-start gap-1.5 bg-background px-1.5 py-1 font-mono text-xs text-muted-foreground md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))]"
      >
        {radarStatus && <p>{radarStatus}</p>}
        {installing && (
          <p>
            Tocá el mapa donde va la antena. Con teclado: flechas y Enter.{" "}
            <span className="whitespace-nowrap">Esc cancela.</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Button
            aria-pressed={installing}
            disabled={full}
            onClick={toggleInstall}
            className="aria-pressed:bg-hud/15"
          >
            Instalar antena
          </Button>
          <span className="whitespace-nowrap">
            Antenas {antennas.length} de {MAX_ANTENNAS}
          </span>
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <MapLoader
        {...mapProps}
        antennas={antennas}
        installing={installing}
        onToggleInstall={toggleInstall}
        onInstall={onInstall}
        detected={detected}
        onDetect={onDetect}
        onSweepEnd={onSweepEnd}
      />
    </>
  );
}
