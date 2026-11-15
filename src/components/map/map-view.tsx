"use client";

// El mapa: MapLibre. En el modo mundo, el mundo generado es la única fuente y no hay teselas; en el
// modo real, el estilo y las teselas son de OpenFreeMap (real-style.ts).
// Se carga solo en el navegador (ver map-loader.tsx): MapLibre necesita `window` y WebGL.
import "maplibre-gl/dist/maplibre-gl.css";

import {
  type BackgroundLayerSpecification,
  type ErrorEvent as MapErrorEvent,
  type MapMouseEvent,
  type FillLayerSpecification,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type StyleSpecification,
  type SymbolLayerSpecification,
} from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { DossierPanel } from "@/components/dossier/dossier-panel";
import { SystemBoot } from "@/components/onboarding/system-boot";
import { underFog } from "@/components/radar/fog";
import { Radar, type Station } from "@/components/radar/radar";
import { usePokemonDetail } from "@/hooks/use-pokemon-detail";
import type { WeatherState } from "@/hooks/use-weather";
import type { Boost } from "@/lib/boosts";
import { reducedMotion } from "@/lib/motion";
import type { MotionLevel } from "@/lib/shift";
import { type Bounds, clampToMap, expandToAspect } from "@/lib/geo/bounds";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import type {
  BiomeCollection,
  Place,
  Position,
  Spawn,
} from "@/lib/world/types";

import { focusSignal, releaseFocus } from "./camera";
import { cssFontFamilies, cssNumber, cssToken } from "./css-token";
import { type Frame, mapBounds } from "./frame";
import { labelAnchor, PLACE_NAMES_LAYER } from "./places";
import {
  cityDot,
  hudStyle,
  MISSING_CITY_DOT,
  REAL_STYLE_URL,
} from "./real-style";
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
  /**
   * Si el turno empezó: recién ahí el radar base da su primera vuelta. Antes, el mapa y la niebla
   * cargan por detrás del inicio de turno.
   */
  active: boolean;
  /** Una estación terminó su vuelta, con cuántas señales detectó. */
  onSweepEnd: (station: Station, found: number) => void;
  /** Al terminar cada vuelta: qué parte del mundo está despejada, de 0 a 1. */
  onCoverage: (coverage: number) => void;
  /** Las señales variocolor (lib/shiny.ts). */
  shiny: ReadonlySet<number>;
  /** El clima, para la fila Clima de la ficha. */
  weather: WeatherState;
  /** Lo que potencia tipos (el clima y la noche): las señales y la ficha los marcan. */
  boosts: readonly Boost[];
  /** De noche, el mundo se oscurece (lib/night.ts). */
  night: boolean;
  /** Se identificó por primera vez la especie de una señal: llegó su ficha. */
  onIdentify: (speciesId: number, detail: PokemonDetail) => void;
  /**
   * Dónde se dibuja el mundo (frame.ts): sobre sus biomas o sobre el mapa real. Todo lo de arriba
   * está en coordenadas del mundo; el marco las pasa a las del mapa.
   */
  frame: Frame;
  /** La intensidad visual elegida en los ajustes, o null sin elegir (lib/shift.ts). */
  motion: MotionLevel | null;
}

const BIOMES_SOURCE = "biomas";
const PLACES_SOURCE = "lugares";
const NIGHT_LAYER = "noche";

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

/**
 * Límite del mapa: el mundo (`bounds`, en coordenadas del mundo) agrandado a la proporción actual del
 * contenedor, pasado al mapa y recortado a lo que MapLibre acepta (`clampToMap`). Se agranda antes
 * de convertir porque `expandToAspect` cuenta la proporción en grados, que solo vale cerca del
 * ecuador, como el mundo inventado: lejos del ecuador, Mercator estira la latitud. El marco real es
 * lineal en Mercator (frame.ts), así que en grados del mundo la proporción es la de la pantalla.
 * Después se recorta porque el marco real agranda: en una pantalla muy angosta o muy ancha, el
 * límite pasaría los 85° de latitud o los 179° de longitud (E-13).
 */
function worldLimit(
  frame: Frame,
  bounds: Bounds,
  container: HTMLElement,
): Bounds {
  return clampToMap(
    mapBounds(
      frame,
      expandToAspect(bounds, container.clientWidth / container.clientHeight),
    ),
  );
}

/**
 * El estilo del mundo generado: el mar de afuera, los biomas, la noche y los nombres, todo propio y
 * sin teselas.
 */
function worldStyle(
  {
    biomes,
    places,
    spawns,
  }: {
    biomes: BiomeCollection;
    places: readonly Place[];
    spawns: readonly Spawn[];
  },
  night: BackgroundLayerSpecification,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      [BIOMES_SOURCE]: { type: "geojson", data: biomes },
      [PLACES_SOURCE]: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: places.map(({ name, kind, position }) => ({
            type: "Feature",
            properties: { name, kind, anchor: labelAnchor(position, spawns) },
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
      ...biomeLayers(biomes),
      // La noche: el color del HUD sobre los biomas, debajo de la niebla (que se suma antes de los
      // nombres) y de los nombres. De día, transparente.
      night,
      ...placeLayers(),
    ],
  };
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
  onCoverage,
  onIdentify,
  active,
  shiny,
  weather,
  boosts,
  night,
  frame: initialFrame,
  motion,
}: MapViewProps) {
  // El marco con el que se creó el mapa. No cambia mientras la página vive, porque cambiar de zona
  // recarga (zone-link.tsx); en el estado y no en la prop, para no contar con la identidad del
  // useMemo que lo arma.
  const [frame] = useState(initialFrame);
  const containerRef = useRef<HTMLDivElement>(null);
  // Props con las que se crea el mapa. El mundo se genera al compilar y no cambia: el mapa se crea
  // una sola vez, con ellas.
  const initialRef = useRef({ biomes, bounds, places, spawns, motion });
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
    onIdentify,
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
      install(frame.fromMap(lngLat.toArray()));
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
    // La mira se guarda en coordenadas del mundo y el Marker recibe su conversión: en el modo real,
    // ida y vuelta por el marco no da exacto, y una mira frenada en el borde volvía un pelo afuera
    // del mundo, donde la antena no se instala.
    let aimed: Position = frame.fromMap(loadedMap.getCenter().toArray());
    const marker = new Marker({ element: aim })
      .setLngLat(frame.toMap(aimed))
      .addTo(loadedMap);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        install(aimed);
        return;
      }
      const direction = AIM_DIRECTIONS[event.key];
      if (!direction) return;
      // La flecha es para la mira: MapLibre escucha en el contenedor, y no le llega.
      event.preventDefault();
      event.stopPropagation();
      const step = Math.min(canvas.clientWidth, canvas.clientHeight) * AIM_STEP;
      const point = loadedMap.project(marker.getLngLat());
      const [lng, lat] = frame.fromMap(
        loadedMap
          .unproject([
            point.x + direction[0] * step,
            point.y + direction[1] * step,
          ])
          .toArray(),
      );
      // La mira no sale del mundo: afuera no hay nada que despejar.
      const [[west, south], [east, north]] = bounds;
      aimed = [
        Math.min(Math.max(lng, west), east),
        Math.min(Math.max(lat, south), north),
      ];
      const lngLat = frame.toMap(aimed);
      marker.setLngLat(lngLat);
      // Con el mapa acercado, si la mira sale de la vista, el mapa la sigue.
      if (!loadedMap.getBounds().contains(lngLat)) {
        if (reducedMotion()) loadedMap.jumpTo({ center: lngLat });
        else loadedMap.easeTo({ center: lngLat, essential: true });
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
  }, [loadedMap, installing, bounds, frame]);

  // De noche, la capa de la noche sube su opacidad. La primera vez, sin fundido: si el turno empieza
  // de noche, el mapa ya aparece oscuro. Después, en 1,5 s, salvo con movimiento reducido.
  const nightApplied = useRef(false);
  useEffect(() => {
    if (!loadedMap) return;
    const fade = nightApplied.current && !reducedMotion();
    loadedMap.setPaintProperty(NIGHT_LAYER, "background-opacity-transition", {
      duration: fade ? 1500 : 0,
      delay: 0,
    });
    loadedMap.setPaintProperty(
      NIGHT_LAYER,
      "background-opacity",
      night ? cssNumber("--night-opacity") : 0,
    );
    nightApplied.current = true;
  }, [loadedMap, night]);

  // La URL dice qué señal tiene la ficha abierta (`?p=25`): copiada de la barra de direcciones,
  // abre la sala con esa señal identificada. Al cerrar la ficha, se saca. replaceState y no
  // pushState: abrir y cerrar fichas no llena el historial del botón Atrás. Next integra los dos al
  // router (docs de Next, "Linking and Navigating", "Native History API"). Hasta que se abre la
  // primera ficha, la URL queda como llegó: con `?p=25`, el mapa se monta antes de abrir esa ficha,
  // y sacarlo ahí perdía el enlace si se recargaba en ese momento.
  const openId = dossierOpen ? (selection?.spawn.speciesId ?? null) : null;
  const dossierShown = useRef(false);
  useEffect(() => {
    if (openId !== null) dossierShown.current = true;
    if (!dossierShown.current) return;
    const params = new URLSearchParams(window.location.search);
    if (openId === null) params.delete("p");
    else params.set("p", String(openId));
    const search = params.toString();
    const next = search ? `?${search}` : window.location.pathname;
    if (`?${search}` === window.location.search) return;
    if (!search && !window.location.search) return;
    window.history.replaceState(null, "", next);
  }, [openId]);

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
    // El mundo en coordenadas del mapa: para encuadrarlo y para el límite.
    const world = mapBounds(frame, initial.bounds);
    const nightLayer: BackgroundLayerSpecification = {
      id: NIGHT_LAYER,
      type: "background",
      paint: {
        "background-color": cssToken("--hud-bg"),
        "background-opacity": 0,
      },
    };

    const map = new MapLibreMap({
      container,
      // La inercia del arrastre, las flechas, el +/− y el doble clic son animaciones de MapLibre,
      // con su propia preferencia: sin opción, mira `prefers-reduced-motion` en cada animación; con
      // `reduceMotion`, queda fija al crear el mapa. Por eso va solo con una intensidad elegida: sin
      // elegir, MapLibre sigue al sistema, como el resto de la sala, también si cambia con la página
      // abierta. Elegida, MapLibre toma un cambio al recargar, también el del inicio de turno,
      // porque el mapa ya se creó detrás.
      ...(initial.motion !== null && {
        reduceMotion: initial.motion === "reducida",
      }),
      // El modo real carga el estilo de OpenFreeMap y le pone los colores del HUD antes de usarlo.
      ...(frame.mode === "real"
        ? {
            style: REAL_STYLE_URL,
            transformStyle: (_previous, next) =>
              hudStyle(next, nightLayer, world),
          }
        : { style: worldStyle(initial, nightLayer) }),
      // Sin fundido de los nombres al aparecer o al chocar, con movimiento reducido. Se lee al crear
      // el mapa: MapLibre no lo deja cambiar después.
      fadeDuration: reducedMotion() ? 0 : 300,
      bounds: world,
      // Si el límite fuera el mundo tal cual, en una pantalla angosta MapLibre acercaría el mapa
      // para no mostrar nada afuera, y la isla quedaría cortada a los costados.
      maxBounds: worldLimit(frame, initial.bounds, container),
      maxZoom: MAX_ZOOM + frame.zoomOffset,
      // El canvas de MapLibre ya es una región con nombre (role="region", y tabindex="0" para
      // moverlo con las flechas). `locale` traduce ese nombre, que por defecto es "Map".
      locale: {
        "Map.Title":
          frame.mode === "real" ? "Mapa de Argentina" : "Mapa del mundo",
      },
      // Sin el control de atribución de MapLibre: abajo a la derecha, a 390 px queda debajo del
      // panel de las antenas. La del mapa real va en ese panel (monitoring-room.tsx).
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
      map.setMaxBounds(worldLimit(frame, initial.bounds, container));
      map.fitBounds(world, { animate: false, absolutePadding: true });
      const focus = focusRef.current;
      if (focus) {
        focusSignal(map, world, frame.toMap(focus), {
          animate: false,
          keepZoom: zoom,
        });
      }
    };
    map.on("resize", onResize);
    // El punto de las ciudades del mapa real (real-style.ts). Un resolver y no el evento
    // `styleimagemissing`: MapLibre espera al resolver antes de dar la imagen por perdida.
    map.setMissingStyleImageResolver((id) => {
      if (id === MISSING_CITY_DOT && !map.hasImage(id))
        map.addImage(id, cityDot());
    });
    // Antes de `load`, un error deja el mapa sin dibujar: por ejemplo, si no baja el worker (como
    // en E-07), o en el modo real, si no baja el estilo (sin estilo no hay `load`). Una tesela del
    // mapa real que falla, no: el error trae su `tile`, y el radar, la niebla y las señales no
    // dependen de ella. Después de `load` se deja de escuchar, y MapLibre los muestra en la consola.
    const onError = (event: MapErrorEvent) => {
      if (frame.mode === "real" && "tile" in event) return;
      setFailure(new Error(event.error.message));
    };
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
    // `frame` sale del estado y no cambia nunca: el mapa se sigue creando una sola vez.
  }, [frame]);

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
            frame={frame}
            grid={grid}
            stations={
              active
                ? [{ id: 0, kind: "base", position: radarBase }, ...antennas]
                : []
            }
            spawns={spawns}
            detected={detected}
            onDetect={onDetect}
            onSweepEnd={onSweepEnd}
            onCoverage={onCoverage}
            onFogDrawn={() => setFogDrawn(true)}
          />
          <SignalMarkers
            map={loadedMap}
            frame={frame}
            spawns={spawns}
            detected={detected}
            selectedId={
              dossierOpen ? (selection?.spawn.speciesId ?? null) : null
            }
            identified={identified}
            shiny={shiny}
            boosts={boosts}
            onSelect={(next) => {
              setSelection(next);
              setDossierOpen(true);
              focusRef.current = next.spawn.position;
              focusSignal(
                loadedMap,
                mapBounds(frame, bounds),
                frame.toMap(next.spawn.position),
              );
            }}
          />
        </>
      )}
      {!fogDrawn && <SystemBoot step={loadedMap ? "coverage" : "connecting"} />}
      {/* Montado siempre, aunque no haya señal: Base UI anima la entrada solo cuando el panel ya
          existía cerrado y pasa a abierto (useTransitionStatus, animateInitialOpen). */}
      <DossierPanel
        open={dossierOpen}
        speciesId={selection?.spawn.speciesId ?? null}
        identification={identification}
        place={selection?.place ?? null}
        shiny={selection ? shiny.has(selection.spawn.speciesId) : false}
        weather={weather}
        night={night}
        boosts={boosts}
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
