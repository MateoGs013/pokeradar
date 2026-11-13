// Button de shadcn (base Base UI), recortado a las dos variantes que se usan y con el aspecto del
// HUD: monoespaciada en mayúsculas y el mismo foco que las señales.
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border font-mono text-xs tracking-widest whitespace-nowrap uppercase transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Una acción con texto, como Reintentar. */
        outline: "border-hud/40 text-hud hover:bg-hud/10",
        /** Un ícono sin borde, como cerrar. */
        ghost:
          "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "h-8 px-3",
        icon: "size-8",
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
