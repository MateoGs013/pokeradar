"use client";

// Un número que llega a su valor contando. La cifra grande de la hoja (la cobertura) no salta de
// 9 % a 19 % cuando una antena termina su vuelta: sube, y así se ve qué cambió.
import { useEffect, useRef, useState } from "react";

import { reducedMotion } from "@/lib/motion";

/** Cuánto tarda en llegar, en ms. */
const DURATION = 900;

/**
 * `value`, pero cuando cambia llega desde el valor anterior, rápido al principio y frenando al
 * final. Con movimiento reducido (lib/motion.ts) llega en un solo cuadro.
 */
export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  // Lo que se está mostrando: si el valor cambia a mitad de la cuenta, sigue desde ahí.
  const current = useRef(value);

  useEffect(() => {
    const origin = current.current;
    const duration = reducedMotion() ? 0 : DURATION;
    let start: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      start ??= now;
      const progress = duration ? Math.min((now - start) / duration, 1) : 1;
      // Frena al final: 1 − (1 − t)³.
      const next = origin + (value - origin) * (1 - (1 - progress) ** 3);
      current.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}
