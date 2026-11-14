"use client";

// El contenido de la ficha, el mismo en el panel de escritorio y en el del celular. Mientras se
// identifica la señal ("Analizando firma…") se ve la misma estructura que cuando llega, con
// lugares vacíos del mismo alto: al llegar los datos, nada se corre. Solo cambia el alto de la
// descripción, que va al final y no tiene nada abajo.
import { cn } from "cn";
import { ChevronsUpIcon } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import type { Identification } from "@/hooks/use-pokemon-detail";
import type { WeatherState } from "@/hooks/use-weather";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import { STATS } from "@/lib/pokeapi/types";
import { boosts, CONDITIONS, type Weather } from "@/lib/weather/conditions";

import { STAT_LABELS, TYPE_LABELS } from "./labels";
import { hasSprite, PokemonSprite } from "./pokemon-sprite";
import { ScrambleText } from "./scramble-text";
import { THREAT_LEVELS, threatLevel } from "./threat";

/** La estadística base más alta de las 386 especies: 255 (docs/hallazgos-pokeapi.md). */
const MAX_STAT = 255;

interface DossierBodyProps {
  identification: Identification;
  /** Dónde se detectó la señal: "el bosque, al noreste de Monte Brasa". */
  place: string;
  /** Si es variocolor: ese sprite, y "Firma variocolor" en lugar de "Firma identificada". */
  shiny: boolean;
  weather: WeatherState;
  onRetry: () => void;
}

export function DossierBody({
  identification,
  place,
  shiny,
  weather,
  onRetry,
}: DossierBodyProps) {
  if (identification.status === "error") {
    return <DossierError onRetry={onRetry} />;
  }
  const detail =
    identification.status === "ready" ? identification.detail : null;
  const ready = weather.status === "ready" ? weather.weather : null;
  // Con movimiento reducido, motion no anima transform: las barras aparecen ya llenas.
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-5">
        <Identity detail={detail} shiny={shiny} weather={ready} />
        <Threat detail={detail} />
        <Stats detail={detail} />
        <Facts detail={detail} place={place} weather={weather} />
        <Description detail={detail} />
      </div>
    </MotionConfig>
  );
}

/** Un lugar vacío mientras carga, del alto de lo que va a ocupar su lugar. */
function Placeholder({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-sm bg-muted motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

function Identity({
  detail,
  shiny,
  weather,
}: {
  detail: PokemonDetail | null;
  shiny: boolean;
  weather: Weather | null;
}) {
  const sprites = detail && (shiny ? detail.shinySprites : detail.sprites);
  return (
    <div className="flex gap-4">
      {/* El marco mide lo de adentro (96 px en los dos estados) más el borde. Con un tamaño fijo,
          el borde le dejaba al sprite 94 px de ancho en vez de 96 (medido). Una especie sin
          sprite muestra el "?" quieto, para que el marco no quede vacío. */}
      <div className="shrink-0 rounded-md border border-border bg-background">
        {sprites && hasSprite(sprites) ? (
          <PokemonSprite sprites={sprites} size={96} className="size-24" />
        ) : (
          <span
            aria-hidden
            className={cn(
              "flex size-24 items-center justify-center font-mono text-3xl text-muted-foreground",
              !detail && "motion-safe:animate-pulse",
            )}
          >
            ?
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* El mismo elemento en los dos estados: role="status" es una región viva, así que el
            cambio de texto se anuncia (sin probar con un lector de pantalla). */}
        <p
          role="status"
          className="font-mono text-xs tracking-widest text-hud uppercase"
        >
          {detail ? (
            <>
              {shiny ? "Firma variocolor" : "Firma identificada"}
              <span className="sr-only">: {detail.name}</span>
            </>
          ) : (
            <ScrambleText text="Analizando firma…" />
          )}
        </p>
        {detail ? (
          <h3 className="truncate font-display text-2xl leading-8 font-extrabold">
            {detail.name}
          </h3>
        ) : (
          <Placeholder className="h-8 w-32" />
        )}
        {/* Comprimida con el eje de ancho, entra en una línea con los 40 géneros desde 390 px
            (medido); a 320, los más largos se cortan con "…". En dos líneas, la ficha saltaría. */}
        {detail ? (
          <p className="truncate font-mono text-xs text-muted-foreground font-stretch-condensed">
            #{String(detail.id).padStart(3, "0")}
            {detail.genus && ` · ${detail.genus}`}
          </p>
        ) : (
          <Placeholder className="h-4 w-40" />
        )}
        {detail ? (
          <ul aria-label="Tipos" className="flex gap-1.5">
            {/* Un tipo que el clima potencia va lleno y con la flecha; el lector de pantalla lo
                escucha dicho. */}
            {detail.types.map((type) => (
              <li
                key={type}
                className={cn(
                  "flex items-center gap-0.5 rounded-sm border border-hud/40 px-1.5 font-mono text-xs text-hud uppercase",
                  boosts(weather, type) && "border-hud bg-hud text-background",
                )}
              >
                {TYPE_LABELS[type]}
                {weather && boosts(weather, type) && (
                  <>
                    <ChevronsUpIcon aria-hidden className="size-3" />
                    <span className="sr-only">
                      , potenciado por {CONDITIONS[weather.condition].by}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Placeholder className="h-4.5 w-24" />
        )}
      </div>
    </div>
  );
}

function Threat({ detail }: { detail: PokemonDetail | null }) {
  const total = detail?.stats.reduce((sum, stat) => sum + stat.value, 0);
  const level = total === undefined ? null : threatLevel(total);
  const critical = level === "Crítico";
  // Comprimida y sin cortes: así "Crítico · suma 600" entra en una línea también a 320 px (medido).
  return (
    <dl className="flex items-center gap-3 font-mono text-xs font-stretch-condensed">
      <dt className="tracking-widest text-muted-foreground uppercase">
        Amenaza
      </dt>
      <dd aria-hidden className="flex gap-0.5">
        {THREAT_LEVELS.map((name, index) => (
          <span
            key={name}
            className={cn(
              "h-3 w-2",
              level && index <= THREAT_LEVELS.indexOf(level)
                ? critical
                  ? "bg-destructive"
                  : "bg-hud"
                : "bg-muted",
            )}
          />
        ))}
      </dd>
      <dd>
        {level ? (
          <span
            className={cn(
              "tracking-widest whitespace-nowrap uppercase",
              critical ? "text-destructive" : "text-foreground",
            )}
          >
            {level}
            <span className="text-muted-foreground"> · suma {total}</span>
          </span>
        ) : (
          <Placeholder className="h-4 w-28" />
        )}
      </dd>
    </dl>
  );
}

function Stats({ detail }: { detail: PokemonDetail | null }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Estadísticas base
      </h4>
      <dl className="grid grid-cols-[auto_auto_1fr] items-center gap-x-3 gap-y-1.5 font-mono text-xs">
        {STATS.map((name, index) => {
          const value =
            detail?.stats.find((stat) => stat.name === name)?.value ?? null;
          return (
            <Fragment key={name}>
              <dt className="text-muted-foreground">{STAT_LABELS[name]}</dt>
              <dd className="text-right">{value ?? "—"}</dd>
              {/* La barra repite el número de al lado: el lector de pantalla no la necesita. */}
              <dd aria-hidden className="h-1.5 bg-muted">
                {value !== null && (
                  <motion.div
                    className="h-full origin-left bg-hud"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: value / MAX_STAT }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.05,
                      ease: "easeOut",
                    }}
                  />
                )}
              </dd>
            </Fragment>
          );
        })}
      </dl>
    </div>
  );
}

/** Decimales con coma: 0,4 m. */
function formatNumber(value: number): string {
  return value.toLocaleString("es-AR");
}

function Facts({
  detail,
  place,
  weather,
}: {
  detail: PokemonDetail | null;
  place: string;
  weather: WeatherState;
}) {
  // El clima ya se sabe mientras se identifica la señal; con la ficha, se suma si la potencia. Es
  // corto a propósito: en una línea, la fila no cambia de alto al llegar los datos.
  const boosted =
    weather.status === "ready" &&
    detail?.types.some((type) => boosts(weather.weather, type));
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
      <dt className="tracking-widest text-muted-foreground uppercase">
        Altura
      </dt>
      <dd>{detail ? `${formatNumber(detail.heightMeters)} m` : "—"}</dd>
      <dt className="tracking-widest text-muted-foreground uppercase">Peso</dt>
      <dd>{detail ? `${formatNumber(detail.weightKilos)} kg` : "—"}</dd>
      <dt className="tracking-widest text-muted-foreground uppercase">
        Ubicación
      </dt>
      <dd>{place.charAt(0).toUpperCase() + place.slice(1)}</dd>
      <dt className="tracking-widest text-muted-foreground uppercase">Clima</dt>
      <dd>
        {weather.status === "ready"
          ? `${CONDITIONS[weather.weather.condition].label}${boosted ? " · potenciado" : ""}`
          : weather.status === "error"
            ? "Sin datos"
            : "—"}
      </dd>
    </dl>
  );
}

function Description({ detail }: { detail: PokemonDetail | null }) {
  if (!detail) {
    return (
      <div className="flex flex-col gap-1.5">
        <Placeholder className="h-3.5 w-full" />
        <Placeholder className="h-3.5 w-full" />
        <Placeholder className="h-3.5 w-2/3" />
      </div>
    );
  }
  if (!detail.description) return null;
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {detail.description}
    </p>
  );
}

function DossierError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p
        role="alert"
        className="font-display text-2xl leading-8 font-extrabold tracking-wider text-destructive uppercase"
      >
        Señal perdida
      </p>
      <p className="text-sm text-muted-foreground">
        No se pudo identificar la señal: falló la conexión o PokéAPI respondió
        algo inesperado.
      </p>
      <Button onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
