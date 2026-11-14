// La bitácora del turno y su informe (docs/concepto.md, "Herramientas del operador"): lo identificado,
// con hora, lugar y nivel de amenaza, y el mismo listado como CSV para abrir en una planilla.
import type { ThreatLevel } from "@/lib/threat";

export interface LogEntry {
  speciesId: number;
  name: string;
  /** Cuándo llegó la ficha, en ms desde 1970. */
  time: number;
  /** Dónde está la señal: "la montaña, al sudeste de Monte Brasa". */
  place: string;
  /** El nivel de amenaza de la ficha (lib/threat.ts). */
  threat: ThreatLevel;
  shiny: boolean;
}

const clock = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "04:57", con el reloj del operador. */
export function formatTime(time: number): string {
  return clock.format(time);
}

/** Un campo de CSV (RFC 4180): entre comillas dobles, y las de adentro, duplicadas. */
function field(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * La bitácora como CSV, una fila por señal identificada. Lleva BOM para que Excel lea los acentos
 * como UTF-8, y las líneas terminan en CRLF, como pide RFC 4180.
 */
export function toCsv(entries: readonly LogEntry[]): string {
  const rows = [
    ["Hora", "Número", "Nombre", "Variocolor", "Amenaza", "Lugar"],
    ...entries.map((entry) => [
      formatTime(entry.time),
      String(entry.speciesId),
      entry.name,
      entry.shiny ? "sí" : "no",
      entry.threat,
      entry.place,
    ]),
  ];
  return `\ufeff${rows.map((row) => row.map(field).join(",")).join("\r\n")}\r\n`;
}

/** "pokeradar-operador-07-2026-11-14-0457.csv": el nombre en clave sin acentos ni espacios. */
export function reportFileName(operator: string, date: Date): string {
  const slug = operator
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `pokeradar-${slug || "operador"}-${stamp}.csv`;
}

/** Baja el informe: un enlace a un Blob, tocado desde el código. */
export function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Se libera después: revocarlo en el mismo turno puede cortar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
