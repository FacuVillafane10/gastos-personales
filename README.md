# Control de Gastos Personales

Aplicación web para llevar las finanzas personales mes a mes: gastos por tarjeta o cuenta, cuotas, gastos fijos, ingresos y ahorros en pesos y dólares. Permite **importar el resumen PDF de la tarjeta de crédito** y carga los consumos automáticamente.

**Demo:** https://gastos-personales-phi-kohl.vercel.app

> El backend corre en el plan gratuito de Render: si estuvo inactivo, la primera carga puede tardar unos 30 segundos.

![Dashboard del mes](docs/dashboard.jpg)

![La app en el celular: dashboard, resumen por tarjeta y movimientos](docs/celular.jpg)

| ¿En qué se va la plata? y cuotas pendientes | Movimientos de una tarjeta |
|---|---|
| ![Gastos por categoría y cuotas pendientes](docs/graficos.jpg) | ![Movimientos con cuotas y gastos fijos](docs/movimientos.jpg) |

<sub>Capturas hechas con una cuenta de demostración y datos inventados.</sub>

## Funcionalidades

- **Dashboard mensual**: total gastado, pagado y pendiente, ingresos, disponible, gráfico por categoría, cuotas pendientes y próximos vencimientos.
- **Movimientos por origen** (cada tarjeta o cuenta): alta y edición en tabla, buscador, filtros, tilde de "pagado" y navegación entre meses.
- **Importación de resúmenes PDF** de tarjetas (Visa, Mastercard, Naranja X). El PDF se procesa en el navegador con pdf.js; se detectan consumos, cuotas, vencimiento y titulares adicionales, y el total se controla contra el del resumen.
- **Reglas de importación**: renombran y categorizan automáticamente las descripciones que se repiten, y sugieren la categoría según el historial.
- **Cuotas**: al cargar una compra en cuotas, las cuotas restantes se generan solas en los meses siguientes.
- **Gastos fijos**: los gastos marcados como fijos se cargan solos al abrir cada mes.
- **Ingresos y ahorros** en ARS y USD, con depósitos, retiros y compra de dólares.
- **Cuentas de usuario**: registro, login, cambio de contraseña y recuperación por mail.
- **Diseño adaptable**: en el celular las tablas pasan a tarjetas y la barra de guardado queda fija.

## Tecnologías

| Parte | Stack |
|---|---|
| Frontend | React 19, React Router, Vite, pdf.js |
| Backend | Node.js, Express 5, arquitectura en capas (rutas → controladores → servicios → repositorios) |
| Base de datos | PostgreSQL (Neon en producción) |
| Seguridad | JWT en cookie httpOnly, bcrypt, Helmet, CORS, límite de intentos (express-rate-limit) |
| Mails | Brevo (API) en producción, SMTP con Nodemailer en local |
| Despliegue | Vercel (frontend) y Render (API), con despliegue automático desde `main` |

En producción, Vercel reenvía `/api/*` hacia Render ([Client/vercel.json](Client/vercel.json)). Así la cookie de sesión queda en el mismo dominio que la app y funciona también en Safari/iPhone, que bloquea las cookies de terceros.

## Estructura

```
Client/                 Frontend (React + Vite)
  src/pages/            Pantallas (Dashboard, Movimientos, Ingresos, Ahorros, Administrar, login…)
  src/components/       Componentes reutilizables
  src/utils/resumenes/  Lectura de resúmenes PDF de tarjetas
  src/services/api.js   Cliente HTTP de la API
Server/                 Backend (Express)
  src/routes/           Endpoints /api/*
  src/controllers/      Manejo de la petición y la respuesta
  src/services/         Reglas de negocio y validaciones
  src/repositories/     Consultas SQL
  src/database/         Conexión, esquema y migraciones automáticas
```

## Cómo correrlo en local

Requisitos: Node.js 20 o superior y PostgreSQL.

**1. Base de datos**

```bash
createdb gastos_personales
psql -d gastos_personales -f Server/src/database/schema.sql
```

Las tablas más nuevas (vencimientos, gastos fijos, reglas, ahorros) las crea el servidor al arrancar.

**2. Backend**

```bash
cd Server
npm install
cp src/.env.example .env   # completar los valores
npm run dev                 # http://localhost:3000
```

Variables principales de `Server/.env`:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL, por ejemplo `postgresql://usuario:clave@localhost:5432/gastos_personales` |
| `JWT_SECRET` | Texto largo y aleatorio para firmar las sesiones |
| `CLIENT_URL` | URL del frontend, para CORS (`http://localhost:5173`) |
| `SMTP_*`, `EMAIL_FROM` | Opcionales: envío del mail de recuperación de contraseña |

**3. Frontend**

```bash
cd Client
npm install
cp src/.env.example .env   # VITE_API_URL=http://localhost:3000/api
npm run dev                 # http://localhost:5173
```

## Autor

**Facundo Villafañe**, Córdoba, Argentina. [GitHub](https://github.com/FacuVillafane10)
