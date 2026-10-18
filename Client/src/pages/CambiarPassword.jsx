import { useState } from "react";
import CampoPassword from "../components/CampoPassword";
import {
  Link,
  useNavigate,
} from "react-router";

import {
  cambiarPassword,
} from "../services/api";

const CambiarPassword = () => {
  const navigate = useNavigate();

  const [
    passwordActual,
    setPasswordActual,
  ] = useState("");

  const [
    passwordNueva,
    setPasswordNueva,
  ] = useState("");

  const [
    repetirPassword,
    setRepetirPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (
      !passwordActual ||
      !passwordNueva ||
      !repetirPassword
    ) {
      setError(
        "Completá todos los campos."
      );
      return;
    }

    if (passwordNueva.length < 6) {
      setError(
        "La nueva contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (
      passwordNueva !==
      repetirPassword
    ) {
      setError(
        "Las nuevas contraseñas no coinciden."
      );
      return;
    }

    if (
      passwordActual ===
      passwordNueva
    ) {
      setError(
        "La nueva contraseña debe ser diferente de la actual."
      );
      return;
    }

    try {
      setCargando(true);

      await cambiarPassword(
        passwordActual,
        passwordNueva
      );

      navigate(
        "/login",
        {
          replace: true,

          state: {
            mensaje:
              "Contraseña actualizada correctamente. Iniciá sesión con tu nueva contraseña.",
          },
        }
      );

    } catch (error) {
      setError(
        error.message ||
          "No se pudo cambiar la contraseña"
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">

      <section className="login-card">

        <div className="login-header">

          <p className="dashboard-label">
            MI CUENTA
          </p>

          <h1>
            Cambiar contraseña
          </h1>

          <p>
            Por seguridad, tendrás que
            iniciar sesión nuevamente
            después del cambio.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          <div>

            <label
              htmlFor="passwordActual"
              className="campo-label"
            >
              Contraseña actual
            </label>

            <CampoPassword
              id="passwordActual"
              value={passwordActual}
              autoComplete="current-password"
              onChange={(event) =>
                setPasswordActual(
                  event.target.value
                )
              }
              required
            />

          </div>

          <div>

            <label
              htmlFor="passwordNueva"
              className="campo-label"
            >
              Nueva contraseña
            </label>

            <CampoPassword
              id="passwordNueva"
              value={passwordNueva}
              autoComplete="new-password"
              onChange={(event) =>
                setPasswordNueva(
                  event.target.value
                )
              }
              required
            />

          </div>

          <div>

            <label
              htmlFor="repetirPassword"
              className="campo-label"
            >
              Repetir nueva contraseña
            </label>

            <CampoPassword
              id="repetirPassword"
              value={repetirPassword}
              autoComplete="new-password"
              onChange={(event) =>
                setRepetirPassword(
                  event.target.value
                )
              }
              required
            />

          </div>

          {error && (
            <p className="mensaje error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="boton-guardar login-boton"
            disabled={cargando}
          >
            {cargando
              ? "Cambiando..."
              : "Cambiar contraseña"}
          </button>

          <Link to="/">
            Volver al inicio
          </Link>

        </form>

      </section>

    </main>
  );
};

export default CambiarPassword;