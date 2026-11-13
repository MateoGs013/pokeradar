// Lo que se ve en el lugar del mapa mientras no está listo o si no puede cargar. Ocupa lo mismo
// que el mapa, con el color del mar: no hay salto de layout cuando el mapa aparece.
import type { ReactNode } from "react";

interface MapStatusProps {
  children: ReactNode;
}

export function MapStatus({ children }: MapStatusProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bioma-sea p-4 text-center font-mono text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * El cartel de carga. Va mientras baja el código del mapa (map-loader.tsx) y sigue hasta que el
 * mapa termina de cargar (map-view.tsx): después del código todavía tiene que bajar el worker de
 * MapLibre, y el mapa, dibujarse completo por primera vez (el evento `load`).
 */
export function MapLoading() {
  return (
    <MapStatus>
      <p role="status">Cargando mapa…</p>
    </MapStatus>
  );
}
