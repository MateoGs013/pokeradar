"use client";

// Dialog de shadcn (base Base UI), recortado a lo que usan los ajustes del turno y el inicio de
// turno, y con el aspecto de la hoja: una tarjeta de papel con borde de tinta, esquinas casi rectas
// y una sombra, que al abrirse sube 8 px mientras aparece. El título lleva un filete debajo.
// Base UI se encarga del foco (queda adentro y vuelve al cerrar), de Esc y de aria-modal. Con
// movimiento reducido, la regla de globals.css apaga la transición (medido con el fundido de antes,
// de 150 ms; con la entrada de ahora, de 200 ms y con desplazamiento, está sin medir).
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** La cruz de arriba a la derecha. El inicio de turno no la lleva: tiene "Saltar". */
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-scrim/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-(--spacing(6)))] w-full max-w-[calc(100%-(--spacing(6)))] -translate-1/2 gap-5 overflow-y-auto overscroll-contain rounded-sm border border-foreground/60 bg-card p-5 text-sm text-card-foreground shadow-[0_28px_60px_-28px_var(--hud-scrim)] outline-none sm:max-w-sm",
          "transition-[opacity,translate] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:-translate-y-[calc(50%-8px)] data-starting-style:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3"
              />
            }
          >
            <XIcon aria-hidden />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "border-b border-foreground/30 pr-10 pb-3 font-poster text-4xl leading-none font-black text-balance text-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn("-mt-2 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogTitle };
