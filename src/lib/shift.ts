// Los ajustes del turno: el nombre en clave del operador y el color del HUD (docs/concepto.md,
// "Onboarding: inicio de turno"). Sin React: también los usa el layout, que es del servidor.

export const HUD_COLORS = ["verde", "ambar", "cian"] as const;
export type HudColor = (typeof HUD_COLORS)[number];

export interface ShiftSettings {
  operator: string;
  hud: HudColor;
}

export const DEFAULT_SETTINGS: ShiftSettings = {
  operator: "Operador-07",
  hud: "verde",
};

/** Largo máximo del nombre en clave: entra en una línea del HUD a 320 px. */
export const OPERATOR_MAX_LENGTH = 20;

/** Dónde se guardan en localStorage. También lo lee el script del layout que aplica el color. */
export const SHIFT_STORAGE_KEY = "pokeradar:turno";

export function isHudColor(value: unknown): value is HudColor {
  return HUD_COLORS.some((color) => color === value);
}
