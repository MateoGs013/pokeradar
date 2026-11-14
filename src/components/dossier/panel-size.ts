// El tamaño del panel de la ficha, en un solo lugar: lo usan el panel (dossier-panel.tsx) y la
// cámara (map/camera.ts), para que la ficha no tape la señal.

/** Desde este ancho la ficha va al costado (Sheet); debajo, abajo (Drawer). Es `md` de Tailwind. */
export const PANEL_DESKTOP_QUERY = "(min-width: 48rem)";

/**
 * Ancho del panel al costado, en píxeles. page.tsx lo pasa al CSS como `--panel-width`, para que
 * el HUD de arriba a la izquierda no quede debajo del panel.
 */
export const PANEL_WIDTH = 360;

// `--panel-width` en el `style` de React, con tipo. Los tipos de React no aceptan variables CSS
// sueltas; su comentario en CSSProperties ofrece un cast o sumar la propiedad al tipo, y en este
// proyecto no van casts (CLAUDE.md).
declare module "react" {
  interface CSSProperties {
    "--panel-width"?: string;
  }
}

/** Alto del panel de abajo, en porcentaje del alto de la pantalla. */
export const PANEL_HEIGHT_PERCENT = 60;
