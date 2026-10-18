import { useState } from "react";
import CampoPassword from "../components/CampoPassword";
import "../styles/auth.css";
import {
  Link,
  useNavigate,
} from "react-router";

import {
  registrarUsuario,
} from "../services/api";

const Registro = () => {
  const navigate = useNavigate();

  const [nombre, setNombre] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

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
      !nombre ||
      !email ||
      !password ||
      !repetirPassword
    ) {
      setError(
        "Completá todos los campos."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (
      password !== repetirPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );
      return;
    }

    try {
      setCargando(true);

      await registrarUsuario(
        nombre,
        email,
        password
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      setError(
        error.message ||
          "No se pudo crear la cuenta"
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
            Crear cuenta
          </h1>

          <p>
            Registrate para empezar
            a organizar tus gastos.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          <div>

            <label
              htmlFor="nombre"
              className="campo-label"
            >
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              className="campo-input"
              value={nombre}
              autoComplete="name"
              onChange={(event) =>
                setNombre(
                  event.target.value
                )
              }
              required
            />

          </div>

          <div>

            <label
              htmlFor="email"
              className="campo-label"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              className="campo-input"
              value={email}
              autoComplete="email"
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />

          </div>

          <div>

            <label
              htmlFor="password"
              className="campo-label"
            >
              Contraseña
            </label>

            <CampoPassword
              id="password"
              value={password}
              autoComplete="new-password"
              onChange={(event) =>
                setPassword(
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
              Repetir contraseña
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
              ? "Creando cuenta..."
              : "Crear cuenta"}
          </button>

          <p className="login-registro">
            ¿Ya tenés una cuenta?{" "}
            <Link to="/login">
              Iniciar sesión
            </Link>
          </p>

        </form>

      </section>

    </main>
  );
};

export default Registro;