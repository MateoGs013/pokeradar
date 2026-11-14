"use client";

// Los avisos de la tripulación (docs/concepto.md, "La tripulación"): cada uno con el sprite de quien
// avisa, su nombre y una prioridad. Van arriba a la derecha, debajo de la hora: abajo están el
// control de las antenas y, en el celular, la ficha. Un aviso se cierra solo a los 5 s (Base UI lo
// pausa con el mouse o el foco encima), con su botón, o deslizándolo.
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

// El borde dice la prioridad: el informativo, como cualquier superficie del HUD; la alerta, con el
// color del HUD; el crítico, con el de peligro.
const PRIORITY_BORDER: Record<NoticePriority, string> = {
  informativo: "",
  alerta: "border-hud",
  critico: "border-destructive",
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
      <Toast key={toast.id} toast={toast} className={PRIORITY_BORDER[priority]}>
        <ToastContent>
          {member && (
            <Image
              src={CREW[member].sprite}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="shrink-0 [image-rendering:pixelated]"
            />
          )}
          <div className="min-w-0 flex-1">
            <ToastTitle />
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
 * La región de los avisos. En el celular va debajo del HUD de la izquierda, que en el caso peor
 * (el nombre más largo y el clima) llega hasta 112 px a 320 de ancho (medido): empiezan a 128; desde md, a la izquierda del lugar de la ficha, como
 * el HUD, para no tapar su encabezado cuando está abierta. Va sin portal, dentro de la sala: así le
 * llega `--panel-width`, que page.tsx define en el <main>.
 */
export function CrewNotices() {
  return (
    <ToastProvider toastManager={notices} limit={3}>
      <ToastViewport className="fixed top-32 right-3 z-20 w-80 max-w-[calc(100%-(--spacing(6)))] md:top-14 md:right-[calc(var(--panel-width)+(--spacing(3)))]">
        <NoticeList />
      </ToastViewport>
    </ToastProvider>
  );
}
