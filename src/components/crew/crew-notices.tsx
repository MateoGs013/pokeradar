"use client";

// Los avisos de la tripulación (docs/concepto.md, "La tripulación"): cada uno con el sprite de quien
// avisa, su nombre y una prioridad. Van arriba a la derecha, debajo de la hora: abajo están el
// control de las antenas y, en el celular, la ficha. Un aviso se cierra solo a los 5 s (Base UI lo
// pausa con el mouse o el foco encima), con su botón o, según Base UI, deslizándolo (sin probar).
import Image from "next/image";

import {
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
} from "@/components/ui/toast";

import { CREW, type CrewMember, type NoticePriority } from "./crew";

interface NoticeData {
  member: CrewMember;
}

// Uno solo para toda la sala: la sala avisa desde sus manejadores, fuera del árbol de los avisos.
const notices = createToastManager<NoticeData>();

// La franja de la izquierda dice la prioridad: el informativo, tinta tenue (la de ui/toast.tsx); la
// alerta, el color del HUD; el crítico, el de peligro, que también toma el borde. Las dos últimas
// llevan además su nombre escrito al lado de quien avisa: el color solo no alcanza.
const PRIORITY_MARK: Record<NoticePriority, string> = {
  informativo: "",
  alerta: "before:bg-hud",
  critico: "border-destructive before:bg-destructive",
};
const PRIORITY_NAME: Record<NoticePriority, string | null> = {
  informativo: null,
  alerta: "Alerta",
  critico: "Crítico",
};

interface Notice {
  member: CrewMember;
  priority: NoticePriority;
  text: string;
  /**
   * Con el mismo id, el aviso que sigue abierto se actualiza en lugar de sumar otro (los de
   * Pelipper, mientras el radar sigue detectando).
   */
  id?: string;
  /** Un botón en el aviso, por ejemplo para abrir la señal de la que habla. */
  action?: { label: string; onClick: () => void };
  /** Cuando el aviso se cierra, por tiempo o a mano. */
  onClose?: () => void;
}

export function notify({
  member,
  priority,
  text,
  id,
  action,
  onClose,
}: Notice) {
  notices.add({
    id,
    title: CREW[member].name,
    description: text,
    type: priority,
    priority: priority === "critico" ? "high" : "low",
    data: { member },
    actionProps: action && { children: action.label, onClick: action.onClick },
    onClose,
  });
}

/** Cierra todos los avisos abiertos: al silenciarlos. */
export function closeNotices() {
  notices.close();
}

function NoticeList() {
  const { toasts } = useToastManager<NoticeData>();
  return toasts.map((toast) => {
    const member = toast.data?.member;
    const priority = isPriority(toast.type) ? toast.type : "informativo";
    return (
      <Toast key={toast.id} toast={toast} className={PRIORITY_MARK[priority]}>
        <ToastContent>
          {member && (
            <Image
              src={CREW[member].sprite}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="size-10 shrink-0 border border-border bg-background [image-rendering:pixelated] md:size-12"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <ToastTitle />
              {PRIORITY_NAME[priority] && (
                <span
                  className={`font-mono text-[0.625rem] tracking-wider uppercase ${priority === "critico" ? "text-destructive" : "text-foreground"}`}
                >
                  {PRIORITY_NAME[priority]}
                </span>
              )}
            </div>
            <ToastDescription />
            <ToastAction />
          </div>
          <ToastClose />
        </ToastContent>
      </Toast>
    );
  });
}

function isPriority(value: unknown): value is NoticePriority {
  return value === "informativo" || value === "alerta" || value === "critico";
}

/**
 * La región de los avisos. Desde md va a la izquierda del lugar de la ficha, para no tapar su
 * encabezado cuando está abierta. De arriba:
 * - hasta lg va debajo del panel del turno, que llega a 126 px (medido de 320 a 767 de ancho, con
 *   el nombre de operador más largo) o a 118 (a 768): los avisos empiezan a 136;
 * - desde lg el panel del turno está en la columna de la hoja y los avisos van sobre la lámina, a
 *   60 px de arriba: 12 debajo de su borde. A 1024, con la ficha abierta, empiezan en 332, a la
 *   derecha de la columna, que termina en 328 (medido).
 * Va sin portal, dentro de la sala: así le llega `--panel-width`, que page.tsx define en el <main>.
 */
export function CrewNotices() {
  return (
    <ToastProvider toastManager={notices} limit={3}>
      <ToastViewport className="fixed top-34 right-3 z-20 w-80 max-w-[calc(100%-(--spacing(6)))] md:right-[calc(var(--panel-width)+(--spacing(3)))] lg:top-15">
        <NoticeList />
      </ToastViewport>
    </ToastProvider>
  );
}
