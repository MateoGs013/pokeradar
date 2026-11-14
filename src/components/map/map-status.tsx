// Lo que se ve en el lugar del mapa mientras no está listo o si no puede cargar. Ocupa lo mismo
// que el mapa, con el color del mar bajo la niebla: no hay salto de layout ni de color cuando el
// mapa aparece.
import Image from "next/image";
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

/** Los pasos del arranque, en orden: cada uno es un estado real de la carga. */
const BOOT_STEPS = {
  /** Baja el código del mapa (map-loader.tsx). */
  calibrating: "Calibrando radar…",
  /** El mapa se está creando: baja el worker de MapLibre y se dibuja por primera vez. */
  connecting: "Conectando satélites…",
  /** El mapa cargó y el radar le está sumando la niebla. */
  coverage: "Cobertura: 0%",
} as const;

export type BootStep = keyof typeof BOOT_STEPS;

// Rotom, el que avisa lo del sistema (docs/concepto.md, "La tripulación"). Es el sprite de PokéAPI,
// como los de la ficha: sin texto alternativo, porque el nombre va escrito al lado.
const ROTOM_SPRITE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/479.png";

/**
 * El arranque del sistema (docs/concepto.md, "Arranque del sistema"): es el cartel de carga,
 * contado por Rotom. Va mientras baja el código del mapa (map-loader.tsx) y sigue hasta que el mapa
 * dibuja la niebla (map-view.tsx): después del código todavía tiene que bajar el worker de MapLibre,
 * el mapa dibujarse completo por primera vez (el evento `load`), y el radar sumarle la niebla. No
 * hay demoras inventadas: cada línea dura lo que dura ese paso.
 */
export function MapLoading({ step }: { step: BootStep }) {
  return (
    <MapStatus>
      <Image
        src={ROTOM_SPRITE}
        alt=""
        width={96}
        height={96}
        unoptimized
        priority
        className="[image-rendering:pixelated]"
      />
      <p role="status">
        <span className="text-hud">Rotom:</span> {BOOT_STEPS[step]}
      </p>
    </MapStatus>
  );
}
