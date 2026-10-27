import { useEffect } from "react";

// Avisa al cerrar o recargar la pestaña mientras haya cambios sin guardar.
export const useAvisoAlCerrar = (hayCambios) => {
  useEffect(() => {
    if (!hayCambios) return undefined;

    const avisar = (event) => {
      event.preventDefault();

      // Necesario en algunos navegadores para mostrar el aviso
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", avisar);

    return () =>
      window.removeEventListener(
        "beforeunload",
        avisar
      );
  }, [hayCambios]);
};
