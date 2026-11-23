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

  // Sesión vencida en una pantalla privada: volver al login.
  // Las rutas /auth/* manejan su propio 401 (login, verificación).
  if (
    response.status === 401 &&
    !ruta.startsWith("/auth/")
  ) {
    window.location.assign(
      "/login?expirada=1"
    );
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


// LISTAR ORÍGENES ACTIVOS

export const obtenerOrigenes =
  async () => {
    return await apiFetch(
      "/origenes"
    );
  };


// RENOMBRAR ORIGEN

export const actualizarOrigen =
  async (
    id,
    nombre
  ) => {
    return await apiFetch(
      `/origenes/${id}`,
      {
        method: "PUT",

        body: JSON.stringify({
          nombre,
        }),
      }
    );
  };


// ELIMINAR (DESACTIVAR) ORIGEN

export const eliminarOrigen =
  async (
    id
  ) => {
    return await apiFetch(
      `/origenes/${id}`,
      {
        method: "DELETE",
      }
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


// VENCIMIENTO DEL MES DE UN ORIGEN ("AAAA-MM-DD" o null)

export const obtenerVencimiento =
  async (origenId, anio, mes) => {
    const { fecha } = await apiFetch(
      `/gastos/vencimiento?origenId=${origenId}&anio=${anio}&mes=${mes}`
    );

    return fecha;
  };


// CARGAR CUOTAS SIGUIENTES
// (las cuotas que faltan de los gastos en cuotas del mes)

export const cargarCuotasSiguientes =
  async (origenId, anio, mes) => {
    return await apiFetch(
      "/gastos/cuotas-siguientes",
      {
        method: "POST",

        body: JSON.stringify({
          origenId,
          anio,
          mes,
        }),
      }
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


// RENOMBRAR CATEGORÍA

export const actualizarCategoria =
  async (
    id,
    nombre
  ) => {
    return await apiFetch(
      `/categorias/${id}`,
      {
        method: "PUT",

        body: JSON.stringify({
          nombre,
        }),
      }
    );
  };


// ELIMINAR (DESACTIVAR) CATEGORÍA

export const eliminarCategoria =
  async (
    id
  ) => {
    return await apiFetch(
      `/categorias/${id}`,
      {
        method: "DELETE",
      }
    );
  };

// ===================================
// INGRESOS
// ===================================


// OBTENER INGRESOS MENSUALES

export const obtenerIngresosMensuales =
  async (
    anio,
    mes
  ) => {
    return await apiFetch(
      `/ingresos?anio=${anio}&mes=${mes}`
    );
  };


// GUARDAR CAMBIOS DE INGRESOS

export const guardarCambiosIngresos =
  async (
    cambios
  ) => {
    return await apiFetch(
      "/ingresos/cambios",
      {
        method: "POST",

        body: JSON.stringify(
          cambios
        ),
      }
    );
  };


// ===================================
// AHORROS
// ===================================


// OBTENER AHORROS DEL MES (y acumulado anterior)

export const obtenerAhorrosMensuales =
  async (
    anio,
    mes
  ) => {
    return await apiFetch(
      `/ahorros?anio=${anio}&mes=${mes}`
    );
  };


// GUARDAR CAMBIOS DE AHORROS

export const guardarCambiosAhorros =
  async (
    cambios
  ) => {
    return await apiFetch(
      "/ahorros/cambios",
      {
        method: "POST",

        body: JSON.stringify(
          cambios
        ),
      }
    );
  };
