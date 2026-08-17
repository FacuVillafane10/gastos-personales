import { useState } from "react";
import { Link } from "react-router";

import {
  solicitarRecuperacionPassword,
} from "../services/api";

import "../styles/auth.css";

const OlvidePassword = () => {
  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (!email.trim()) {
      setError(
        "Ingresá tu correo electrónico."
      );

      return;
    }

    try {
      setCargando(true);

      const resultado =
        await solicitarRecuperacionPassword(
          email
        );

      setMensaje(
        resultado?.message ||
          "Si existe una cuenta asociada a ese email, recibirás instrucciones para restablecer tu contraseña."
      );

      setEmail("");

    } catch (error) {
      setError(
        error.message ||
          "No se pudo procesar la solicitud"
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
            Recuperar contraseña
          </h1>

          <p>
            Ingresá el email asociado
            a tu cuenta y te enviaremos
            las instrucciones para
            crear una nueva contraseña.
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
              placeholder="nombre@email.com"
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

          {error && (
            <p className="mensaje error">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="mensaje-recuperacion-exito">
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            className="boton-guardar login-boton"
            disabled={cargando}
          >
            {cargando
              ? "Enviando..."
              : "Recuperar contraseña"}
          </button>

          <Link
            to="/login"
            className="volver-inicio"
          >
            ← Volver a iniciar sesión
          </Link>

        </form>

      </section>

    </main>
  );
};

export default OlvidePassword;