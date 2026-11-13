"use client";

// El contenido de la ficha, el mismo en el panel de escritorio y en el del celular. Mientras se
// identifica la señal ("Analizando firma…") se ve la misma estructura que cuando llega, con
// lugares vacíos del mismo alto: al llegar los datos, nada se corre. Solo cambia el alto de la
// descripción, que va al final y no tiene nada abajo.
import { cn } from "cn";
import { MotionConfig, motion } from "motion/react";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import type { Identification } from "@/hooks/use-pokemon-detail";
import type { PokemonDetail } from "@/lib/pokeapi/detail";
import { STATS } from "@/lib/pokeapi/types";

import { STAT_LABELS, TYPE_LABELS } from "./labels";
import { PokemonSprite } from "./pokemon-sprite";
import { ScrambleText } from "./scramble-text";
import { THREAT_LEVELS, threatLevel } from "./threat";

/** La estadística base más alta de las 386 especies: 255, los PS de Blissey (docs/hallazgos-pokeapi.md). */
const MAX_STAT = 255;

interface DossierBodyProps {
  identification: Identification;
  /** Dónde se detectó la señal: "el bosque del norte". */
  place: string;
  onRetry: () => void;
}

export function DossierBody({
  identification,
  place,
  onRetry,
}: DossierBodyProps) {
  if (identification.status === "error") {
    return <DossierError onRetry={onRetry} />;
  }
  const detail =
    identification.status === "ready" ? identification.detail : null;
  // Con movimiento reducido, motion no anima transform: las barras aparecen ya llenas.
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-5">
        <Identity detail={detail} />
        <Threat detail={detail} />
        <Stats detail={detail} />
        <Facts detail={detail} place={place} />
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

function Identity({ detail }: { detail: PokemonDetail | null }) {
  return (
    <div className="flex gap-4">
      {/* El marco mide lo de adentro (96 px en los dos estados) más el borde. Con un tamaño fijo,
          el borde le dejaba al sprite 94 px de ancho en vez de 96 (medido). */}
      <div className="shrink-0 rounded-md border border-border bg-background">
        {detail ? (
          <PokemonSprite
            sprites={detail.sprites}
            size={96}
            className="size-24"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-24 items-center justify-center font-mono text-3xl text-muted-foreground motion-safe:animate-pulse"
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
              Firma identificada
              <span className="sr-only">: {detail.name}</span>
            </>
          ) : (
            <ScrambleText text="Analizando firma…" />
          )}
        </p>
        {detail ? (
          <h3 className="truncate text-xl leading-7 font-semibold">
            {detail.name}
          </h3>
        ) : (
          <Placeholder className="h-7 w-32" />
        )}
        {detail ? (
          <p className="font-mono text-xs text-muted-foreground">
            #{String(detail.id).padStart(3, "0")}
            {detail.genus && ` · ${detail.genus}`}
          </p>
        ) : (
          <Placeholder className="h-4 w-40" />
        )}
        {detail ? (
          <ul aria-label="Tipos" className="flex gap-1.5">
            {detail.types.map((type) => (
              <li
                key={type}
                className="rounded-sm border border-hud/40 px-1.5 font-mono text-xs text-hud uppercase"
              >
                {TYPE_LABELS[type]}
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
  return (
    <dl className="flex items-center gap-3 font-mono text-xs">
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
              "tracking-widest uppercase",
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
}: {
  detail: PokemonDetail | null;
  place: string;
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
      <dt className="tracking-widest text-muted-foreground uppercase">
        Altura
      </dt>
      <dd>{detail ? `${formatNumber(detail.heightMeters)} m` : "—"}</dd>
      <dt className="tracking-widest text-muted-foreground uppercase">Peso</dt>
      <dd>{detail ? `${formatNumber(detail.weightKilos)} kg` : "—"}</dd>
      <dt className="tracking-widest text-muted-foreground uppercase">
        Hábitat
      </dt>
      <dd>{place.charAt(0).toUpperCase() + place.slice(1)}</dd>
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
        className="font-mono text-xs tracking-widest text-destructive uppercase"
      >
        Señal perdida
      </p>
      <p className="text-sm text-muted-foreground">
        No llegó la respuesta de PokéAPI. Puede ser la conexión.
      </p>
      <Button onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
