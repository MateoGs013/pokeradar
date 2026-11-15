// Button de shadcn (base Base UI), recortado a las tres variantes que se usan y con el aspecto de la
// hoja: monoespaciada en mayúsculas, esquinas casi rectas y el mismo foco que las señales. Hay una
// sola acción llena por panel (la que hace avanzar el turno); el resto va con borde de tinta, que
// se llena de tinta al pasar el puntero. Al apretar, el botón baja 1 px. Con un puntero grueso (un
// dedo) mide 44 px de alto; con mouse, 36. Quedan más chicos, también al tacto, la campana y los
// ajustes de la esquina de la hora (36, para que entren al lado del título en el celular) y la cruz
// y la acción de un aviso (32 y 40).
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-sm border font-mono text-xs tracking-wider whitespace-nowrap uppercase transition-[color,background-color,border-color,transform] duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** La acción principal de un panel: Instalar antena, Guardar, Iniciar turno. */
        solid:
          "border-hud bg-hud font-medium text-background hover:border-foreground hover:bg-foreground aria-pressed:border-foreground aria-pressed:bg-foreground",
        /** Una acción con texto, como Reintentar. */
        outline:
          "border-foreground/50 text-foreground hover:border-foreground hover:bg-foreground hover:text-background",
        /** Un ícono sin borde, como cerrar, o una acción de menos peso. */
        ghost:
          "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:text-foreground",
      },
      size: {
        default: "h-9 px-3.5 pointer-coarse:h-11",
        icon: "size-9 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
