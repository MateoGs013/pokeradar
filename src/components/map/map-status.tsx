// Lo que se ve en el lugar del mapa mientras no está listo o si no puede cargar. Ocupa lo mismo
// que el mapa, con el color del mar bajo la niebla: no hay salto de layout ni de color cuando el
// mapa aparece.
import type { ReactNode } from "react";

interface MapStatusProps {
  children: ReactNode;
}

export function MapStatus({ children }: MapStatusProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-fog-sea p-4 text-center font-mono text-sm text-muted-foreground">
      {children}
    </div>
  );
}
