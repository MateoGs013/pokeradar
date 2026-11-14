// Los ajustes del turno: el nombre en clave del operador, el color del HUD, el sonido y la intensidad
// visual (docs/concepto.md, "Onboarding: inicio de turno"). Sin React: también los usa el layout,
// que es del servidor.

export const HUD_COLORS = ["verde", "ambar", "cian"] as const;
export type HudColor = (typeof HUD_COLORS)[number];

/** La intensidad visual: "reducida" apaga lo que se mueve, como `prefers-reduced-motion`. */
export const MOTION_LEVELS = ["completa", "reducida"] as const;
export type MotionLevel = (typeof MOTION_LEVELS)[number];

export interface ShiftSettings {
  operator: string;
  hud: HudColor;
  /** Apagado por defecto: los navegadores no dejan sonar nada hasta que la persona toca la página. */
  sound: boolean;
  /** null: la que pide el sistema (`prefers-reduced-motion`). */
  motion: MotionLevel | null;
}

export const DEFAULT_SETTINGS: ShiftSettings = {
  operator: "Operador-07",
  hud: "verde",
  sound: false,
  motion: null,
};

/** Largo máximo del nombre en clave: entra en una línea del HUD a 320 px. */
export const OPERATOR_MAX_LENGTH = 20;

/** Dónde se guardan en localStorage. También lo lee el script del layout que aplica el color. */
export const SHIFT_STORAGE_KEY = "pokeradar:turno";

export function isHudColor(value: unknown): value is HudColor {
  return HUD_COLORS.some((color) => color === value);
}

export function isMotionLevel(value: unknown): value is MotionLevel {
  return MOTION_LEVELS.some((level) => level === value);
}
