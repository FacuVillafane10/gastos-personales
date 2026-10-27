// Modal que aparece al intentar salir de una pantalla con cambios
// sin guardar.
const ConfirmarSalida = ({
  guardando,
  onGuardar,
  onSalir,
  onCancelar,
}) => (
  <div className="modal-overlay">

    <div
      className="modal"
      role="alertdialog"
      aria-labelledby="tituloConfirmarSalida"
    >

      <div className="modal-header">

        <div>

          <span className="modal-label">
            CAMBIOS SIN GUARDAR
          </span>

          <h2 id="tituloConfirmarSalida">
            ¿Querés guardar antes de salir?
          </h2>

        </div>

      </div>

      <p className="modal-ayuda">
        Si salís sin guardar, se pierden los
        cambios que hiciste en esta pantalla.
      </p>

      <div className="modal-acciones confirmar-salida-acciones">

        <button
          type="button"
          className="boton-cancelar"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="boton-cancelar boton-descartar"
          onClick={onSalir}
          disabled={guardando}
        >
          Salir sin guardar
        </button>

        <button
          type="button"
          className="boton-guardar"
          onClick={onGuardar}
          disabled={guardando}
        >
          {guardando
            ? "Guardando..."
            : "Guardar y salir"}
        </button>

      </div>

    </div>

  </div>
);

export default ConfirmarSalida;
