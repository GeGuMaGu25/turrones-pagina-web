// backend/src/routes/contact.js
import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { nombre, correo, mensaje } = req.body || {};

    if (!nombre || !correo || !mensaje) {
      return res
        .status(400)
        .json({ ok: false, error: "Faltan campos obligatorios" });
    }

    // === Configuración de correo desde variables de entorno ===
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      CONTACT_TO,
    } = process.env;

    // Si no hay SMTP configurado, solo logueamos y respondemos ok
    if (!SMTP_HOST) {
      console.log("📨 Contacto recibido (sin SMTP configurado):", {
        nombre,
        correo,
        mensaje,
      });
      return res.json({ ok: true, note: "Mensaje registrado en logs" });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: false,
      auth:
        SMTP_USER && SMTP_PASS
          ? { user: SMTP_USER, pass: SMTP_PASS }
          : undefined,
    });

    await transporter.sendMail({
      from: CONTACT_TO || SMTP_USER,
      to: CONTACT_TO || SMTP_USER,
      replyTo: correo,
      subject: `Nuevo mensaje de ${nombre} - Turrones Yesi`,
      text: `
Nombre: ${nombre}
Correo: ${correo}

Mensaje:
${mensaje}
      `.trim(),
    });

    // ✅ IMPORTANTE: siempre responder algo
    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en /api/contact:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error al enviar el mensaje" });
  }
});

export default router;
