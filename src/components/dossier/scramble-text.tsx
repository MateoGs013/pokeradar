"use client";

// "Analizando firma…": el texto se revuelve y se va revelando de izquierda a derecha, como una
// señal que se decodifica, y vuelve a empezar mientras dure la carga. El lector de pantalla lee
// el texto real (sr-only) y no el revuelto (aria-hidden). Con movimiento reducido, el texto
// queda quieto (docs/decisiones.md, sección 8).
import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";

/** Caracteres de relleno: ASCII, para que en la monoespaciada midan lo mismo que las letras. */
const GLYPHS = "#%&*+=/<>?01";
/** Cada cuánto cambia el revuelto, en milisegundos. */
const TICK_MS = 60;
/** Cuántos pasos queda el texto entero antes de volver a revolverse. */
const HOLD_TICKS = 10;

function scramble(text: string, revealed: number): string {
  return Array.from(text, (char, index) =>
    index < revealed || char === " "
      ? char
      : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? char),
  ).join("");
}

export function ScrambleText({ text }: { text: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (reducedMotion) return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick = (tick + 1) % (text.length + HOLD_TICKS);
      setShown(scramble(text, tick));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [text, reducedMotion]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{reducedMotion ? text : shown}</span>
    </>
  );
}
