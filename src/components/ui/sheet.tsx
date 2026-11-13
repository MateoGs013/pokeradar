"use client";

// Sheet de shadcn (base Base UI: un Dialog pegado a un borde), recortado a lo que usa la ficha en
// escritorio: un panel a la derecha que entra deslizándose. El fondo apenas oscurece el mapa,
// para que la señal se siga viendo al costado del panel.
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root {...props} />;
}

function SheetContent({
  className,
  children,
  ...props
}: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop className="fixed inset-0 z-50 bg-background/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <SheetPrimitive.Popup
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-card text-card-foreground outline-none",
          "transition duration-200 ease-out data-ending-style:translate-x-full data-starting-style:translate-x-full",
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle(props: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title {...props} />;
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetTitle };
