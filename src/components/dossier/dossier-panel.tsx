"use client";

// La ficha de inteligencia: al costado en escritorio (Sheet) y abajo en el celular (Drawer), con el
// mismo contenido (docs/decisiones.md, sección 8, "Panel de la ficha"). Los dos son modales: el
// foco queda en la ficha, Esc o tocar afuera la cierran, y al cerrar el foco vuelve a la señal.
import { XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

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

import { DossierBody } from "./dossier-body";
import {
  PANEL_DESKTOP_QUERY,
  PANEL_HEIGHT_PERCENT,
  PANEL_WIDTH,
} from "./panel-size";

interface DossierPanelProps {
  open: boolean;
  /** null cuando no hay señal elegida: el panel está cerrado y sin contenido. */
  identification: Identification | null;
  /** Dónde se detectó la señal: "el bosque, al noreste de Monte Brasa". */
  place: string | null;
  /** Si la señal es variocolor (lib/shiny.ts). */
  shiny: boolean;
  /** El clima: la ficha dice si potencia a la especie. */
  weather: WeatherState;
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
  identification,
  place,
  shiny,
  weather,
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
          close={<DrawerClose render={<CloseButton />} />}
        >
          {body}
        </PanelLayout>
      </DrawerContent>
    </Drawer>
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
  close,
  children,
}: {
  title: ReactNode;
  close: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 py-2 pr-2 pl-4">
        {title}
        {close}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        {children}
      </div>
    </>
  );
}
