// La cobertura dibujada como la escala gráfica de una carta: una regla con una marca en cada cuarto
// y sus números debajo, que se llena con el color del HUD. Repite la cifra de arriba, así que el
// lector de pantalla no la recibe. Va desde lg, en la columna de la hoja.

/** Una raya de tinta de 1 px en cada cuarto del ancho: las marcas de la regla. */
export const QUARTER_TICKS =
  "bg-[repeating-linear-gradient(to_right,transparent_0_calc(25%-1px),var(--hud-fg)_calc(25%-1px)_25%)]";

/** `value` va de 0 a 1. No anima sola: la sala le pasa la cobertura que ya llega contando. */
export function CoverageScale({ value }: { value: number }) {
  return (
    <span
      aria-hidden
      className="mt-2.5 hidden font-mono text-[0.5625rem] leading-none font-normal tracking-wider text-muted-foreground lg:block"
    >
      <span className="relative block h-2 border border-foreground/70">
        <span
          className="absolute inset-0 origin-left bg-hud"
          style={{ transform: `scaleX(${Math.min(Math.max(value, 0), 1)})` }}
        />
        <span className={`absolute inset-0 opacity-60 ${QUARTER_TICKS}`} />
      </span>
      <span className="mt-1 flex justify-between">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100 %</span>
      </span>
    </span>
  );
}
