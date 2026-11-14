"use client";

// La ficha de inteligencia: al costado en escritorio (Sheet) y abajo en el celular (Drawer), con el
// mismo contenido (docs/decisiones.md, sección 8, "Panel de la ficha"). Los dos son modales: el
// foco queda en la ficha, Esc o tocar afuera la cierran, y al cerrar el foco vuelve a la señal.
import { CheckIcon, LinkIcon, XIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Identification } from "@/hooks/use-pokemon-detail";
import type { WeatherState } from "@/hooks/use-weather";
import type { Boost } from "@/lib/boosts";

import { DossierBody } from "./dossier-body";
import {
  PANEL_DESKTOP_QUERY,
  PANEL_HEIGHT_PERCENT,
  PANEL_WIDTH,
} from "./panel-size";

interface DossierPanelProps {
  open: boolean;
  /** La especie de la señal, para el enlace compartible; null sin señal elegida. */
  speciesId: number | null;
  /** null cuando no hay señal elegida: el panel está cerrado y sin contenido. */
  identification: Identification | null;
  /** Dónde se detectó la señal: "el bosque, al noreste de Monte Brasa". */
  place: string | null;
  /** Si la señal es variocolor (lib/shiny.ts). */
  shiny: boolean;
  /** El clima: la ficha dice si potencia a la especie. */
  weather: WeatherState;
  /** Lo que potencia tipos (el clima y la noche): la ficha marca los de la especie. */
  boosts: readonly Boost[];
  onRetry: () => void;
  /** Se pidió cerrar: Esc, la cruz, tocar afuera o, en el celular, deslizar hacia abajo. */
  onClose: () => void;
  /** Terminó la animación de salida: recién ahí se puede desmontar el contenido. */
  onClosed: () => void;
  /** Adónde vuelve el foco al cerrar: el botón de la señal. */
  returnFocus: () => HTMLElement | null;
}

const TITLE_CLASS =
  "font-mono text-xs tracking-widest text-muted-foreground uppercase";

export function DossierPanel({
  open,
  speciesId,
  identification,
  place,
  shiny,
  weather,
  boosts,
  onRetry,
  onClose,
  onClosed,
  returnFocus,
}: DossierPanelProps) {
  const desktop = useMediaQuery(PANEL_DESKTOP_QUERY);
  const root = {
    open,
    onOpenChange: (next: boolean) => {
      if (!next) onClose();
    },
    onOpenChangeComplete: (next: boolean) => {
      if (!next) onClosed();
    },
  };
  const body = identification && place !== null && (
    <DossierBody
      identification={identification}
      place={place}
      shiny={shiny}
      weather={weather}
      boosts={boosts}
      onRetry={onRetry}
    />
  );
  // Sin Trigger de Base UI (la señal vive en un Marker del mapa), así que el foco de vuelta se
  // indica a mano con finalFocus.
  if (desktop) {
    return (
      <Sheet {...root}>
        <SheetContent finalFocus={returnFocus} style={{ width: PANEL_WIDTH }}>
          <PanelLayout
            title={
              <SheetTitle className={TITLE_CLASS}>
                Ficha de inteligencia
              </SheetTitle>
            }
            share={speciesId !== null && <ShareButton speciesId={speciesId} />}
            close={<SheetClose render={<CloseButton />} />}
          >
            {body}
          </PanelLayout>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer {...root}>
      <DrawerContent
        finalFocus={returnFocus}
        style={{ height: `${PANEL_HEIGHT_PERCENT}dvh` }}
      >
        <PanelLayout
          title={
            <DrawerTitle className={TITLE_CLASS}>
              Ficha de inteligencia
            </DrawerTitle>
          }
          share={speciesId !== null && <ShareButton speciesId={speciesId} />}
          close={<DrawerClose render={<CloseButton />} />}
        >
          {body}
        </PanelLayout>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Copia el enlace de la señal (`?p=25`, con `modo=real` delante en el mapa real): abre la sala con
 * esa señal identificada, salteando el inicio de turno. El resultado se ve en el ícono y se anuncia en una región viva. Si el navegador
 * no deja copiar, el enlace igual está en la barra de direcciones.
 */
function ShareButton({ speciesId }: { speciesId: number }) {
  const [result, setResult] = useState<{ id: number; copied: boolean } | null>(
    null,
  );
  // Otra señal: el resultado anterior ya no corre.
  const current = result?.id === speciesId ? result : null;
  const copy = async () => {
    // De la consulta actual, solo el modo: los parámetros de demo (`?shiny=4`) no se comparten.
    const params = new URLSearchParams();
    if (new URLSearchParams(window.location.search).get("modo") === "real")
      params.set("modo", "real");
    params.set("p", String(speciesId));
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    try {
      await navigator.clipboard.writeText(url);
      setResult({ id: speciesId, copied: true });
    } catch {
      setResult({ id: speciesId, copied: false });
    }
  };
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Copiar el enlace de esta señal"
        onClick={copy}
      >
        {current?.copied ? <CheckIcon aria-hidden /> : <LinkIcon aria-hidden />}
      </Button>
      <span role="status" className="sr-only">
        {current &&
          (current.copied
            ? "Enlace copiado"
            : "No se pudo copiar. El enlace está en la barra de direcciones.")}
      </span>
    </>
  );
}

function CloseButton(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon" aria-label="Cerrar la ficha" {...props}>
      <XIcon />
    </Button>
  );
}

/**
 * El encabezado fijo, con el título y la cruz, y el contenido, que se desplaza si no entra. Cuando
 * no entra (a 390 px pasa), Chrome deja enfocar el contenedor con Tab para bajarlo con las flechas:
 * su foco se ve con el mismo contorno que el resto, por dentro para que el borde no lo corte.
 */
function PanelLayout({
  title,
  share,
  close,
  children,
}: {
  title: ReactNode;
  share: ReactNode;
  close: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 py-2 pr-2 pl-4">
        <div className="min-w-0 flex-1">{title}</div>
        {share}
        {close}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        {children}
      </div>
    </>
  );
}
