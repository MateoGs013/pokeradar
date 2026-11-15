"use client";

// La sala de monitoreo: el inicio de turno, el HUD (desde lg, una hoja de carta), el control de las
// antenas, los avisos de la tripulación y el mapa. Guarda qué señales detectó el radar, porque las
// usan todos: el mapa muestra solo esas, el HUD las cuenta y Pelipper dice dónde aparecieron. Y
// guarda las antenas: el control las instala y el mapa las dibuja. También lleva la bitácora del
// turno, el fin de turno y la señal de un enlace compartido.
import { BellIcon, BellOffIcon, Settings2Icon } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  closeNotices,
  CrewNotices,
  notify,
} from "@/components/crew/crew-notices";
import { TYPE_LABELS } from "@/components/dossier/labels";
import { modeSearch, realFrame, worldFrame } from "@/components/map/frame";
import { MapLoader } from "@/components/map/map-loader";
import type { MapViewProps } from "@/components/map/map-view";
import { northToSouth, signalPlaces } from "@/components/map/places";
import { ShiftStart } from "@/components/onboarding/shift-start";
import { MAX_ANTENNAS } from "@/components/radar/network";
import type { Station } from "@/components/radar/radar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  saveShiftSettings,
  useShiftSettings,
} from "@/hooks/use-shift-settings";
import { useCountUp } from "@/hooks/use-count-up";
import { useNight } from "@/hooks/use-night";
import { useSearchParam } from "@/hooks/use-search-param";
import { useWeather } from "@/hooks/use-weather";
import type { Boost } from "@/lib/boosts";
import {
  ARGENTINA_BOUNDS,
  ARGENTINA_GRID,
  ARGENTINA_RADAR_BASE,
} from "@/lib/geo/argentina";
import {
  downloadCsv,
  type LogEntry,
  reportFileName,
  toCsv,
} from "@/lib/report";
import { REDUCED_MOTION_QUERY, systemMotion } from "@/lib/motion";
import { NIGHT_BOOST } from "@/lib/night";
import { playCry, playPing } from "@/lib/sound/sounds";
import { isShiny } from "@/lib/shiny";
import { threatLevel } from "@/lib/threat";
import {
  CONDITIONS,
  type Weather,
  weatherBoost,
} from "@/lib/weather/conditions";
import type { Position } from "@/lib/world/types";

import { Clock } from "./clock";
import { CoverageScale } from "./coverage-scale";
import { ShiftEnd, type ShiftSummary } from "./shift-end";
import { FIELD_LABEL, ShiftForm } from "./shift-form";
import { ShiftLog } from "./shift-log";
import { TEXT_LINK, ZoneLink } from "./zone-link";

const percent = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 0,
});

const typeList = new Intl.ListFormat("es", { type: "conjunction" });

/** "lluvia 13 °C". */
function describeWeather({ condition, temperature }: Weather) {
  return `${CONDITIONS[condition].label.toLowerCase()} ${Math.round(temperature)} °C`;
}

/** Noctowl, cuando cae la noche. */
function announceNight() {
  const types = NIGHT_BOOST.types.map((type) => TYPE_LABELS[type]);
  notify({
    id: "noctowl",
    member: "noctowl",
    priority: "informativo",
    text: `Cae la noche: Noctowl toma la guardia. Se potencian los tipos ${typeList.format(types)}.`,
  });
}

// Los atajos, como los lista el diálogo de ajustes (la tecla ? lo abre).
const SHORTCUTS: [string, string][] = [
  ["A", "Instalar una antena, o cancelar"],
  ["Flechas", "Mover la mira de la antena"],
  ["Enter", "Instalar la antena en la mira"],
  ["B", "Abrir la bitácora"],
  ["M", "Silenciar los avisos y el sonido"],
  ["?", "Estos ajustes y los atajos"],
  ["Esc", "Cerrar la ficha o el panel abierto"],
];

function Shortcuts() {
  return (
    <section className="grid gap-2">
      <h3 className={FIELD_LABEL}>Atajos de teclado</h3>
      <p className="text-xs text-muted-foreground">
        Con el foco en el mapa o en el panel de las antenas.
      </p>
      {/* Una tabla con filetes: cada tecla, dibujada como una tecla, y lo que hace. */}
      <dl className="grid grid-cols-[auto_1fr] border-t border-border text-[0.8125rem]">
        {SHORTCUTS.map(([keys, action]) => (
          <div
            key={keys}
            className="col-span-2 grid grid-cols-subgrid items-center gap-x-3 border-b border-border py-1"
          >
            <dt>
              <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-b-2 border-foreground/50 bg-background px-1.5 font-mono text-[0.6875rem]">
                {keys}
              </kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Un número de especie en la URL: solo dígitos, sin ceros adelante y con cinco como mucho. */
const SPECIES_ID = /^[1-9]\d{0,4}$/;

/**
 * La señal de un enlace compartido (`?p=25`, docs/concepto.md, "Compartir un avistamiento"), si
 * existe en este mundo. `invalid` es lo pedido cuando no hay ninguna señal con eso. `Number` solo
 * no alcanza: también acepta "", "0x4" y "4.0".
 */
function useSharedSignal(spawns: MapViewProps["spawns"]) {
  const raw = useSearchParam("p");
  if (raw === null) return { shared: null, invalid: null };
  const id = SPECIES_ID.test(raw) ? Number(raw) : null;
  return spawns.some((spawn) => spawn.speciesId === id)
    ? { shared: id, invalid: null }
    : { shared: null, invalid: raw };
}

/**
 * La especie que `?shiny=<id>` fuerza variocolor, para mostrarla en una demo: con la semilla 151
 * ninguna lo es.
 */
function useForcedShiny() {
  const id = Number(useSearchParam("shiny"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Una nota del margen de la hoja: chica, espaciada y solo desde lg, donde la hoja tiene márgenes. */
const MARGIN_NOTE =
  "pointer-events-none absolute hidden font-mono text-[0.625rem] tracking-[0.25em] whitespace-nowrap text-muted-foreground uppercase lg:block";

/**
 * Las marcas del mapa, con las clases que dibujan cada una como en el mapa. Las de la carta
 * (`chart`) solo existen en el mundo generado: el mapa real no tiene carta.
 */
const MARKS: [label: string, mark: string, chart?: boolean][] = [
  ["Señal detectada", "size-2.5 rounded-full bg-glow ring-2 ring-foreground"],
  ["Radar y alcance", "size-3.5 rounded-full border border-hud/70"],
  ["Antena", "size-2 rotate-45 bg-glow outline outline-foreground"],
  ["Costa", "h-0.5 w-6 bg-hud/80", true],
  ["Curva de nivel", "h-px w-6 bg-hud/50", true],
  ["Isobata", "w-6 border-t border-dashed border-hud/60", true],
];

/** Los hábitats de PokéAPI, con el color de su bioma (los tokens --bioma-* de globals.css). */
const HABITAT_KEY: [label: string, swatch: string][] = [
  ["Mar", "bg-(--bioma-sea)"],
  ["Orilla", "bg-(--bioma-waters-edge)"],
  ["Llanura", "bg-(--bioma-grassland)"],
  ["Zona árida", "bg-(--bioma-rough-terrain)"],
  ["Bosque", "bg-(--bioma-forest)"],
  ["Ciudad", "bg-(--bioma-urban)"],
  ["Montaña", "bg-(--bioma-mountain)"],
  ["Cuevas", "bg-(--bioma-cave)"],
  ["Volcán", "bg-(--bioma-rare)"],
];

/**
 * Una lectura del HUD. En el HTML el nombre va antes que el valor, como en cualquier <dl>. Hasta lg
 * `flex-col-reverse` lo dibuja debajo del número, y una raya separa cada lectura de la anterior.
 * Desde lg el nombre va arriba, como el rótulo de una casilla: así el número, que con la tipografía
 * de afiche baja más que su renglón, no lo pisa (pasaba con "11/40" sobre "señales"). `hero` es la
 * cobertura: va en el color del HUD y, desde lg, ocupa su propio renglón con la cifra más grande de
 * la hoja y la escala debajo (`scale`); las otras dos comparten el renglón siguiente, cada una con
 * un filete arriba. Sin probar con un lector de pantalla.
 */
function Reading({
  label,
  hero = false,
  scale,
  children,
}: {
  label: string;
  hero?: boolean;
  scale?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col-reverse lg:flex-col ${hero ? "lg:col-span-2 lg:gap-1.5" : "max-lg:border-l max-lg:border-border max-lg:pl-3 lg:gap-1 lg:border-t lg:border-foreground/30 lg:pt-2"}`}
    >
      <dt className="text-[0.6875rem] leading-3 tracking-wider uppercase">
        {label}
      </dt>
      <dd
        className={`font-poster text-[1.625rem] leading-6 font-black md:text-[1.875rem] md:leading-7 ${hero ? "text-hud lg:text-[6rem] lg:leading-[0.8] [@media(max-height:719px)]:lg:text-[3.5rem]" : "text-foreground lg:text-[2rem] lg:leading-7"}`}
      >
        <span className="block">{children}</span>
        {scale}
      </dd>
    </div>
  );
}

interface MonitoringRoomProps extends Omit<
  MapViewProps,
  | "antennas"
  | "installing"
  | "onToggleInstall"
  | "onInstall"
  | "detected"
  | "onDetect"
  | "onSweepEnd"
  | "onCoverage"
  | "onIdentify"
  | "active"
  | "shiny"
  | "weather"
  | "boosts"
  | "night"
  | "frame"
  | "motion"
  | "hud"
  | "worldName"
> {
  seed: number;
  /** Huella del mundo: si coincide entre local y producción, el mundo es el mismo. */
  hash: string;
  /** Las señales del mapa real, en Argentina (argentina-spawns.ts). */
  realSpawns: MapViewProps["spawns"];
}

export function MonitoringRoom({
  seed,
  hash,
  realSpawns,
  ...mapProps
}: MonitoringRoomProps) {
  // Dónde se dibuja el mundo (docs/concepto.md, "El mapa híbrido"): `?modo=real` lo lleva al mapa
  // real de Argentina, con sus señales, su niebla y el radar base en Viedma (argentina.ts). La URL
  // se lee en el cliente: en el servidor es el mundo, y el mapa se monta recién en el cliente, ya
  // con el modo de la URL.
  const realMode = useSearchParam("modo") === "real";
  const { places } = mapProps;
  const spawns = realMode ? realSpawns : mapProps.spawns;
  const bounds = realMode ? ARGENTINA_BOUNDS : mapProps.bounds;
  const grid = realMode ? ARGENTINA_GRID : mapProps.grid;
  const radarBase = realMode ? ARGENTINA_RADAR_BASE : mapProps.radarBase;
  const frame = useMemo(
    () => (realMode ? realFrame() : worldFrame(places)),
    [realMode, places],
  );
  const [detected, setDetected] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [announcement, setAnnouncement] = useState("");
  // Con los avisos silenciados, las detecciones van solo al lector de pantalla y el resto de la
  // tripulación calla; Xatu y Noctowl, si no habían hablado, hablan al reactivarlos.
  const [muted, setMuted] = useState(false);
  // Cuántas señales lleva contadas el aviso de Pelipper que sigue abierto.
  const sightings = useRef(0);
  // Las señales variocolor: las que da la semilla, y la que fuerza la URL.
  const forcedShiny = useForcedShiny();
  const shiny: ReadonlySet<number> = new Set(
    spawns
      .map(({ speciesId }) => speciesId)
      .filter((id) => id === forcedShiny || isShiny(seed, id)),
  );
  const weather = useWeather();
  const night = useNight();
  // Lo que potencia tipos ahora: el clima, si llegó (de noche, el despejado no), y la noche.
  const boosts: Boost[] = [];
  const sky =
    weather.status === "ready"
      ? weatherBoost(weather.weather, night === true)
      : null;
  if (sky) boosts.push(sky);
  if (night) boosts.push(NIGHT_BOOST);
  // Qué parte del mundo despejó el radar (de 0 a 1), y qué especies se identificaron.
  const [coverage, setCoverage] = useState(0);
  // La cobertura que muestra el HUD: llega a la real contando (use-count-up.ts).
  const shownCoverage = useCountUp(coverage);
  const [identified, setIdentified] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  // El turno empieza cuando hay ajustes guardados: la primera vez, al pasar el inicio de turno.
  const { settings, saved, hydrated } = useShiftSettings();
  // Un enlace compartido saltea el inicio de turno: abre la sala con la señal identificada, con los
  // ajustes de por defecto si no hay guardados.
  const { shared, invalid } = useSharedSignal(spawns);
  const started = hydrated && (saved || shared !== null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // El sonido suena si se prendió en los ajustes y los avisos no están silenciados: el botón de la
  // campana silencia la sala entera.
  const sound = settings.sound && !muted;
  // La bitácora: lo identificado en este turno, en el orden en que llegó cada ficha.
  const [log, setLog] = useState<readonly LogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  // La señal que se pidió ver desde la bitácora: se abre cuando la bitácora terminó de cerrarse,
  // para que el foco no vuelva al botón de la bitácora después de entrar en la ficha.
  const pendingShow = useRef<number | null>(null);
  // Cuándo empezó el turno, para la duración del resumen.
  const startedAt = useRef<number | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [antennas, setAntennas] = useState<readonly Station[]>([]);
  // Si se está eligiendo dónde va la próxima antena.
  const [installing, setInstalling] = useState(false);
  // Lo último que pasó con el radar, a la vista: el resultado de una vuelta (la del radar base dice
  // también cómo seguir), la antena instalada o un punto inválido.
  const [radarStatus, setRadarStatus] = useState("");
  // La etiqueta de cada señal, la misma de su botón. Las señales se ubican al compilar y no
  // cambian: cambia solo con el marco.
  const labels = useMemo(
    () =>
      new Map(
        signalPlaces(northToSouth(spawns), frame.describe).map(
          ({ spawn, label }) => [spawn.speciesId, label],
        ),
      ),
    [spawns, frame],
  );

  // Un aviso para el lector de pantalla. Si es igual al anterior, el texto de la región viva no
  // cambiaría y no se volvería a anunciar: se alterna un espacio duro al final, que no se lee.
  const announce = (text: string) =>
    setAnnouncement((previous) => (previous === text ? `${text}\u00a0` : text));

  // Abrir una señal desde un aviso es lo mismo que tocarla en el mapa: se abre la ficha, la cámara
  // vuela hasta ella y, al cerrar, el foco vuelve a su botón.
  const openSignal = (speciesId: number) =>
    document
      .querySelector<HTMLButtonElement>(`[data-species-id="${speciesId}"]`)
      ?.click();

  // Pelipper avisa los avistamientos. Mientras su aviso sigue abierto, el mismo aviso suma las
  // nuevas en lugar de apilar uno por señal (la base detecta 5 en unos 4 s), y su botón abre la
  // última. Silenciado, cada detección va al lector de pantalla, como antes de la tripulación.
  const onDetect = (ids: number[]) => {
    setDetected((previous) => new Set([...previous, ...ids]));
    const last = ids.at(-1);
    if (last === undefined) return;
    if (sound) playPing();
    if (muted) {
      announce(
        ids.length === 1
          ? `Señal detectada en ${labels.get(last)}`
          : `${ids.length} señales detectadas`,
      );
      return;
    }
    sightings.current += ids.length;
    notify({
      id: "pelipper",
      member: "pelipper",
      priority: "informativo",
      text:
        sightings.current === 1
          ? `Señal detectada en ${labels.get(last)}.`
          : `${sightings.current} señales detectadas. La última, en ${labels.get(last)}.`,
      action: { label: "Ver señal", onClick: () => openSignal(last) },
      onClose: () => {
        sightings.current = 0;
      },
    });
  };

  // Rotom da la cobertura al terminar cada vuelta, en un solo aviso que se actualiza.
  const onCoverage = (next: number) => {
    setCoverage(next);
    if (muted) return;
    notify({
      id: "rotom",
      member: "rotom",
      priority: "informativo",
      text: `Vuelta completa. Cobertura del mundo: ${percent.format(next)}.`,
    });
  };

  // Porygon termina el análisis cuando llega la ficha. Una amenaza alta o crítica es una alerta, y
  // una señal variocolor, un aviso crítico: Base UI lo anuncia como alerta al lector de pantalla.
  // Con la ficha abierta, el aviso queda detrás de su fondo y no se puede tocar; la región de los
  // avisos no queda inerte ni oculta, así que igual se anuncia (medido el DOM; sin probar con un
  // lector de pantalla).
  const onIdentify: MapViewProps["onIdentify"] = (speciesId, detail) => {
    setIdentified((previous) => new Set(previous).add(speciesId));
    const threat = threatLevel(
      detail.stats.reduce((total, stat) => total + stat.value, 0),
    );
    const entry: LogEntry = {
      speciesId,
      name: detail.name,
      time: Date.now(),
      place: labels.get(speciesId) ?? "",
      threat,
      shiny: shiny.has(speciesId),
    };
    setLog((previous) => [...previous, entry]);
    if (sound && detail.cry) playCry(detail.cry);
    if (muted) return;
    if (shiny.has(speciesId)) {
      notify({
        member: "porygon",
        priority: "critico",
        text: `Anomalía: ${detail.name} variocolor. Nivel de amenaza: ${threat}.`,
      });
      return;
    }
    notify({
      member: "porygon",
      priority:
        threat === "Alto" || threat === "Crítico" ? "alerta" : "informativo",
      text: `Análisis completado: ${detail.name}. Nivel de amenaza: ${threat}.`,
    });
  };

  // Xatu da el pronóstico una vez, cuando el turno empezó y el clima ya llegó; con los avisos
  // silenciados, espera a que se reactiven. Si Open-Meteo falla, no dice nada: el HUD muestra que
  // no hay datos.
  const forecastGiven = useRef(false);
  const forecast = useEffectEvent((current: Weather) => {
    const boost = weatherBoost(current, night === true);
    const types = boost?.types.map((type) => TYPE_LABELS[type]);
    notify({
      id: "xatu",
      member: "xatu",
      priority: "informativo",
      text: types
        ? `Pronóstico: ${describeWeather(current)}. Potencia a los tipos ${typeList.format(types)}.`
        : `Pronóstico: ${describeWeather(current)}. De noche, sin sol, no potencia ningún tipo.`,
    });
  });
  useEffect(() => {
    if (!started || muted || weather.status !== "ready") return;
    if (forecastGiven.current) return;
    forecastGiven.current = true;
    forecast(weather.weather);
  }, [started, muted, weather]);

  // Noctowl toma la guardia cuando cae la noche, también si el turno empieza de noche. Una vez por
  // noche: si amanece y vuelve a anochecer con la página abierta, avisa de nuevo. Con los avisos
  // silenciados, avisa al reactivarlos si sigue siendo de noche.
  const nightAnnounced = useRef(false);
  useEffect(() => {
    if (!night) nightAnnounced.current = false;
    if (!started || muted || !night || nightAnnounced.current) return;
    nightAnnounced.current = true;
    announceNight();
  }, [started, muted, night]);

  useEffect(() => {
    if (started && startedAt.current === null) startedAt.current = Date.now();
  }, [started]);

  // La señal compartida aparece detectada (se ajusta durante el render, como en
  // use-pokemon-detail.ts) y, cuando su botón existe, se abre su ficha como si se la tocara.
  const [sharedDetected, setSharedDetected] = useState(false);
  if (shared !== null && !sharedDetected) {
    setSharedDetected(true);
    setDetected((previous) => new Set(previous).add(shared));
  }
  const sharedOpened = useRef(false);
  useEffect(() => {
    if (!started || shared === null || sharedOpened.current) return;
    const open = () => {
      const button = document.querySelector<HTMLButtonElement>(
        `[data-species-id="${shared}"]`,
      );
      if (!button) return false;
      sharedOpened.current = true;
      button.click();
      return true;
    };
    if (open()) return;
    // El botón aparece cuando el mapa cargó: se espera a que esté en la página.
    const observer = new MutationObserver(() => {
      if (open()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [started, shared]);

  // Un enlace con una señal que no existe: Rotom lo dice, una vez, y la sala sigue. Repite el número
  // pedido; cualquier otra cosa no la repite.
  const invalidAnnounced = useRef(false);
  const announceInvalid = useEffectEvent((raw: string) =>
    notify({
      member: "rotom",
      priority: "alerta",
      text: SPECIES_ID.test(raw)
        ? `El enlace pide la señal #${raw}, pero no hay ninguna con ese número en este mundo.`
        : "El enlace pide una señal que no existe en este mundo.",
    }),
  );
  useEffect(() => {
    if (!started || invalid === null || invalidAnnounced.current) return;
    invalidAnnounced.current = true;
    announceInvalid(invalid);
  }, [started, invalid]);

  const downloadReport = () =>
    downloadCsv(toCsv(log), reportFileName(settings.operator, new Date()));

  // El resumen se arma al pedirlo, con la hora de ese momento.
  const endShift = () => {
    const now = Date.now();
    setSummary({
      operator: settings.operator,
      startedAt: startedAt.current ?? now,
      endedAt: now,
      coverage,
      detected: detected.size,
      total: spawns.length,
      antennas: antennas.length,
      entries: log,
    });
    setLogOpen(false);
    setEndOpen(true);
  };

  // La campana y la M: con la M el foco queda en el mapa, así que el cambio se anuncia.
  const toggleMuted = () => {
    if (!muted) closeNotices();
    setMuted(!muted);
    announce(
      muted ? "Avisos y sonido activados" : "Avisos y sonido silenciados",
    );
  };

  // Lo que dice una estación al terminar su vuelta. Si no detectó nada, el estado vacío, también al
  // lector de pantalla. Si detectó, ya se anunció cada señal, y la antena deja a la vista solo el
  // total. El radar base suma qué sigue (después de su vuelta quedan casi todas las señales
  // ocultas, y nada decía que las antenas despejan el resto), y esa línea va entera también a la
  // región viva: ningún aviso la dijo. Con el modo de instalación abierto, la línea es de la ayuda
  // (toggleInstall la vacía al entrar): la vuelta que termina no la pisa, y solo se anuncia si no
  // detectó nada.
  const onSweepEnd = ({ id, kind }: Station, found: number) => {
    const name = kind === "base" ? "Radar base" : `Antena ${id}`;
    if (found === 0) {
      const empty = `${name}: ninguna señal en alcance`;
      if (!installing) setRadarStatus(empty);
      announce(empty);
      return;
    }
    if (installing) return;
    const total = `${name}: ${found} ${found === 1 ? "señal detectada" : "señales detectadas"}`;
    if (kind !== "base") {
      setRadarStatus(total);
      return;
    }
    const next = `${total}. Instalá antenas para despejar el resto.`;
    setRadarStatus(next);
    announce(next);
  };

  // El punto elegido tiene que estar dentro del mundo: afuera no hay nada que despejar.
  const onInstall = ([lng, lat]: Position) => {
    const [[west, south], [east, north]] = bounds;
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

  // El color del HUD va en <html>: los tokens de globals.css cambian según data-hud, también los de
  // lo que se abre en un portal, como la ficha.
  useEffect(() => {
    document.documentElement.dataset.hud = settings.hud;
  }, [settings.hud]);

  // La intensidad visual va en <html> también (lib/motion.ts). Si no se eligió, sigue a la del
  // sistema, también si cambia con la página abierta.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.motion !== null) {
      root.dataset.motion = settings.motion;
      return;
    }
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const apply = () => {
      root.dataset.motion = systemMotion();
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.motion]);

  // Esc sale del modo de instalación sin instalar. Con la ficha o los ajustes del turno abiertos (un
  // clic en una señal abre la ficha también en el modo), ese Esc es del diálogo: lo cierra y el modo
  // sigue. Lo mismo con el foco en un aviso: Base UI lo cierra con ese Esc.
  useEffect(() => {
    if (!installing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        event.target instanceof Element &&
        event.target.closest('[data-slot="toast"]')
      ) {
        return;
      }
      // Los avisos también tienen role="dialog" (ui/toast.tsx): no cuentan.
      if (document.querySelector('[role="dialog"]:not([data-slot="toast"])')) {
        return;
      }
      setInstalling(false);
      announce("Instalación cancelada");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [installing]);

  // Los atajos de la sala (docs/concepto.md, "Teclado"): B abre la bitácora, M silencia y ? abre
  // los ajustes, que listan los atajos. La A, de las antenas, la atiende el mapa (map-view.tsx).
  // Como la A, valen solo con el foco en el mapa (también en una señal) o en el panel de abajo: un
  // atajo de una letra en toda la página también se dispararía al dictar con la voz (WCAG 2.1.4).
  const shortcut = useEffectEvent((key: string) => {
    if (key === "b") setLogOpen(true);
    else if (key === "m") toggleMuted();
    else if (key === "?") setSettingsOpen(true);
    else return false;
    return true;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest(".maplibregl-map, [data-antenna-control]")
      )
        return;
      if (shortcut(event.key.toLowerCase())) event.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const full = antennas.length >= MAX_ANTENNAS;

  // El HUD va antes que el mapa para que el encabezado sea lo primero que lee un lector de pantalla;
  // z-10 lo deja dibujado encima del mapa, que viene después.
  // Hasta lg, el mapa ocupa la pantalla y el HUD va encima, en cajas con fondo opaco y borde (sobre
  // el relieve pintado, un texto sin fondo no se lee): arriba el panel del turno, con sus tres
  // lecturas, y la hora y los ajustes; abajo, las antenas. En el celular el panel del turno ocupa
  // todo el ancho y la esquina de la hora va encima de su primera fila, sin caja propia; desde md
  // es una caja a la izquierda, que termina antes del lugar de la ficha.
  // Desde lg, la sala es una hoja de carta: el mapa es una lámina con marco, el panel del turno y
  // el de las antenas pasan a la columna de la izquierda, sin caja, con las referencias en el
  // medio, y la hora y los ajustes van en el margen de arriba. El orden del Tab sigue al del HTML:
  // la columna y después la hora y los ajustes.
  // El aviso existe desde el HTML del servidor, vacío: un lector de pantalla anuncia los cambios de
  // una región viva que ya estaba, no siempre los de una que aparece con el texto puesto.
  return (
    <>
      {/* La columna de la hoja. Hasta lg no existe como caja (`contents`): el panel del turno y el
          de las antenas se ubican solos, sobre el mapa. Desde lg es el margen izquierdo de la
          carta: arriba el título y las lecturas, en el medio las referencias y abajo las antenas.
          Al cargar, con la intensidad completa, sus tres partes entran una detrás de otra y la
          lámina se funde: la hoja se arma. En una pantalla de menos de 720 px de alto, el título y
          la cifra de la cobertura se achican y la columna gana 16 px arriba y abajo: así los
          botones de las antenas no quedan cortados (medido a 1280 × 600 y 1366 × 625). */}
      <div className="max-lg:contents lg:absolute lg:top-10 lg:bottom-10 lg:left-10 lg:z-10 lg:flex lg:w-72 lg:flex-col lg:justify-between lg:gap-6 [@media(max-height:719px)]:lg:top-6 [@media(max-height:719px)]:lg:bottom-6">
        <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-1.5 rounded-sm border border-foreground/40 bg-background px-2.5 py-2 font-mono text-xs text-muted-foreground font-stretch-condensed md:right-auto md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))] lg:static lg:flex lg:max-w-none lg:shrink-0 lg:flex-col lg:gap-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 motion-safe:lg:animate-in motion-safe:lg:duration-700 motion-safe:lg:fill-mode-both motion-safe:lg:fade-in motion-safe:lg:slide-in-from-bottom-3">
          {/* El número de la carta es la semilla del mundo: con otra semilla sería otra isla. */}
          <p className="hidden tracking-[0.08em] whitespace-nowrap uppercase lg:block">
            Carta de relevamiento n.º {seed}
          </p>
          {/* El título y el operador. En el celular la fila deja a la derecha el lugar de la
              esquina de la hora (32 unidades: 128 px), que va encima de este panel, y tiene su
              alto; el nombre se corta con puntos suspensivos si no entra. Desde lg el título es el
              de un afiche, en dos renglones. */}
          <div className="col-span-2 flex min-h-8 min-w-0 items-center gap-x-2 pr-32 md:min-h-0 md:pr-0 lg:mt-5 lg:block">
            <h1 className="font-poster text-xl leading-none font-black tracking-wide text-foreground uppercase lg:text-[5.75rem] lg:leading-[0.86] lg:tracking-normal [@media(max-height:719px)]:lg:text-[3.5rem]">
              <span className="lg:block">Poké</span>
              <span className="lg:block">Radar</span>
            </h1>
            <span aria-hidden className="lg:hidden">
              ·
            </span>
            <span className="truncate lg:mt-4 lg:block [@media(max-height:719px)]:lg:mt-2">
              {settings.operator}
            </span>
          </div>
          {/* Las tres lecturas del turno. La cobertura, que es lo que el operador hace crecer, va en
              el color del HUD y, desde lg, es la cifra grande de la hoja. */}
          <dl className="col-span-2 row-start-2 flex items-end gap-x-3 lg:order-last lg:mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4 lg:gap-y-4 [@media(max-height:719px)]:lg:mt-3 [@media(max-height:719px)]:lg:gap-y-2">
            <Reading
              label="cobertura"
              hero
              scale={<CoverageScale value={shownCoverage} />}
            >
              {percent.format(shownCoverage)}
            </Reading>
            {/* El total depende del modo (`?modo=real`), que se lee en el cliente: en el HTML
                estático todavía no se sabe, y va una raya, como el clima mientras carga. Medido con
                la red lenta, el modo real decía "de 40" durante 5,5 s antes de hidratar. */}
            <Reading label="señales">
              <span aria-hidden>
                {detected.size}/{hydrated ? spawns.length : "—"}
              </span>
              <span className="sr-only">
                {detected.size} de {hydrated ? spawns.length : "—"}
              </span>
            </Reading>
            <Reading
              label={identified.size === 1 ? "identificada" : "identificadas"}
            >
              {identified.size}
            </Reading>
          </dl>
          {/* El clima. Los datos de Open-Meteo van con un enlace a ellos al lado (CC BY 4.0,
              open-meteo.com/en/licence). El HUD no recibe el puntero: el enlace sí. */}
          <p className="col-span-2 row-start-3 whitespace-nowrap lg:mt-1">
            {weather.status === "ready" ? (
              <>
                {describeWeather(weather.weather)} (
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className={`pointer-events-auto ${TEXT_LINK}`}
                >
                  Open-Meteo
                </a>
                )
              </>
            ) : weather.status === "error" ? (
              "clima sin datos"
            ) : (
              "clima —"
            )}
          </p>
        </div>
        {/* Las referencias de la carta: qué es cada marca del mapa y de qué color es cada hábitat.
            Van desde lg y solo si entran enteras: las marcas, con 820 px de alto o más; los
            hábitats, con 890 o más (medido instalando una antena, en el mundo y en el mapa real, a
            819, 820, 889 y 890 px de alto: nada se pisa). En el modo real no hay hábitats. */}
        <section
          aria-labelledby="referencias"
          className="hidden font-mono text-[0.6875rem] text-muted-foreground font-stretch-condensed motion-safe:lg:animate-in motion-safe:lg:delay-150 motion-safe:lg:duration-700 motion-safe:lg:fill-mode-both motion-safe:lg:fade-in motion-safe:lg:slide-in-from-bottom-3 [@media(min-width:64rem)_and_(min-height:820px)]:block"
        >
          <h2
            id="referencias"
            className="mb-2.5 border-b border-border pb-1.5 tracking-[0.2em] text-foreground uppercase"
          >
            Referencias
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {MARKS.filter(
              ([, , chart]) => !chart || frame.mode === "mundo",
            ).map(([label, mark]) => (
              <li key={label} className="flex items-center gap-2">
                <span aria-hidden className="flex w-6 shrink-0 justify-center">
                  <span className={mark} />
                </span>
                {label}
              </li>
            ))}
          </ul>
          {frame.mode === "mundo" && (
            <ul className="mt-3 hidden grid-cols-3 gap-x-2 gap-y-1 [@media(min-height:890px)]:grid">
              {HABITAT_KEY.map(([label, swatch]) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`size-3 shrink-0 border border-foreground/30 ${swatch}`}
                  />
                  {label}
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* El control de las antenas, abajo a la izquierda. El botón alterna el modo de instalación
            (aria-pressed); con las cuatro instaladas queda deshabilitado, y el contador dice por qué.
            Arriba, a la vista, lo último que pasó (después de la vuelta del radar base, también
            que las antenas despejan el resto) y, en el modo, qué hacer: el panel está anclado
            abajo y crece hacia arriba, así que el botón no se mueve cuando esas líneas aparecen o se
            van. El fondo es opaco: con uno al 80 %, el pulso de una señal debajo bajaba
            el contraste del texto (medido). Con `data-antenna-control`, la tecla A (map-view.tsx) y
            los atajos de la sala (B, M y ?) valen también con el foco en este panel, también en el
            botón de la bitácora. */}
        <div
          data-antenna-control
          className="absolute right-3 bottom-3 left-3 z-10 flex flex-col items-start gap-2 rounded-sm border border-foreground/40 bg-background p-2.5 font-mono text-xs text-muted-foreground md:right-auto md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))] lg:static lg:max-w-none lg:shrink-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 motion-safe:lg:animate-in motion-safe:lg:delay-300 motion-safe:lg:duration-700 motion-safe:lg:fill-mode-both motion-safe:lg:fade-in motion-safe:lg:slide-in-from-bottom-3"
        >
          {radarStatus && <p>{radarStatus}</p>}
          {installing && (
            <p>
              Tocá el mapa donde va la antena. Con teclado: flechas y Enter.{" "}
              <span className="whitespace-nowrap">Esc cancela.</span>
            </p>
          )}
          {/* Los datos del mapa real piden atribución: el texto y los enlaces del TileJSON de
              OpenFreeMap (tiles.openfreemap.org/planet, campo "attribution"). Va arriba de los
              botones, como las líneas de estado: el servidor no conoce el modo y el párrafo aparece
              al hidratar; como el panel crece hacia arriba, debajo de los botones los hacía saltar. */}
          {frame.mode === "real" && (
            <p>
              Mapa:{" "}
              <a
                href="https://openfreemap.org"
                target="_blank"
                rel="noreferrer"
                className={TEXT_LINK}
              >
                OpenFreeMap
              </a>{" "}
              ·{" "}
              <a
                href="https://www.openmaptiles.org/"
                target="_blank"
                rel="noreferrer"
                className={`whitespace-nowrap ${TEXT_LINK}`}
              >
                © OpenMapTiles
              </a>{" "}
              · datos de{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className={`whitespace-nowrap ${TEXT_LINK}`}
              >
                © OpenStreetMap
              </a>
            </p>
          )}
          {/* Las antenas, contadas con su marca del mapa: un rombo lleno por cada una instalada y uno
              vacío por cada lugar libre. Debajo, la acción del turno (llena) y la bitácora. */}
          <div className="flex w-full flex-wrap items-center gap-2 lg:border-t lg:border-foreground/30 lg:pt-3">
            <p className="flex basis-full items-center gap-2.5 whitespace-nowrap">
              <span aria-hidden className="flex gap-2 pl-0.5">
                {Array.from({ length: MAX_ANTENNAS }, (_, index) => (
                  <span
                    key={index}
                    className={`size-2 rotate-45 border border-foreground ${index < antennas.length ? "bg-hud" : ""}`}
                  />
                ))}
              </span>
              <span>
                Antenas{" "}
                <span className="text-foreground">
                  {antennas.length} de {MAX_ANTENNAS}
                </span>
              </span>
            </p>
            <Button
              variant="solid"
              aria-pressed={installing}
              disabled={full}
              onClick={toggleInstall}
              className="flex-1 lg:px-2.5 lg:font-stretch-condensed"
            >
              Instalar antena
            </Button>
            <Button
              className="lg:px-2.5 lg:font-stretch-condensed"
              onClick={() => setLogOpen(true)}
            >
              Bitácora {log.length > 0 && `(${log.length})`}
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-sm border border-foreground/40 bg-background pl-2 font-mono text-xs text-muted-foreground font-stretch-condensed max-md:border-transparent max-md:bg-transparent lg:top-2 lg:right-12 lg:border-transparent lg:bg-transparent">
        <Clock />
        <Button
          variant="ghost"
          size="icon"
          className="pointer-coarse:size-9"
          aria-label="Silenciar avisos y sonido"
          aria-pressed={muted}
          onClick={toggleMuted}
        >
          {muted ? <BellOffIcon aria-hidden /> : <BellIcon aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="pointer-coarse:size-9"
          aria-label="Ajustes del turno"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2Icon aria-hidden />
        </Button>
      </div>
      <ShiftStart
        open={hydrated && !saved && shared === null}
        initial={settings}
        mode={frame.mode}
      />
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Ajustes del turno</DialogTitle>
          <DialogDescription>Se guardan en este navegador.</DialogDescription>
          <ShiftForm
            initial={settings}
            submitLabel="Guardar"
            onSubmit={(next) => {
              saveShiftSettings(next);
              setSettingsOpen(false);
            }}
          />
          <Shortcuts />
          <ZoneLink mode={frame.mode} />
          {/* La huella del mundo: si coincide entre local y producción, el mundo es el mismo. */}
          <p className="font-mono text-xs text-muted-foreground">
            Mundo: semilla {seed} · huella {hash}
          </p>
        </DialogContent>
      </Dialog>
      <ShiftLog
        open={logOpen}
        onOpenChange={setLogOpen}
        onOpenChangeComplete={(open) => {
          const id = pendingShow.current;
          pendingShow.current = null;
          if (!open && id !== null) openSignal(id);
        }}
        entries={log}
        onShow={(speciesId) => {
          pendingShow.current = speciesId;
          setLogOpen(false);
        }}
        onDownload={downloadReport}
        onEnd={endShift}
      />
      <ShiftEnd
        open={endOpen}
        onOpenChange={setEndOpen}
        summary={summary}
        onDownload={downloadReport}
        onRestart={() =>
          window.location.assign(
            window.location.pathname + modeSearch(frame.mode),
          )
        }
      />
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {/* Los márgenes de la hoja, desde lg: qué carta es (la semilla y la huella del mundo), cómo
          está dibujada y de dónde salen los datos. */}
      <p className={`top-4.5 left-88 ${MARGIN_NOTE}`}>
        Hoja 1 de 1 · semilla {seed} · huella {hash}
      </p>
      <p className={`bottom-4.5 left-88 ${MARGIN_NOTE}`}>
        Proyección de Mercator ·{" "}
        {frame.mode === "real" ? "mapa de OpenFreeMap" : "grilla cada 2°"}
      </p>
      {/* Esta va desde xl: más angosto, choca con la de la izquierda (visto a 1024). */}
      <p className={`right-12 bottom-4.5 max-xl:hidden! ${MARGIN_NOTE}`}>
        Datos: PokéAPI · clima: Open-Meteo
      </p>
      <p
        aria-hidden
        className={`top-1/2 right-4.5 -translate-y-1/2 [writing-mode:vertical-rl] ${MARGIN_NOTE}`}
      >
        Sala de monitoreo geoespacial
      </p>
      {/* La lámina: desde lg el mapa va enmarcado, con las marcas de corte de una hoja impresa en
          las esquinas; hasta lg ocupa la pantalla entera. La sombra de adentro oscurece apenas sus
          bordes, encima del mapa y sin recibir el puntero. */}
      <div className="absolute inset-0 lg:top-12 lg:right-12 lg:bottom-12 lg:left-88 lg:outline lg:outline-foreground/70 motion-safe:lg:animate-in motion-safe:lg:duration-1000 motion-safe:lg:fade-in">
        <div
          aria-hidden
          className="crop-marks pointer-events-none absolute -inset-4 hidden lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-1 bg-(image:--map-vignette)"
        />
        <MapLoader
          {...mapProps}
          spawns={spawns}
          bounds={bounds}
          grid={grid}
          radarBase={radarBase}
          antennas={antennas}
          installing={installing}
          onToggleInstall={toggleInstall}
          onInstall={onInstall}
          detected={detected}
          onDetect={onDetect}
          onSweepEnd={onSweepEnd}
          onCoverage={onCoverage}
          active={started}
          onIdentify={onIdentify}
          shiny={shiny}
          weather={weather}
          boosts={boosts}
          night={night ?? false}
          frame={frame}
          motion={settings.motion}
          hud={settings.hud}
          worldName={`Isla ${seed}`}
        />
      </div>
      <CrewNotices />
      {/* El grano del papel, encima de toda la sala: se multiplica con lo que tiene debajo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-(image:--paper-grain) mix-blend-multiply"
      />
    </>
  );
}
