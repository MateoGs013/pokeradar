"use client";

// El mapa: MapLibre con el mundo generado como única fuente, sin tiles externos.
// Se carga solo en el navegador (ver map-loader.tsx): MapLibre necesita `window` y WebGL.
import "maplibre-gl/dist/maplibre-gl.css";

import {
  type ErrorEvent as MapErrorEvent,
  type FillLayerSpecification,
  Map as MapLibreMap,
  setWorkerUrl,
  type SymbolLayerSpecification,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { DossierPanel } from "@/components/dossier/dossier-panel";
import { usePokemonDetail } from "@/hooks/use-pokemon-detail";
import { type Bounds, expandToAspect } from "@/lib/geo/bounds";
import type {
  BiomeCollection,
  Place,
  Position,
  Spawn,
} from "@/lib/world/types";

import { focusSignal, prefersReducedMotion, releaseFocus } from "./camera";
import { MapLoading } from "./map-status";
import { labelAnchor } from "./places";
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
 * Los nombres de los lugares, con Martian Mono: sin URL de `glyphs`, MapLibre dibuja el texto con
 * la fuente que la página ya cargó (docs/decisiones.md, "Texto en el mundo"). No puede pedirla
 * comprimida ni con otro peso, así que va regular, en mayúsculas y con aire entre las letras.
 * Cada nombre va del lado opuesto a la señal más cercana (`labelAnchor`), para que el botón no lo tape.
 * Contraste (WCAG 1.4.3, AA pide 4,5:1), con la fórmula de WCAG sobre los colores de globals.css y
 * sin contar el halo: --hud-fg da de 5,94:1 sobre las cuevas, el bioma más claro, a 14,34:1 sobre el
 * mar (E-16).
 */
function placeLayers(): SymbolLayerSpecification[] {
  const base = {
    type: "symbol",
    source: PLACES_SOURCE,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Martian Mono"],
      "text-size": 12,
      "text-transform": "uppercase",
      "text-letter-spacing": 0.1,
      "text-anchor": ["get", "anchor"],
      "text-radial-offset": 1.2,
    },
    paint: {
      "text-color": cssToken("--hud-fg"),
      "text-halo-color": cssToken("--hud-bg"),
      "text-halo-width": 1.5,
    },
  } satisfies Omit<SymbolLayerSpecification, "id">;
  return [
    {
      ...base,
      id: "nombres",
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

/** Lee un token de color de globals.css (los colores viven en un solo lugar). */
function cssToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
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

export function MapView({ biomes, bounds, spawns, places }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Props con las que se crea el mapa. El mundo se genera al compilar y no cambia: el mapa se crea
  // una sola vez, con ellas.
  const initialRef = useRef({ biomes, bounds, places, spawns });
  // El mapa, cuando ya cargó su estilo: recién ahí se montan las señales.
  const [loadedMap, setLoadedMap] = useState<MapLibreMap | null>(null);
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
            paint: { "background-color": cssToken("--bioma-sea") },
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
    };
  }, []);

  // React lleva al error boundary (map-error.tsx) lo que se lanza al renderizar o en un efecto,
  // como el GPUInitializationError del constructor, pero no lo que llega en un evento: por eso
  // el error del mapa se guarda en el estado y se lanza acá.
  if (failure) throw failure;

  // MapLibre le pone `position: relative` al contenedor (.maplibregl-map), y su CSS le gana a
  // las clases de Tailwind: por eso el posicionamiento va en un div de afuera. Hasta `load`, el
  // cartel de carga tapa el mapa todavía vacío. MapLibre le pone tabindex al canvas al crearlo, y
  // sin `inert` el Tab dejaba el foco ahí, escondido debajo del cartel.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} inert={!loadedMap} className="h-full w-full" />
      {loadedMap ? (
        <SignalMarkers
          map={loadedMap}
          bounds={bounds}
          spawns={spawns}
          selectedId={dossierOpen ? (selection?.spawn.speciesId ?? null) : null}
          identified={identified}
          onSelect={(next) => {
            setSelection(next);
            setDossierOpen(true);
            focusRef.current = next.spawn.position;
            focusSignal(loadedMap, bounds, next.spawn.position);
          }}
        />
      ) : (
        <MapLoading />
      )}
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
