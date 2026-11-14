"use client";

// Dialog de shadcn (base Base UI), recortado a lo que usan los ajustes del turno y el inicio de
// turno, y con el aspecto del HUD: superficie del HUD con borde, sin esquinas redondeadas grandes.
// Base UI se encarga del foco (queda adentro y vuelve al cerrar), de Esc y de aria-modal. Con
// movimiento reducido, la regla de globals.css apaga el fundido.
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
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-background/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-(--spacing(6)))] -translate-1/2 gap-4 rounded-md border border-border bg-card p-4 text-sm text-card-foreground outline-none sm:max-w-sm",
          "transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
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
                className="absolute top-2 right-2"
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
        "font-mono text-xs tracking-widest text-hud uppercase",
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
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogTitle };
