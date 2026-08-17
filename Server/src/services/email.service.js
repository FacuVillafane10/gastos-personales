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
// ENVIAR EMAIL DE RECUPERACIÓN
// ===================================

export const enviarEmailRecuperacion =
  async ({
    email,
    nombre,
    link,
  }) => {
    await transporter.sendMail({
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
    });
  };