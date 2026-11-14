// Los ajustes del turno guardados en el navegador (lib/shift.ts): para que el inicio de turno se
// muestre solo la primera vez, y para cambiarlos desde el HUD.
import { useSyncExternalStore } from "react";

import {
  DEFAULT_SETTINGS,
  isHudColor,
  OPERATOR_MAX_LENGTH,
  SHIFT_STORAGE_KEY,
  type ShiftSettings,
} from "@/lib/shift";

/**
 * Lo guardado, validado: localStorage es de cualquiera que use el navegador, y un dato roto o de
 * otra versión no tiene que romper la página. Si no sirve, es como si no hubiera nada.
 */
function parse(raw: string | null): ShiftSettings | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  if (!("operator" in data) || typeof data.operator !== "string") return null;
  if (!("hud" in data) || !isHudColor(data.hud)) return null;
  const operator = data.operator.trim().slice(0, OPERATOR_MAX_LENGTH);
  return { operator: operator || DEFAULT_SETTINGS.operator, hud: data.hud };
}

// Una pestaña avisa a las suscripciones de esta; el evento `storage` llega de las otras.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Lo último guardado, si el navegador no dejó escribir en localStorage. Gana sobre lo que haya en
// localStorage: si escribir falla y había algo de antes, lo nuevo vale igual hasta recargar.
let fallback: string | null = null;

// El texto guardado, tal cual: dos lecturas iguales dan el mismo string, y useSyncExternalStore
// no vuelve a renderizar. Sin acceso a localStorage (modo privado estricto), no hay nada guardado.
function read(): string | null {
  try {
    return localStorage.getItem(SHIFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Guarda los ajustes. Si el navegador no deja guardar, valen hasta recargar la página. */
export function saveShiftSettings(settings: ShiftSettings) {
  try {
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(settings));
    fallback = null;
  } catch {
    fallback = JSON.stringify(settings);
  }
  for (const listener of listeners) listener();
}

// Sin suscripción: el valor del navegador no cambia, solo el del servidor es otro.
const noSubscription = () => () => {};

/**
 * Los ajustes del turno, si ya hay algunos guardados, y si ya se leyeron. En el servidor (la página
 * es estática) no hay nada guardado: se renderiza con los de por defecto, y `hydrated` es false
 * hasta que el navegador los lee al hidratar. Así el inicio de turno no se abre para alguien que ya
 * lo pasó.
 */
export function useShiftSettings() {
  const raw = useSyncExternalStore(
    subscribe,
    () => fallback ?? read(),
    () => null,
  );
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const saved = parse(raw);
  return {
    settings: saved ?? DEFAULT_SETTINGS,
    saved: saved !== null,
    hydrated,
  };
}
