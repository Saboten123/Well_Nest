import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
}

export async function sendOtpEmail(toEmail, code) {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;

    await getTransporter().sendMail({
        from,
        to: toEmail,
        subject: "Your WellNest verification code",
        text: `Your WellNest verification code is ${code}. It expires in 10 minutes.`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Your WellNest verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
    });
}