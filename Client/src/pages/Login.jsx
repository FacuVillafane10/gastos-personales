import { useState } from "react";
import { useNavigate } from "react-router";
import "../styles/auth.css";
import {
  iniciarSesion,
} from "../services/api";
import { Link } from "react-router";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setCargando(true);
      setError("");

      await iniciarSesion(
        email,
        password
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setError(
        error.message ||
          "No se pudo iniciar sesión"
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

          <h1>Iniciar sesión</h1>

          <p>
            Ingresá para acceder a tus gastos.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

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

            <input
              id="password"
              type="password"
              className="campo-input"
              value={password}
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(
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
            <div className="login-recuperar">
            <Link to="/olvide-password">
                ¿Olvidaste tu contraseña?
            </Link>
            </div>
            {cargando
              ? "Ingresando..."
              : "Ingresar"}
          </button>

          
<Link to="/registro">
  Crear una cuenta
</Link>              
        </form>

      </section>

    </main>
  );
};

export default Login;