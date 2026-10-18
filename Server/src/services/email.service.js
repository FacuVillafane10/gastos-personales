import nodemailer from "nodemailer";

const transporter =
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,

    port: Number(
      process.env.SMTP_PORT
    ),

    secure:
      process.env.SMTP_SECURE ===
      "true",

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });


// ===================================
// ENVÍO
// Brevo (API HTTPS) si hay BREVO_API_KEY:
// los hostings gratuitos bloquean SMTP.
// Sin API key se usa SMTP (desarrollo local).
// ===================================

const TIMEOUT_MS = 15000;

const parsearRemitente = (from) => {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from || "");

  return match
    ? { name: match[1].trim() || undefined, email: match[2].trim() }
    : { email: (from || "").trim() };
};

const enviarPorBrevo = async ({ from, to, subject, text, html }) => {
  const remitente = parsearRemitente(from);

  if (!remitente.email) {
    throw new Error("EMAIL_FROM no está configurado");
  }

  const respuesta = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: remitente,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");

    throw new Error(
      `Brevo respondió ${respuesta.status}: ${detalle}`
    );
  }
};

const enviarEmail = (mensaje) =>
  process.env.BREVO_API_KEY
    ? enviarPorBrevo(mensaje)
    : transporter.sendMail(mensaje);


// ===================================
// ENVIAR EMAIL DE RECUPERACIÓN
// ===================================

export const enviarEmailRecuperacion =
  async ({
    email,
    nombre,
    link,
  }) => {
    const mensaje = {
      from:
        process.env.EMAIL_FROM,

      to: email,

      subject:
        "Restablecer contraseña - Control de Gastos",

      text: `
Hola${nombre ? ` ${nombre}` : ""}.

Recibimos una solicitud para restablecer la contraseña de tu cuenta.

Abrí el siguiente enlace:

${link}

Este enlace vence en 30 minutos.

Si no solicitaste el cambio, podés ignorar este correo.
      `,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 520px;
            margin: 0 auto;
            color: #1f2937;
          "
        >

          <h2>
            Restablecer contraseña
          </h2>

          <p>
            Hola${nombre ? ` ${nombre}` : ""}.
          </p>

          <p>
            Recibimos una solicitud para
            restablecer la contraseña de tu
            cuenta de Control de Gastos.
          </p>

          <p
            style="
              margin: 30px 0;
            "
          >
            <a
              href="${link}"
              style="
                display: inline-block;
                padding: 13px 20px;
                background: #111827;
                color: #ffffff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
              "
            >
              Crear nueva contraseña
            </a>
          </p>

          <p>
            Este enlace vence en
            <strong>30 minutos</strong>.
          </p>

          <p
            style="
              color: #6b7280;
              font-size: 13px;
            "
          >
            Si no solicitaste este cambio,
            podés ignorar este correo.
          </p>

        </div>
      `,
    };

    await enviarEmail(mensaje);
  };