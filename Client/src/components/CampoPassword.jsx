import { useState } from "react";

const IconoOjo = ({ tachado }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {tachado && <path d="M4 4l16 16" />}
  </svg>
);

const CampoPassword = (props) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="campo-password">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className="campo-input"
      />

      <button
        type="button"
        className="boton-ver-password"
        onClick={() => setVisible((v) => !v)}
        aria-label={
          visible
            ? "Ocultar contraseña"
            : "Mostrar contraseña"
        }
        aria-pressed={visible}
        title={
          visible
            ? "Ocultar contraseña"
            : "Mostrar contraseña"
        }
      >
        <IconoOjo tachado={visible} />
      </button>
    </div>
  );
};

export default CampoPassword;
