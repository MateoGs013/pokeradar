"use client";

// La bitácora del turno (docs/concepto.md, "Herramientas del operador"): lo identificado, de lo más
// nuevo a lo más viejo, con hora, nivel de amenaza y lugar. Desde acá se abre la ficha de una
// señal, se baja el informe y se termina el turno.
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTime, type LogEntry } from "@/lib/report";

interface ShiftLogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Terminó de abrirse o de cerrarse. */
  onOpenChangeComplete: (open: boolean) => void;
  entries: readonly LogEntry[];
  /** Abrir la ficha de una señal de la bitácora. */
  onShow: (speciesId: number) => void;
  onDownload: () => void;
  onEnd: () => void;
}

export function ShiftLog({
  open,
  onOpenChange,
  onOpenChangeComplete,
  entries,
  onShow,
  onDownload,
  onEnd,
}: ShiftLogProps) {
  const newestFirst = [...entries].reverse();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Bitácora del turno</DialogTitle>
        <DialogDescription>
          {entries.length === 0
            ? "Todavía no identificaste ninguna señal. Tocá una en el mapa para analizarla."
            : `${entries.length} ${entries.length === 1 ? "señal identificada" : "señales identificadas"}, de la más nueva a la más vieja.`}
        </DialogDescription>
        {entries.length > 0 && (
          // Con muchas entradas, la lista se desplaza y los botones de abajo quedan a la vista.
          <ol className="-mx-1 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto px-1 py-0.5">
            {newestFirst.map((entry) => (
              <li
                key={entry.speciesId}
                className="flex items-start gap-3 border-b border-border pb-2 last:border-b-0"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(entry.time)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {entry.name}
                    {/* El espacio deja cortar la línea antes de la etiqueta: sin él, a 320 px
                        "variocolor" se mete debajo del botón Ver. */}
                    {entry.shiny && " "}
                    {entry.shiny && (
                      <span className="font-mono text-xs tracking-widest text-hud uppercase">
                        variocolor
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Amenaza {entry.threat.toLowerCase()} ·{" "}
                    {entry.place.charAt(0).toUpperCase() + entry.place.slice(1)}
                  </p>
                </div>
                <Button
                  aria-label={`Ver ${entry.name} en el mapa`}
                  onClick={() => onShow(entry.speciesId)}
                >
                  Ver
                </Button>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            disabled={entries.length === 0}
            onClick={onDownload}
          >
            Bajar informe CSV
          </Button>
          <Button onClick={onEnd}>Terminar turno</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
