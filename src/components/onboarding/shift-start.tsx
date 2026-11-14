"use client";

// El inicio de turno (docs/concepto.md, "Onboarding: inicio de turno"): la primera vez, el nombre en
// clave y el color del HUD, con el mismo formulario de los ajustes. Mientras está abierto, el mapa y
// la niebla cargan por detrás, y el radar espera (monitoring-room.tsx). "Saltar" y Esc guardan los
// ajustes de por defecto, así no vuelve a aparecer; tocar afuera no lo cierra. La zona de
// operaciones se suma con el modo híbrido (bloque 6), y el sonido y la intensidad visual, en el
// bloque 7.
import { ShiftForm } from "@/components/hud/shift-form";
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
}

export function ShiftStart({ open, initial }: ShiftStartProps) {
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
          Identificate y elegí el color del HUD. Después se cambian desde los
          ajustes, arriba a la derecha.
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
      </DialogContent>
    </Dialog>
  );
}
