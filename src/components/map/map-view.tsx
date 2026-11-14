"use client";

// El mapa: MapLibre con el mundo generado como única fuente, sin tiles externos.
// Se carga solo en el navegador (ver map-loader.tsx): MapLibre necesita `window` y WebGL.
import "maplibre-gl/dist/maplibre-gl.css";

import {
  type ErrorEvent as MapErrorEvent,
  type MapMouseEvent,
  type FillLayerSpecification,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type SymbolLayerSpecification,
} from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { DossierPanel } from "@/components/dossier/dossier-panel";
import { underFog } from "@/components/radar/fog";
import { Radar, type Station } from "@/components/radar/radar";
import { usePokemonDetail } from "@/hooks/use-pokemon-detail";
import { type Bounds, expandToAspect } from "@/lib/geo/bounds";
import type {
  BiomeCollection,
  Place,
  Position,
  Spawn,
} from "@/lib/world/types";

import { focusSignal, prefersReducedMotion, releaseFocus } from "./camera";
import { cssFontFamilies, cssNumber, cssToken } from "./css-token";
import { MapLoading } from "./map-status";
import { labelAnchor, PLACE_NAMES_LAYER } from "./places";
import { type SignalSelection, SignalMarkers } from "./signal-markers";

// MapLibre v6 arma la URL de su worker con `import.meta.url`, y si no empieza con http(s) la deja
// vacía. Turbopack reemplaza ese valor por una ruta `file:///ROOT/...`, así que el worker terminaba
// pidiendo la página (docs/errores.md, E-07). Esta expresión, en cambio, Turbopack la reconoce:
// copia el worker como asset en /_next/static/media/ y nos da su URL.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);

export interface MapViewProps {
  /** Los 9 biomas, en el orden en que se pintan (de abajo hacia arriba). */
  biomes: BiomeCollection;
  /** Extensión del mundo: [[oeste, sur], [este, norte]]. */
  bounds: Bounds;
  /** Las señales del mundo, ya ubicadas en el servidor. */
  spawns: readonly Spawn[];
  /** Las ciudades, el volcán y los lagos, con su nombre inventado. */
  places: readonly Place[];
  /** Cuántas celdas tiene la grilla del mundo, para la niebla. */
  grid: { width: number; height: number };
  /** Dónde está el radar base. */
  radarBase: Position;
  /** Las antenas instaladas, en orden. */
  antennas: readonly Station[];
  /** Si se está eligiendo dónde instalar una antena: un clic en el mapa la ubica. */
  installing: boolean;
  /** Entrar o salir del modo de instalación: la tecla A. */
  onToggleInstall: () => void;
  /** Se eligió un punto del mapa para la antena. */
  onInstall: (position: Position) => void;
  /** Las señales que el radar ya detectó, por speciesId: solo esas tienen botón. */
  detected: ReadonlySet<number>;
  /** El radar detectó estas señales. */
  onDetect: (ids: number[]) => void;
  /** Una estación terminó su vuelta, con cuántas señales detectó. */
  onSweepEnd: (station: Station, found: number) => void;
}

const BIOMES_SOURCE = "biomas";
const PLACES_SOURCE = "lugares";

/**
 * Desde qué zoom aparecen los nombres. Con el mundo entero en un celular, el mapa queda tan chico que
 * los botones de las señales los tapan: ahí aparecen después de acercar una vez (medido en capturas).
 */
const NAMES_MIN_ZOOM = 4.5;
/** Los lagos son de pocas celdas: su nombre aparece recién con este zoom (medido en capturas). */
const LAKE_NAMES_MIN_ZOOM = 7;
/**
 * Hasta dónde se acerca el mapa: con 9, una celda del mundo mide 58 px (medido), más que el sprite
 * de una señal identificada. Sin tope, el de MapLibre es 22, y el aro del radar, un div del tamaño
 * de su alcance, llegaba a medir 28 millones de píxeles de ancho (medido).
 */
const MAX_ZOOM = 9;

/**
 * Cuánto se mueve la mira de las antenas con cada flecha: el 5 % del lado más corto del mapa, para
 * que cruzar el mundo entero lleve unas 20 a 30 teclas en cualquier pantalla.
 */
const AIM_STEP = 0.05;

/** Hacia dónde mueve la mira cada flecha, en píxeles de pantalla (y crece hacia abajo). */
const AIM_DIRECTIONS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/**
 * Los nombres de los lugares, con Martian Mono: sin URL de `glyphs`, MapLibre dibuja el texto con
 * la fuente que la página ya cargó (docs/decisiones.md, "Texto en el mundo"). Con fuentes locales
 * (sin `font-faces` en el estilo) no puede pedirla comprimida ni con otro peso, así que va regular,
 * en mayúsculas y con aire entre las letras. Cada nombre va del lado con menos señales cerca
 * (`labelAnchor`), para que los botones no lo tapen.
 * Contraste (WCAG 1.4.3, AA pide 4,5:1), medido en el render: a 1440 px, capturas con y sin los
 * nombres, del mundo entero y con zoom 7,5 sobre cada lugar. Los píxeles del texto dan 13,35:1 o
 * más contra el halo, y 5,24:1 o más contra el bioma de atrás aun sin contar el halo (el peor,
 * sobre las cuevas).
 */
function placeLayers(): SymbolLayerSpecification[] {
  const base = {
    type: "symbol",
    source: PLACES_SOURCE,
    layout: {
      "text-field": ["get", "name"],
      "text-font": cssFontFamilies("--font-martian-mono"),
      "text-size": cssNumber("--map-label-size"),
      "text-transform": "uppercase",
      "text-letter-spacing": cssNumber("--map-label-tracking"),
      "text-anchor": ["get", "anchor"],
      "text-radial-offset": 1.2,
    },
    paint: {
      "text-color": cssToken("--hud-fg"),
      "text-halo-color": cssToken("--hud-bg"),
      "text-halo-width": cssNumber("--map-label-halo"),
    },
  } satisfies Omit<SymbolLayerSpecification, "id">;
  return [
    {
      ...base,
      id: PLACE_NAMES_LAYER,
      filter: ["!=", ["get", "kind"], "lake"],
      minzoom: NAMES_MIN_ZOOM,
    },
    {
      ...base,
      id: "nombres-lagos",
      filter: ["==", ["get", "kind"], "lake"],
      minzoom: LAKE_NAMES_MIN_ZOOM,
    },
  ];
}

/** Límite del mapa: el mundo agrandado a la proporción actual del contenedor. */
function worldLimit(world: Bounds, container: HTMLElement): Bounds {
  return expandToAspect(world, container.clientWidth / container.clientHeight);
}

/** Una capa de relleno por bioma, en el mismo orden que la colección. */
function biomeLayers(biomes: BiomeCollection): FillLayerSpecification[] {
  return biomes.features.map(({ properties: { habitat } }) => ({
    id: `bioma-${habitat}`,
    type: "fill",
    source: BIOMES_SOURCE,
    filter: ["==", ["get", "habitat"], habitat],
    paint: { "fill-color": cssToken(`--bioma-${habitat}`) },
  }));
}

export function MapView({
  biomes,
  bounds,
  spawns,
  places,
  grid,
  radarBase,
  antennas,
  installing,
  onToggleInstall,
  onInstall,
  detected,
  onDetect,
  onSweepEnd,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Props con las que se crea el mapa. El mundo se genera al compilar y no cambia: el mapa se crea
  // una sola vez, con ellas.
  const initialRef = useRef({ biomes, bounds, places, spawns });
  // El mapa, cuando ya cargó su estilo: recién ahí se montan las señales.
  const [loadedMap, setLoadedMap] = useState<MapLibreMap | null>(null);
  // Si el mapa ya dibujó la niebla: hasta entonces sigue el cartel de carga.
  const [fogDrawn, setFogDrawn] = useState(false);
  // Un error del mapa antes de `load`, que lo deja sin dibujar.
  const [failure, setFailure] = useState<Error | null>(null);
  // La señal de la ficha. Sigue puesta mientras la ficha se cierra (la animación de salida muestra
  // su contenido) y se borra al terminar: ahí el hook corta un pedido que siga en curso.
  const [selection, setSelection] = useState<SignalSelection | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const { identification, identified, retry } = usePokemonDetail(
    selection?.spawn.speciesId ?? null,
  );
  // Dónde está la cámara mientras la ficha está abierta. Lo lee el redimensionado, que encuadra el
  // mundo otra vez y después vuelve a la señal.
  const focusRef = useRef<Position | null>(null);

  // Con el modo de instalación, un clic en el mapa elige el lugar de la antena. MapLibre no emite
  // `click` si el puntero se movió (un arrastre), así que mover el mapa no instala nada. Un clic en
  // una señal también le llega al mapa: ese abre la ficha y no instala.
  // Con teclado, al entrar al modo el foco va al mapa y una mira aparece en el centro: las flechas
  // la mueven por el mundo y Enter instala ahí. Se mueve la mira y no el mapa porque al cargar el
  // mundo entero está a la vista y el límite del mapa no deja lugar para moverlo (E-27). La mira es
  // un Marker, así acompaña al mapa si se acerca o se arrastra; se ve solo con el foco del teclado
  // en el mapa.
  const install = useEffectEvent(onInstall);
  useEffect(() => {
    if (!loadedMap || !installing) return;
    const canvas = loadedMap.getCanvas();
    canvas.style.cursor = "crosshair";
    canvas.focus();
    const onClick = ({ lngLat, originalEvent }: MapMouseEvent) => {
      const target = originalEvent.target;
      if (target instanceof Element && target.closest(".maplibregl-marker"))
        return;
      install(lngLat.toArray());
    };

    const aim = document.createElement("div");
    aim.setAttribute("aria-hidden", "true");
    aim.className =
      "pointer-events-none hidden size-6 group-has-[.maplibregl-canvas:focus-visible]:block";
    for (const line of [
      "absolute top-1/2 left-0 h-px w-full bg-hud",
      "absolute top-0 left-1/2 h-full w-px bg-hud",
    ]) {
      const span = document.createElement("span");
      span.className = line;
      aim.append(span);
    }
    const marker = new Marker({ element: aim })
      .setLngLat(loadedMap.getCenter())
      .addTo(loadedMap);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        install(marker.getLngLat().toArray());
        return;
      }
      const direction = AIM_DIRECTIONS[event.key];
      if (!direction) return;
      // La flecha es para la mira: MapLibre escucha en el contenedor, y no le llega.
      event.preventDefault();
      event.stopPropagation();
      const step = Math.min(canvas.clientWidth, canvas.clientHeight) * AIM_STEP;
      const point = loadedMap.project(marker.getLngLat());
      const next = loadedMap.unproject([
        point.x + direction[0] * step,
        point.y + direction[1] * step,
      ]);
      // La mira no sale del mundo: afuera no hay nada que despejar.
      const [[west, south], [east, north]] = bounds;
      const lngLat: Position = [
        Math.min(Math.max(next.lng, west), east),
        Math.min(Math.max(next.lat, south), north),
      ];
      marker.setLngLat(lngLat);
      // Con el mapa acercado, si la mira sale de la vista, el mapa la sigue.
      if (!loadedMap.getBounds().contains(lngLat)) {
        if (prefersReducedMotion()) loadedMap.jumpTo({ center: lngLat });
        else loadedMap.easeTo({ center: lngLat });
      }
    };
    loadedMap.on("click", onClick);
    canvas.addEventListener("keydown", onKeyDown);
    return () => {
      loadedMap.off("click", onClick);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.style.cursor = "";
      marker.remove();
    };
  }, [loadedMap, installing, bounds]);

  // La tecla A entra o sale del modo de instalación (docs/concepto.md, "Teclado"), solo con el foco
  // en el mapa (también en una de sus señales) o en el control de las antenas: un atajo de una
  // letra en toda la página también se dispararía al dictar con la voz (WCAG 2.1.4). Con la ficha
  // abierta o con una tecla modificadora, tampoco.
  const toggleInstall = useEffectEvent(onToggleInstall);
  useEffect(() => {
    if (dossierOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "a" || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest(".maplibregl-map, [data-antenna-control]")
      )
        return;
      toggleInstall();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dossierOpen]);

  // Crea el mapa una sola vez y lo destruye al desmontar.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initial = initialRef.current;

    const map = new MapLibreMap({
      container,
      style: {
        version: 8,
        sources: {
          [BIOMES_SOURCE]: { type: "geojson", data: initial.biomes },
          [PLACES_SOURCE]: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: initial.places.map(({ name, kind, position }) => ({
                type: "Feature",
                properties: {
                  name,
                  kind,
                  anchor: labelAnchor(position, initial.spawns),
                },
                geometry: { type: "Point", coordinates: position },
              })),
            },
          },
        },
        layers: [
          {
            id: "fondo",
            type: "background",
            // Fuera del mundo hay mar que nunca se despeja: se pinta ya cubierto por la niebla.
            paint: {
              "background-color": underFog(
                cssToken("--bioma-sea"),
                cssToken("--hud-bg"),
                cssNumber("--fog-opacity"),
              ),
            },
          },
          ...biomeLayers(initial.biomes),
          ...placeLayers(),
        ],
      },
      // Sin fundido de los nombres al aparecer o al chocar, con movimiento reducido. Se lee al crear
      // el mapa: MapLibre no lo deja cambiar después.
      fadeDuration: prefersReducedMotion() ? 0 : 300,
      bounds: initial.bounds,
      // Si el límite fuera el mundo tal cual, en una pantalla angosta MapLibre acercaría el mapa
      // para no mostrar nada afuera, y la isla quedaría cortada a los costados.
      maxBounds: worldLimit(initial.bounds, container),
      maxZoom: MAX_ZOOM,
      // El canvas de MapLibre ya es una región con nombre (role="region", y tabindex="0" para
      // moverlo con las flechas). `locale` traduce ese nombre, que por defecto es "Map".
      locale: { "Map.Title": "Mapa del mundo" },
      attributionControl: false,
      // Ni rotar ni inclinar: el mundo se ve desde arriba y con el norte arriba, que es el orden
      // del Tab entre las señales, y no hay un control para volver al norte. dragRotate apaga el
      // mouse (rotar e inclinar); touchPitch, inclinar con dos dedos.
      dragRotate: false,
      touchPitch: false,
    });
    // Sin opción en el constructor: girar con dos dedos, y Shift + flechas (que así tampoco
    // inclinan).
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    // Al rotar el teléfono o cambiar el tamaño de la ventana: límite nuevo y el mundo encuadrado
    // otra vez. MapLibre se redimensiona con el límite viejo, que puede dejar el mapa acercado
    // y la isla cortada; el límite nuevo solo impide salir, no aleja. absolutePadding encuadra
    // en toda la pantalla y deja el padding en 0, aunque la ficha esté abierta: en ese caso la
    // cámara vuelve a la señal sin animación, con el padding del panel nuevo.
    const onResize = () => {
      // El zoom de antes, para que volver a la señal no lo baje al del mundo entero.
      const zoom = map.getZoom();
      map.setMaxBounds(worldLimit(initial.bounds, container));
      map.fitBounds(initial.bounds, { animate: false, absolutePadding: true });
      const focus = focusRef.current;
      if (focus) {
        focusSignal(map, initial.bounds, focus, {
          animate: false,
          keepZoom: zoom,
        });
      }
    };
    map.on("resize", onResize);
    // Antes de `load`, un error deja el mapa sin dibujar: por ejemplo, si no baja el worker (como
    // en E-07). Después de `load` se deja de escuchar, y MapLibre los muestra en la consola.
    const onError = ({ error }: MapErrorEvent) =>
      setFailure(new Error(error.message));
    map.on("error", onError);
    const onLoad = () => {
      map.off("error", onError);
      setLoadedMap(map);
    };
    map.on("load", onLoad);

    return () => {
      map.off("resize", onResize);
      map.off("error", onError);
      map.off("load", onLoad);
      map.remove();
      setLoadedMap(null);
      setFogDrawn(false);
    };
  }, []);

  // React lleva al error boundary (map-error.tsx) lo que se lanza al renderizar o en un efecto,
  // como el GPUInitializationError del constructor, pero no lo que llega en un evento: por eso
  // el error del mapa se guarda en el estado y se lanza acá.
  if (failure) throw failure;

  // MapLibre le pone `position: relative` al contenedor (.maplibregl-map), y su CSS le gana a
  // las clases de Tailwind: por eso el posicionamiento va en un div de afuera. El cartel de carga
  // tapa el mapa hasta que dibuja la niebla, no solo hasta `load`: entre los dos, sin el cartel, se
  // pintaba un cuadro con la isla descubierta (medido). MapLibre le pone tabindex al canvas al
  // crearlo, y sin `inert` el Tab dejaba el foco ahí, escondido debajo del cartel.
  return (
    <div className="group absolute inset-0">
      <div ref={containerRef} inert={!fogDrawn} className="h-full w-full" />
      {loadedMap && (
        <>
          {/* El aro y el haz de cada estación van justo después del canvas del mapa (station.tsx):
              debajo de las señales, también en una antena que se instala con las señales ya puestas
              (E-26). */}
          <Radar
            map={loadedMap}
            bounds={bounds}
            grid={grid}
            stations={[
              { id: 0, kind: "base", position: radarBase },
              ...antennas,
            ]}
            spawns={spawns}
            onDetect={onDetect}
            onSweepEnd={onSweepEnd}
            onFogDrawn={() => setFogDrawn(true)}
          />
          <SignalMarkers
            map={loadedMap}
            places={places}
            spawns={spawns}
            detected={detected}
            selectedId={
              dossierOpen ? (selection?.spawn.speciesId ?? null) : null
            }
            identified={identified}
            onSelect={(next) => {
              setSelection(next);
              setDossierOpen(true);
              focusRef.current = next.spawn.position;
              focusSignal(loadedMap, bounds, next.spawn.position);
            }}
          />
        </>
      )}
      {!fogDrawn && <MapLoading />}
      {/* Montado siempre, aunque no haya señal: Base UI anima la entrada solo cuando el panel ya
          existía cerrado y pasa a abierto (useTransitionStatus, animateInitialOpen). */}
      <DossierPanel
        open={dossierOpen}
        identification={identification}
        place={selection?.place ?? null}
        onRetry={retry}
        onClose={() => {
          setDossierOpen(false);
          focusRef.current = null;
          if (loadedMap) releaseFocus(loadedMap);
        }}
        onClosed={() => setSelection(null)}
        returnFocus={() => selection?.button ?? null}
      />
    </div>
  );
}
