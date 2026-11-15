// El cambio de zona (docs/concepto.md, "El mapa híbrido"): del mundo generado al mapa real de
// Argentina, y de vuelta. Es un enlace común y no uno de Next: el mapa toma el marco una sola vez, al
// crearse (map-view.tsx), así que cambiar de zona carga la página de nuevo, con otro turno. Lo
// escrito en el formulario de al lado (el del inicio de turno o el de los ajustes) sin guardar se
// pierde, y el texto lo avisa.
import { modeSearch, type MapMode } from "@/components/map/frame";

/** El estilo de los enlaces de texto del HUD (el de Open-Meteo, la atribución del mapa). */
export const TEXT_LINK =
  "underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const ZONES: [MapMode, string][] = [
  ["mundo", "Isla"],
  ["real", "Argentina"],
];

/**
 * El cambio de zona a la vista, en la sala: dos casillas, con la zona actual llena de tinta, como
 * las del formulario del turno. La otra es el mismo enlace que `ZoneLink`: carga la página de nuevo
 * y empieza otro turno. Con mouse el control mide
 * 20 px de alto y el filete de las antenas tiene 4 px menos: la columna queda del alto de antes
 * (medido a 1280 × 820: los botones terminan en 780 px en el mundo y en 795 en el mapa real, como
 * antes del cambio). Con un puntero grueso mide 38.
 */
export function ZoneSwitch({ mode }: { mode: MapMode }) {
  return (
    <nav
      aria-label="Zona de operaciones"
      className="flex shrink-0 overflow-hidden rounded-sm border border-foreground/50 text-[0.6875rem] tracking-wide uppercase font-stretch-condensed"
    >
      {ZONES.map(([zone, label]) =>
        zone === mode ? (
          <span
            key={zone}
            aria-current="page"
            className="flex h-4.5 items-center bg-foreground px-1.5 text-background pointer-coarse:h-9 pointer-coarse:px-2"
          >
            {label}
          </span>
        ) : (
          <a
            key={zone}
            href={`/${modeSearch(zone)}`}
            title="Empieza otro turno en esta zona"
            className="flex h-4.5 items-center px-1.5 text-foreground hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring pointer-coarse:h-9 pointer-coarse:px-2"
          >
            {label}
          </a>
        ),
      )}
    </nav>
  );
}

export function ZoneLink({ mode }: { mode: MapMode }) {
  const other: MapMode = mode === "real" ? "mundo" : "real";
  return (
    <p className="text-sm text-muted-foreground">
      <a href={`/${modeSearch(other)}`} className={TEXT_LINK}>
        {other === "real"
          ? "Operar sobre el mapa de Argentina"
          : "Volver al mundo generado"}
      </a>
      . Empieza otro turno, sin guardar lo que cambiaste acá.
    </p>
  );
}
