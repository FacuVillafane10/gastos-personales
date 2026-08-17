import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
} from "react-router";

import {
  obtenerUsuarioActual,
} from "../services/api";

const RutaProtegida = ({
  children,
}) => {
  const [estado, setEstado] =
    useState("cargando");

  useEffect(() => {
    const verificarSesion =
      async () => {
        try {
          await obtenerUsuarioActual();

          setEstado(
            "autenticado"
          );
        } catch {
          setEstado(
            "no-autenticado"
          );
        }
      };

    verificarSesion();
  }, []);

  if (estado === "cargando") {
    return (
      <p className="mensaje">
        Verificando sesión...
      </p>
    );
  }

  if (
    estado === "no-autenticado"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};

export default RutaProtegida;