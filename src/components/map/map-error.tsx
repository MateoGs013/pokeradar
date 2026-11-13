"use client";

// Si el mapa no puede cargar, un mensaje propio en su lugar, y el resto de la página sigue.
// catchError (next/error, estable desde Next 16.3) arma el error boundary: atrapa lo que lanza
// MapView al renderizar o en sus efectos, y también una falla al bajar su código.
import { catchError, type ErrorInfo } from "next/error";

import { MapStatus } from "./map-status";

function MapErrorFallback(
  _props: Record<string, unknown>,
  { error }: ErrorInfo,
) {
  // MapLibre 6 necesita WebGL2: sin él, el constructor del mapa lanza GPUInitializationError.
  // Se compara el nombre, y no con `instanceof`, para no importar maplibre-gl acá: eso lo sumaría
  // a la carga inicial de la página, fuera de la carga diferida.
  if (error instanceof Error && error.name === "GPUInitializationError") {
    return (
      <MapStatus>
        <p role="alert">
          El mapa necesita WebGL2, y este navegador no lo tiene activo.
        </p>
        <p>Probá con otro navegador o activá la aceleración por hardware.</p>
      </MapStatus>
    );
  }
  // Reintentar recarga la página. `retry` y `reset` de catchError vuelven a renderizar con el
  // código ya cargado, y si lo que falló fue bajar el del mapa, `next/dynamic` (React.lazy)
  // repite el mismo error.
  return (
    <MapStatus>
      <p role="alert">No se pudo cargar el mapa.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Reintentar
      </button>
    </MapStatus>
  );
}

/** Envuelve al mapa: si falla, muestra el mensaje en su lugar. */
export const MapErrorBoundary = catchError(MapErrorFallback);
