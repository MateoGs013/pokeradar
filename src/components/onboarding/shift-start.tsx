"use client";

// El inicio de turno (docs/concepto.md, "Onboarding: inicio de turno"): la primera vez, el nombre en
// clave y el color del HUD, con el mismo formulario de los ajustes. Mientras está abierto, el mapa y
// la niebla cargan por detrás, y el radar espera (monitoring-room.tsx). "Saltar" y Esc guardan los
// ajustes de por defecto, así no vuelve a aparecer; tocar afuera no lo cierra. Abajo, el enlace a
// la otra zona de operaciones: el mundo generado o el mapa real (zone-link.tsx).
import { ShiftForm } from "@/components/hud/shift-form";
import { ZoneLink } from "@/components/hud/zone-link";
import type { MapMode } from "@/components/map/frame";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveShiftSettings } from "@/hooks/use-shift-settings";
import { DEFAULT_SETTINGS, type ShiftSettings } from "@/lib/shift";

interface ShiftStartProps {
  open: boolean;
  /** Los ajustes con los que arranca el formulario: los de por defecto, la primera vez. */
  initial: ShiftSettings;
  /** La zona de esta sala: el enlace lleva a la otra. */
  mode: MapMode;
}

export function ShiftStart({ open, initial, mode }: ShiftStartProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) saveShiftSettings(DEFAULT_SETTINGS);
      }}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false}>
        <DialogTitle>Inicio de turno</DialogTitle>
        <DialogDescription>
          Identificate y elegí cómo se ve y cómo suena la sala. Después se
          cambia desde los ajustes, arriba a la derecha.
        </DialogDescription>
        <ShiftForm
          initial={initial}
          submitLabel="Iniciar turno"
          onSubmit={saveShiftSettings}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => saveShiftSettings(DEFAULT_SETTINGS)}
          >
            Saltar
          </Button>
        </ShiftForm>
        <ZoneLink mode={mode} />
      </DialogContent>
    </Dialog>
  );
}
