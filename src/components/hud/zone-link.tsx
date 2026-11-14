// El cambio de zona (docs/concepto.md, "El mapa híbrido"): del mundo generado al mapa real de Río
// Negro, y de vuelta. Es un enlace común y no uno de Next: el mapa toma el marco una sola vez, al
// crearse (map-view.tsx), así que cambiar de zona carga la página de nuevo, con otro turno.
import { modeSearch, type MapMode } from "@/components/map/frame";

/** El estilo de los enlaces de texto del HUD (el de Open-Meteo, la atribución del mapa). */
export const TEXT_LINK =
  "underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ZoneLink({ mode }: { mode: MapMode }) {
  const other: MapMode = mode === "real" ? "mundo" : "real";
  return (
    <p className="text-sm text-muted-foreground">
      <a href={`/${modeSearch(other)}`} className={TEXT_LINK}>
        {other === "real"
          ? "Operar sobre el mapa real, en Viedma"
          : "Volver al mundo generado"}
      </a>
      . Empieza otro turno.
    </p>
  );
}
