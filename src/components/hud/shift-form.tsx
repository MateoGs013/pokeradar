"use client";

// El formulario del turno: el nombre en clave y el color del HUD. Lo usan los ajustes del HUD y el
// inicio de turno; cada uno pone su botón principal y, si hace falta, otros (como "Saltar").
import { type FormEvent, type ReactNode, useId } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SETTINGS,
  HUD_COLORS,
  type HudColor,
  isHudColor,
  OPERATOR_MAX_LENGTH,
  type ShiftSettings,
} from "@/lib/shift";

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

  // Los campos no se controlan: el formulario se lee entero al confirmar. Un nombre vacío vuelve
  // al de por defecto.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const operator = data.get("operator");
    const hud = data.get("hud");
    onSubmit({
      operator:
        (typeof operator === "string" && operator.trim()) ||
        DEFAULT_SETTINGS.operator,
      hud: isHudColor(hud) ? hud : DEFAULT_SETTINGS.hud,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <label
          htmlFor={nameId}
          className="font-mono text-xs text-muted-foreground"
        >
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
          className="h-8 rounded-md border border-border bg-background px-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 font-mono text-xs text-muted-foreground">
          Color del HUD
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {HUD_COLORS.map((color) => (
            <label
              key={color}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="hud"
                value={color}
                defaultChecked={initial.hud === color}
                className="size-4 accent-hud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <span
                aria-hidden
                className={`size-3 rounded-full ${COLOR_SWATCHES[color]}`}
              />
              {COLOR_NAMES[color]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2">
        {children}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
