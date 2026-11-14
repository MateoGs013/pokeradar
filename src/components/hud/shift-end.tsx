"use client";

// El fin de turno (docs/concepto.md, "Herramientas del operador"): un resumen con cobertura,
// identificados y anomalías, el informe para bajar y la salida a un turno nuevo.
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LogEntry } from "@/lib/report";
import { THREAT_LEVELS } from "@/lib/threat";

export interface ShiftSummary {
  operator: string;
  /** Cuándo empezó y cuándo se pidió el resumen, en ms desde 1970. */
  startedAt: number;
  endedAt: number;
  /** Qué parte del mundo despejó el radar, de 0 a 1. */
  coverage: number;
  detected: number;
  total: number;
  antennas: number;
  entries: readonly LogEntry[];
}

interface ShiftEndProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ShiftSummary | null;
  onDownload: () => void;
  onRestart: () => void;
}

const percent = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 0,
});

/** "menos de 1 min", "12 min", "1 h 05 min". */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** La señal identificada con la amenaza más alta (la primera, si empatan). */
function highestThreat(entries: readonly LogEntry[]): LogEntry | null {
  let highest: LogEntry | null = null;
  for (const entry of entries) {
    const rank = THREAT_LEVELS.findIndex((level) => level === entry.threat);
    const best = THREAT_LEVELS.findIndex((level) => level === highest?.threat);
    if (rank > best) highest = entry;
  }
  return highest;
}

export function ShiftEnd({
  open,
  onOpenChange,
  summary,
  onDownload,
  onRestart,
}: ShiftEndProps) {
  // El foco entra al diálogo y no a su primer botón: sin identificadas, el CSV está deshabilitado y
  // el primero es "Empezar otro turno", que con un Enter de más reiniciaba el turno. Base UI hace lo
  // mismo al abrir con un toque.
  const popup = useRef<HTMLDivElement>(null);
  const top = summary && highestThreat(summary.entries);
  const shiny = summary?.entries.filter((entry) => entry.shiny) ?? [];
  const rows: [string, string][] = summary
    ? [
        ["Operador", summary.operator],
        ["Duración", formatDuration(summary.endedAt - summary.startedAt)],
        ["Cobertura", percent.format(summary.coverage)],
        ["Señales detectadas", `${summary.detected} de ${summary.total}`],
        ["Identificadas", String(summary.entries.length)],
        [
          "Anomalías",
          shiny.length === 0
            ? "ninguna"
            : shiny.map((entry) => `${entry.name} variocolor`).join(", "),
        ],
        [
          "Amenaza más alta",
          top ? `${top.threat} (${top.name})` : "sin identificar",
        ],
        ["Antenas", String(summary.antennas)],
      ]
    : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={popup} initialFocus={popup}>
        <DialogTitle>Fin de turno</DialogTitle>
        <DialogDescription>
          El resumen del turno. Un turno nuevo empieza con el mundo cubierto
          otra vez.
        </DialogDescription>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="tracking-widest text-muted-foreground uppercase">
                {label}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            disabled={!summary || summary.entries.length === 0}
            onClick={onDownload}
          >
            Bajar informe CSV
          </Button>
          <Button onClick={onRestart}>Empezar otro turno</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
