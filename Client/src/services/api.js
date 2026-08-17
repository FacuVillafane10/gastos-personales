const API_URL = import.meta.env.VITE_API_URL;


// ===================================
// FUNCIÓN GENERAL PARA LA API
// ===================================

const apiFetch = async (
  ruta,
  opciones = {}
) => {
  const response = await fetch(
    `${API_URL}${ruta}`,
    {
      ...opciones,

      // Envía la cookie HttpOnly
      // al backend
      credentials: "include",

      headers: {
        ...(opciones.body && {
          "Content-Type":
            "application/json",
        }),

        ...opciones.headers,
      },
    }
  );

  let data = null;

  const contentType =
    response.headers.get(
      "content-type"
    );

  if (
    contentType &&
    contentType.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(
      data?.error ||
        "Ocurrió un error al comunicarse con el servidor"
    );

    error.status =
      response.status;

    throw error;
  }

  return data;
};


// ===================================
// AUTENTICACIÓN
// ===================================


// REGISTRAR USUARIO

export const registrarUsuario =
  async (
    nombre,
    email,
    password
  ) => {
    return await apiFetch(
      "/auth/register",
      {
        method: "POST",

        body: JSON.stringify({
          nombre,
          email,
          password,
        }),
      }
    );
  };


// INICIAR SESIÓN

export const iniciarSesion =
  async (
    email,
    password
  ) => {
    return await apiFetch(
      "/auth/login",
      {
        method: "POST",

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );
  };


// OBTENER USUARIO ACTUAL

export const obtenerUsuarioActual =
  async () => {
    return await apiFetch(
      "/auth/me"
    );
  };


// CERRAR SESIÓN

export const cerrarSesion =
  async () => {
    return await apiFetch(
      "/auth/logout",
      {
        method: "POST",
      }
    );
  };


// CAMBIAR CONTRASEÑA

export const cambiarPassword =
  async (
    passwordActual,
    passwordNueva
  ) => {
    return await apiFetch(
      "/auth/password",
      {
        method: "PATCH",

        body: JSON.stringify({
          passwordActual,
          passwordNueva,
        }),
      }
    );
  };

// SOLICITAR RECUPERACIÓN DE CONTRASEÑA

export const solicitarRecuperacionPassword =
  async (email) => {
    return await apiFetch(
      "/auth/forgot-password",
      {
        method: "POST",

        body: JSON.stringify({
          email,
        }),
      }
    );
  };


// RESTABLECER CONTRASEÑA

export const restablecerPassword =
  async (
    token,
    passwordNueva
  ) => {
    return await apiFetch(
      "/auth/reset-password",
      {
        method: "POST",

        body: JSON.stringify({
          token,
          passwordNueva,
        }),
      }
    );
  };
  
// ===================================
// RESUMEN
// ===================================

export const obtenerResumenMensual =
  async (
    anio,
    mes
  ) => {
    return await apiFetch(
      `/resumen?anio=${anio}&mes=${mes}`
    );
  };


// ===================================
// ORÍGENES
// ===================================


// CREAR ORIGEN

export const crearOrigen =
  async (
    nombre
  ) => {
    return await apiFetch(
      "/origenes",
      {
        method: "POST",

        body: JSON.stringify({
          nombre,
        }),
      }
    );
  };


// OBTENER ORIGEN

export const obtenerOrigen =
  async (
    id
  ) => {
    return await apiFetch(
      `/origenes/${id}`
    );
  };


// ===================================
// GASTOS
// ===================================


// OBTENER GASTOS MENSUALES

export const obtenerGastosMensuales =
  async (
    origenId,
    anio,
    mes
  ) => {
    return await apiFetch(
      `/gastos?origenId=${origenId}&anio=${anio}&mes=${mes}`
    );
  };


// GUARDAR CAMBIOS DE GASTOS

export const guardarCambiosGastos =
  async (
    origenId,
    cambios
  ) => {
    return await apiFetch(
      "/gastos/cambios",
      {
        method: "POST",

        body: JSON.stringify({
          origenId,
          ...cambios,
        }),
      }
    );
  };


// ===================================
// CATEGORÍAS
// ===================================


// OBTENER CATEGORÍAS

export const obtenerCategorias =
  async () => {
    return await apiFetch(
      "/categorias"
    );
  };


// CREAR CATEGORÍA

export const crearCategoria =
  async (
    nombre
  ) => {
    return await apiFetch(
      "/categorias",
      {
        method: "POST",

        body: JSON.stringify({
          nombre,
        }),
      }
    );
  };