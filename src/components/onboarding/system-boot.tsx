// El arranque del sistema: el cartel de carga del mapa, contado por Rotom.
import Image from "next/image";

import { CREW } from "@/components/crew/crew";
import { MapStatus } from "@/components/map/map-status";

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

/**
 * El arranque del sistema (docs/concepto.md, "Arranque del sistema"): es el cartel de carga,
 * contado por Rotom. Va mientras baja el código del mapa (map-loader.tsx) y sigue hasta que el mapa
 * dibuja la niebla (map-view.tsx): después del código todavía tiene que bajar el worker de MapLibre,
 * el mapa dibujarse completo por primera vez (el evento `load`), y el radar sumarle la niebla. No
 * hay demoras inventadas: cada línea dura lo que dura ese paso.
 */
export function SystemBoot({ step }: { step: BootStep }) {
  // Rotom, el que avisa lo del sistema (crew.ts). Sin texto alternativo: el nombre va escrito al lado.
  return (
    <MapStatus>
      <Image
        src={CREW.rotom.sprite}
        alt=""
        width={96}
        height={96}
        unoptimized
        preload
        className="[image-rendering:pixelated]"
      />
      <p role="status">
        <span className="text-hud">Rotom:</span> {BOOT_STEPS[step]}
      </p>
    </MapStatus>
  );
}
