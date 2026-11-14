"use client";

// Toast de shadcn (base Base UI), recortado a lo que usan los avisos de la tripulación y con el
// aspecto del HUD. En lugar de la pila con perspectiva del registro (cada aviso encogido detrás del
// anterior, con transformaciones calculadas), los avisos van en una columna: se leen todos y no
// hay valores sueltos. Base UI se encarga de la región viva (los de prioridad alta se anuncian como
// alerta), del tiempo de cada aviso, de pausarlo con el mouse o el foco encima, y de F6 para llegar
// con teclado. Con movimiento reducido, la regla de globals.css apaga el fundido.
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "cn";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;
const ToastProvider = ToastPrimitive.Provider;

/** La región de los avisos. Base UI la nombra en inglés ("Notifications"): acá va en castellano. */
function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      aria-label="Avisos de la tripulación"
      className={cn("flex flex-col gap-2 outline-none", className)}
      {...props}
    />
  );
}

/**
 * Un aviso. Base UI le da role="dialog" (o "alertdialog" si es de prioridad alta): quien busque los
 * diálogos de verdad (la ficha, los ajustes) los separa por `data-slot="toast"`.
 */
function Toast({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "rounded-md border border-border bg-card text-card-foreground transition-opacity duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-ending-style:opacity-0 data-limited:hidden data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Content>) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn("flex items-start gap-2 p-2", className)}
      {...props}
    />
  );
}

function ToastTitle({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        "font-mono text-xs tracking-widest text-hud uppercase",
        className,
      )}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-card-foreground", className)}
      {...props}
    />
  );
}

/** El botón de la acción del aviso: lo arma Base UI con `actionProps` del aviso. */
function ToastAction({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={<Button />}
      className={cn("mt-1.5", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Cerrar aviso"
      render={<Button variant="ghost" size="icon" />}
      className={cn("shrink-0 text-muted-foreground", className)}
      {...props}
    >
      <XIcon aria-hidden />
    </ToastPrimitive.Close>
  );
}

export {
  createToastManager,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToastManager,
};
