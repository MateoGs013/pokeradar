"use client";

// La hora local del operador, para la esquina del HUD (docs/concepto.md, "La interfaz"). Cambia
// al empezar cada minuto. La página es estática: el servidor no sabe la hora de quien la abre, así
// que deja el lugar con "--:--", del mismo ancho, y el navegador la pone al hidratar.
import { MINUTE, useMinute } from "@/hooks/use-minute";

const format = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function Clock() {
  const minute = useMinute();
  if (minute === null) return <span aria-hidden>--:--</span>;
  const date = new Date(minute * MINUTE);
  return <time dateTime={date.toISOString()}>{format.format(date)}</time>;
}
