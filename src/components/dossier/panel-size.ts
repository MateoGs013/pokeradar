// El tamaño del panel de la ficha, en un solo lugar: lo usa el panel (dossier-panel.tsx), y lo va
// a usar la cámara para que la ficha no tape la señal.

/** Desde este ancho la ficha va al costado (Sheet); debajo, abajo (Drawer). Es `md` de Tailwind. */
export const PANEL_DESKTOP_QUERY = "(min-width: 48rem)";

/** Ancho del panel al costado, en píxeles. */
export const PANEL_WIDTH = 360;

/** Alto del panel de abajo, en porcentaje del alto de la pantalla. */
export const PANEL_HEIGHT_PERCENT = 60;
