"use client";

// Drawer de shadcn (base Base UI), recortado a lo que usa la ficha en el celular: un panel abajo
// que se cierra deslizándolo hacia abajo. Sin cajones anidados, puntos de anclaje ni las otras
// direcciones del original.
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "cn";

function Drawer(props: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root swipeDirection="down" {...props} />;
}

function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Portal>
      {/* Se aclara a medida que se desliza el panel (--drawer-swipe-progress va de 0 a 1). */}
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-background/30 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 flex flex-col rounded-t-xl border-t border-border bg-card text-card-foreground outline-none",
            // Sigue al dedo mientras se desliza (--drawer-swipe-movement-y), y entra y sale por abajo.
            "translate-y-[var(--drawer-swipe-movement-y,0px)] transition-transform duration-300 ease-out data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:duration-0",
            className,
          )}
          {...props}
        >
          {/* La manija: muestra que el panel se puede deslizar. */}
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-muted"
          />
          {/* Un arrastre con el mouse que empieza acá selecciona texto y no desliza el panel
              (Base UI, drawer/viewport/DrawerViewport.js). */}
          <DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function DrawerTitle(props: DrawerPrimitive.Title.Props) {
  return <DrawerPrimitive.Title {...props} />;
}

function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close {...props} />;
}

export { Drawer, DrawerClose, DrawerContent, DrawerTitle };
