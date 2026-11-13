// Lo que se ve en el lugar del mapa mientras no está listo. Ocupa lo mismo que el mapa, con el
// color del mar: no hay salto de layout cuando el mapa aparece.
import type { ReactNode } from "react";

interface MapStatusProps {
  children: ReactNode;
}

export function MapStatus({ children }: MapStatusProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bioma-sea font-mono text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * El cartel de carga. Va mientras baja el código del mapa (map-loader.tsx) y sigue hasta que el
 * mapa termina de cargar (map-view.tsx): el worker y el estilo tardan más que el código.
 */
export function MapLoading() {
  return (
    <MapStatus>
      <p role="status">Cargando mapa…</p>
    </MapStatus>
  );
}
