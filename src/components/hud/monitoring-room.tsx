"use client";

// La sala de monitoreo: el inicio de turno, el HUD de las esquinas, el control de las antenas, los
// avisos de la tripulación y el mapa. Guarda qué señales detectó el radar, porque las usan todos: el
// mapa muestra solo esas, el HUD las cuenta y Pelipper dice dónde aparecieron. Y guarda las antenas:
// el control las instala y el mapa las dibuja.
import { BellIcon, BellOffIcon, Settings2Icon } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  closeNotices,
  CrewNotices,
  notify,
} from "@/components/crew/crew-notices";
import { TYPE_LABELS } from "@/components/dossier/labels";
import { threatLevel } from "@/components/dossier/threat";
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
import { useWeather } from "@/hooks/use-weather";
import { isShiny } from "@/lib/shiny";
import { CONDITIONS, type Weather } from "@/lib/weather/conditions";
import type { Position } from "@/lib/world/types";

import { Clock } from "./clock";
import { ShiftForm } from "./shift-form";

const percent = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 0,
});

const typeList = new Intl.ListFormat("es", { type: "conjunction" });

/** "lluvia 13 °C". */
function describeWeather({ condition, temperature }: Weather) {
  return `${CONDITIONS[condition].label.toLowerCase()} ${Math.round(temperature)} °C`;
}

// La URL no cambia mientras la sala está abierta: no hay a qué suscribirse.
const subscribeToNothing = () => () => {};

/**
 * La especie que `?shiny=<id>` fuerza variocolor, para mostrarla en una demo: con la semilla 151
 * ninguna lo es. En el servidor no hay URL; en el cliente se lee al hidratar.
 */
function useForcedShiny() {
  const search = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.search,
    () => "",
  );
  const id = Number(new URLSearchParams(search).get("shiny"));
  return Number.isInteger(id) && id > 0 ? id : null;
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
  // Con los avisos silenciados, lo que diría la tripulación va solo al lector de pantalla.
  const [muted, setMuted] = useState(false);
  // Cuántas señales lleva contadas el aviso de Pelipper que sigue abierto.
  const sightings = useRef(0);
  // Las señales variocolor: las que da la semilla, y la que fuerza la URL.
  const forcedShiny = useForcedShiny();
  const shiny: ReadonlySet<number> = new Set(
    mapProps.spawns
      .map(({ speciesId }) => speciesId)
      .filter((id) => id === forcedShiny || isShiny(seed, id)),
  );
  const weather = useWeather();
  // Qué parte del mundo despejó el radar (de 0 a 1), y qué especies se identificaron.
  const [coverage, setCoverage] = useState(0);
  const [identified, setIdentified] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  // El turno empieza cuando hay ajustes guardados: la primera vez, al pasar el inicio de turno.
  const { settings, saved, hydrated } = useShiftSettings();
  const started = hydrated && saved;
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    if (muted) return;
    const threat = threatLevel(
      detail.stats.reduce((total, stat) => total + stat.value, 0),
    );
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

  // Xatu da el pronóstico una vez, cuando el turno empezó y el clima ya llegó. Si Open-Meteo falla,
  // no dice nada: el HUD muestra que no hay datos.
  const forecastGiven = useRef(false);
  const forecast = useEffectEvent((current: Weather) => {
    if (muted) return;
    const types = CONDITIONS[current.condition].boosted.map(
      (type) => TYPE_LABELS[type],
    );
    notify({
      id: "xatu",
      member: "xatu",
      priority: "informativo",
      text: `Pronóstico: ${describeWeather(current)}. Potencia a los tipos ${typeList.format(types)}.`,
    });
  });
  useEffect(() => {
    if (!started || weather.status !== "ready" || forecastGiven.current) return;
    forecastGiven.current = true;
    forecast(weather.weather);
  }, [started, weather]);

  const toggleMuted = () => {
    if (!muted) closeNotices();
    setMuted(!muted);
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

  // El color del HUD va en <html>: los tokens de globals.css cambian según data-hud, también los de
  // lo que se abre en un portal, como la ficha.
  useEffect(() => {
    document.documentElement.dataset.hud = settings.hud;
  }, [settings.hud]);

  // Esc sale del modo de instalación sin instalar. Con la ficha o los ajustes del turno abiertos (un
  // clic en una señal abre la ficha también en el modo), ese Esc es del diálogo: lo cierra y el modo
  // sigue.
  useEffect(() => {
    if (!installing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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

  const full = antennas.length >= MAX_ANTENNAS;

  // El HUD va antes que el mapa para que el encabezado sea lo primero que lee un lector de pantalla;
  // z-10 lo deja dibujado encima del mapa, que viene después. Lleva fondo porque al mover el mapa
  // puede quedar cualquier bioma debajo, y sin él el texto apagado no se lee bien sobre los más
  // claros. Arriba a la izquierda, el turno; arriba a la derecha, la hora y los ajustes. El de la
  // izquierda corta la línea antes que el de la derecha y, desde md, cuando la ficha va al costado,
  // antes del panel (más un margen igual al de la izquierda), en vez de quedar tapado. Las 37
  // unidades (148 px) son los 12 px de margen de cada lado, los 114 px de la esquina derecha (hora y
  // dos botones, medidos) y 10 px de aire.
  // El aviso existe desde el HTML del servidor, vacío: un lector de pantalla anuncia los cambios de
  // una región viva que ya estaba, no siempre los de una que aparece con el texto puesto.
  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[calc(100%-(--spacing(37)))] bg-background/80 px-1.5 py-0.5 font-mono text-xs text-balance text-muted-foreground font-stretch-condensed md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))]">
        {/* Cada dato en un span sin cortes: si no entra en una línea, corta en un " · " y
            no entre un nombre y su valor. */}
        <h1 className="inline tracking-widest text-hud uppercase">PokéRadar</h1>{" "}
        · <span className="whitespace-nowrap">{settings.operator}</span> ·{" "}
        <span className="whitespace-nowrap">
          cobertura {percent.format(coverage)}
        </span>{" "}
        ·{" "}
        <span className="whitespace-nowrap">
          {detected.size} de {mapProps.spawns.length} señales
        </span>{" "}
        ·{" "}
        <span className="whitespace-nowrap">
          {identified.size}{" "}
          {identified.size === 1 ? "identificada" : "identificadas"}
        </span>{" "}
        ·{" "}
        {/* Los datos de Open-Meteo van con un enlace a ellos al lado (CC BY 4.0,
            open-meteo.com/en/licence). El HUD no recibe el puntero: el enlace sí. */}
        <span className="whitespace-nowrap">
          {weather.status === "ready" ? (
            <>
              {describeWeather(weather.weather)} (
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/80 pl-1.5 font-mono text-xs text-muted-foreground font-stretch-condensed">
        <Clock />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Silenciar avisos"
          aria-pressed={muted}
          onClick={toggleMuted}
        >
          {muted ? <BellOffIcon aria-hidden /> : <BellIcon aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ajustes del turno"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2Icon aria-hidden />
        </Button>
      </div>
      <ShiftStart open={hydrated && !saved} initial={settings} />
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
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
          {/* La huella del mundo: si coincide entre local y producción, el mundo es el mismo. */}
          <p className="font-mono text-xs text-muted-foreground">
            Mundo: semilla {seed} · huella {hash}
          </p>
        </DialogContent>
      </Dialog>
      {/* El control de las antenas, abajo a la izquierda. El botón alterna el modo de instalación
          (aria-pressed); con las cuatro instaladas queda deshabilitado, y el contador dice por qué.
          Arriba, a la vista, lo último que pasó y, en el modo, qué hacer: el panel está anclado
          abajo y crece hacia arriba, así que el botón no se mueve cuando esas líneas aparecen o se
          van. El fondo es opaco: con el del HUD (al 80 %), el pulso de una señal debajo bajaba
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
        onCoverage={onCoverage}
        active={started}
        onIdentify={onIdentify}
        shiny={shiny}
        weather={weather}
      />
      <CrewNotices />
    </>
  );
}
