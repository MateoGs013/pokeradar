"use client";

// El formulario del turno: el nombre en clave, el color del HUD, la intensidad visual y el sonido. Lo
// usan los ajustes del HUD y el inicio de turno; cada uno pone su botón principal y, si hace falta,
// otros (como "Saltar").
import { type FormEvent, type ReactNode, useId } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SETTINGS,
  HUD_COLORS,
  type HudColor,
  isHudColor,
  isMotionLevel,
  MOTION_LEVELS,
  OPERATOR_MAX_LENGTH,
  type ShiftSettings,
} from "@/lib/shift";

// "sistema" es `motion: null` en los ajustes: sin elegir, la intensidad sigue a la del sistema
// (`prefers-reduced-motion`), también si cambia con la página abierta. Es un radio más para poder
// volver a eso después de elegir.
const SYSTEM_MOTION = "sistema";
const MOTION_CHOICES = [SYSTEM_MOTION, ...MOTION_LEVELS] as const;
const MOTION_NAMES: Record<(typeof MOTION_CHOICES)[number], string> = {
  sistema: "Sistema",
  completa: "Completa",
  reducida: "Reducida",
};

/** El rótulo de un campo o de una parte de un diálogo: chico, espaciado y en mayúsculas. */
export const FIELD_LABEL =
  "font-mono text-[0.6875rem] tracking-[0.16em] text-muted-foreground uppercase";

// Los radios siguen siendo <input> nativos (el teclado, el formulario y el lector de pantalla no
// cambian), pero no se ven: cada opción es una casilla de una fila partida, y la elegida se llena
// de tinta. El foco del radio se dibuja en su casilla (`has-focus-visible`). En el modo de alto
// contraste del sistema, donde los fondos no se pintan, la elegida va subrayada (sin probar).
const CHOICE =
  "relative -ml-px flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 border border-foreground/40 px-2 text-sm whitespace-nowrap transition-colors first:ml-0 first:rounded-l-sm last:rounded-r-sm hover:bg-muted has-checked:z-1 has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:z-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring pointer-coarse:h-11 forced-colors:has-checked:underline";

// La casilla también es nativa, con el aspecto de la hoja: un borde de tinta y, marcada, el color
// del HUD con un anillo del papel adentro. shrink-0 para que la fila no la achique cuando el texto
// de al lado se parte en dos líneas. En alto contraste vuelve el control nativo (sin probar).
const CHECKBOX_INPUT =
  "size-4 shrink-0 appearance-none rounded-sm border border-foreground/60 bg-background checked:border-hud checked:bg-hud checked:inset-ring-3 checked:inset-ring-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring forced-colors:appearance-auto";

const COLOR_NAMES: Record<HudColor, string> = {
  verde: "Verde",
  ambar: "Ámbar",
  cian: "Cian",
};

// Cada color con su clase entera: Tailwind solo genera las clases que encuentra escritas.
const COLOR_SWATCHES: Record<HudColor, string> = {
  verde: "bg-hud-verde",
  ambar: "bg-hud-ambar",
  cian: "bg-hud-cian",
};

interface ShiftFormProps {
  /** Los ajustes con los que arranca el formulario. */
  initial: ShiftSettings;
  /** El texto del botón que confirma: "Guardar" o "Iniciar turno". */
  submitLabel: string;
  onSubmit: (settings: ShiftSettings) => void;
  /** Otros botones, junto al principal. */
  children?: ReactNode;
}

export function ShiftForm({
  initial,
  submitLabel,
  onSubmit,
  children,
}: ShiftFormProps) {
  const nameId = useId();
  const motion = initial.motion ?? SYSTEM_MOTION;

  // Los campos no se controlan: el formulario se lee entero al confirmar. Un nombre vacío vuelve
  // al de por defecto.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const operator = data.get("operator");
    const hud = data.get("hud");
    const chosen = data.get("motion");
    onSubmit({
      operator:
        (typeof operator === "string" && operator.trim()) ||
        DEFAULT_SETTINGS.operator,
      hud: isHudColor(hud) ? hud : DEFAULT_SETTINGS.hud,
      sound: data.get("sound") === "on",
      // "Como el sistema" no es un nivel: queda null.
      motion: isMotionLevel(chosen) ? chosen : null,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor={nameId} className={FIELD_LABEL}>
          Nombre en clave
        </label>
        <input
          id={nameId}
          name="operator"
          defaultValue={initial.operator}
          placeholder={DEFAULT_SETTINGS.operator}
          maxLength={OPERATOR_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          className="h-10 rounded-sm border border-foreground/40 bg-background px-3 font-mono text-base text-foreground placeholder:text-muted-foreground hover:border-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:text-sm pointer-coarse:h-11"
        />
      </div>
      <fieldset>
        <legend className={`mb-2 ${FIELD_LABEL}`}>Color del HUD</legend>
        <div className="flex">
          {HUD_COLORS.map((color) => (
            <label key={color} className={CHOICE}>
              <input
                type="radio"
                name="hud"
                value={color}
                defaultChecked={initial.hud === color}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`size-3 rounded-full ring-1 ring-background ${COLOR_SWATCHES[color]}`}
              />
              {COLOR_NAMES[color]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={`mb-2 ${FIELD_LABEL}`}>Intensidad visual</legend>
        <div className="flex">
          {MOTION_CHOICES.map((level) => (
            <label key={level} className={CHOICE}>
              <input
                type="radio"
                name="motion"
                value={level}
                defaultChecked={motion === level}
                className="sr-only"
              />
              {MOTION_NAMES[level]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-2.5 border-y border-border py-3 text-sm">
        <input
          type="checkbox"
          name="sound"
          defaultChecked={initial.sound}
          className={CHECKBOX_INPUT}
        />
        Sonido: el ping del radar y el grito de cada Pokémon
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        {children}
        <Button type="submit" variant="solid" className="min-w-32">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
