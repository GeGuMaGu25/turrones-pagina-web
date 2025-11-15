import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.CONTACT_EMAIL,
        pass: process.env.CONTACT_EMAIL_PASSWORD,
    },
});

router.post("/", async (req, res) => {
    const { nombre, correo, mensaje } = req.body;

    if (!nombre || !correo || !mensaje) {
        return res.status(400).json({ ok: false, error: "Datos incompletos" });
    }

    try {
        await transporter.sendMail({
            from: `"Web Delicias Yesi" <${process.env.CONTACT_EMAIL}>`,
            to: process.env.CONTACT_DESTINATION || process.env.CONTACT_EMAIL,
            subject: `Nuevo mensaje de contacto de ${nombre}`,
            text: `
                Nombre: ${nombre}
                Correo: ${correo}

                Mensaje:
                ${mensaje}
                `,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("Error enviando correo de contacto", err);
        res.status(500).json({ ok: false, error: "Error enviando el mensaje" });
    }
});

export default router;