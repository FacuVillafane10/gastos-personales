import { useState } from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";

import {
  restablecerPassword,
} from "../services/api";

import "../styles/auth.css";

const RestablecerPassword = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const token =
    searchParams.get("token");

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

    if (!token) {
      setError(
        "El enlace de recuperación es inválido."
      );

      return;
    }

    if (
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
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    if (
      passwordNueva !==
      repetirPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    try {
      setCargando(true);

      await restablecerPassword(
        token,
        passwordNueva
      );

      navigate(
        "/login",
        {
          replace: true,

          state: {
            mensaje:
              "Contraseña restablecida correctamente. Ya podés iniciar sesión con tu nueva contraseña.",
          },
        }
      );

    } catch (error) {
      setError(
        error.message ||
          "No se pudo restablecer la contraseña"
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
            CONTROL DE GASTOS
          </p>

          <h1>
            Nueva contraseña
          </h1>

          <p>
            Elegí una nueva contraseña
            para volver a acceder
            a tu cuenta.
          </p>

        </div>

        {!token ? (

          <div>

            <p className="mensaje error">
              El enlace de recuperación
              es inválido o está incompleto.
            </p>

            <Link
              to="/olvide-password"
              className="volver-inicio"
            >
              Solicitar un nuevo enlace
            </Link>

          </div>

        ) : (

          <form
            onSubmit={handleSubmit}
            className="login-form"
          >

            <div>

              <label
                htmlFor="passwordNueva"
                className="campo-label"
              >
                Nueva contraseña
              </label>

              <input
                id="passwordNueva"
                type="password"
                className="campo-input"
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

              <input
                id="repetirPassword"
                type="password"
                className="campo-input"
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
                ? "Guardando..."
                : "Guardar nueva contraseña"}
            </button>

            <Link
              to="/login"
              className="volver-inicio"
            >
              ← Volver al login
            </Link>

          </form>

        )}

      </section>

    </main>
  );
};

export default RestablecerPassword;