import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true", // true for port 465
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
}

async function send({ to, subject, text, html }) {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    await getTransporter().sendMail({ from, to, subject, text, html });
}

export async function sendOtpEmail(toEmail, code) {
    await send({
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

export async function sendPasswordResetOtpEmail(toEmail, code) {
    await send({
        to: toEmail,
        subject: "Reset your WellNest password",
        text: `Your WellNest password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Your WellNest password reset code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    });
}

function formatDateTime(date) {
    if (!date) return "a time to be confirmed";
    return new Date(date).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

// Sent to the doctor when a patient books/requests an appointment.
export async function sendAppointmentRequestEmail(doctorEmail, { patientName, requestedTime, reason }) {
    const when = formatDateTime(requestedTime);

    await send({
        to: doctorEmail,
        subject: "New appointment request - WellNest",
        text: `${patientName || "A patient"} has requested an appointment for ${when}.${reason ? ` Reason: ${reason}` : ""} Please review and confirm it in your WellNest dashboard.`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p><b>${patientName || "A patient"}</b> has requested an appointment for <b>${when}</b>.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ""}
        <p>Please review and confirm it from your WellNest dashboard.</p>
      </div>
    `,
    });
}

// Sent to the patient once the doctor accepts/schedules the appointment.
export async function sendAppointmentScheduledEmail(patientEmail, { doctorName, scheduledTime }) {
    const when = formatDateTime(scheduledTime);

    await send({
        to: patientEmail,
        subject: "Your appointment is scheduled - WellNest",
        text: `Dr. ${doctorName || ""} has scheduled your appointment for ${when}.`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Dr. <b>${doctorName || ""}</b> has scheduled your appointment for <b>${when}</b>.</p>
        <p>You'll receive another email with the meeting ID once the doctor starts the video call.</p>
      </div>
    `,
    });
}

// Sent to the patient when the doctor starts the video call.
export async function sendVideoCallInviteEmail(patientEmail, { doctorName, roomId, joinLink }) {
    await send({
        to: patientEmail,
        subject: "Your video call is starting now - WellNest",
        text: `Dr. ${doctorName || ""} has started your video call. Meeting ID: ${roomId}. Join here: ${joinLink}`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Dr. <b>${doctorName || ""}</b> has started your video call.</p>
        <p>Meeting ID: <span style="font-size: 20px; font-weight: 700; letter-spacing: 2px;">${roomId}</span></p>
        <p><a href="${joinLink}" style="color: #667eea;">Click here to join</a>, then enter the Meeting ID above.</p>
      </div>
    `,
    });
}

// Sent to both patient and doctor once the appointment/video call has finished.
export async function sendAppointmentCompletedEmail(toEmail, { recipientRole, otherPartyName, scheduledTime }) {
    const when = formatDateTime(scheduledTime);
    const withWho =
        recipientRole === "doctor"
            ? `your patient${otherPartyName ? ` ${otherPartyName}` : ""}`
            : `Dr. ${otherPartyName || ""}`;

    await send({
        to: toEmail,
        subject: "Your appointment has been completed - WellNest",
        text: `Your appointment with ${withWho} (${when}) has been completed. Thank you for using WellNest.`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Your appointment with <b>${withWho}</b> scheduled for <b>${when}</b> has been completed.</p>
        <p>Thank you for using WellNest.</p>
      </div>
    `,
    });
}

// Sent to the patient when the doctor reschedules the appointment time.
export async function sendAppointmentTimeChangedEmail(patientEmail, { doctorName, newTime }) {
    const when = formatDateTime(newTime);

    await send({
        to: patientEmail,
        subject: "Your appointment time has changed - WellNest",
        text: `Dr. ${doctorName || ""} has rescheduled your appointment to ${when}.`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Dr. <b>${doctorName || ""}</b> has rescheduled your appointment to <b>${when}</b>.</p>
      </div>
    `,
    });
}

// Sent to the other party when either side cancels the appointment.
export async function sendAppointmentCancelledEmail(toEmail, { recipientRole, otherPartyName, reason }) {
    const withWho =
        recipientRole === "doctor"
            ? `your patient${otherPartyName ? ` ${otherPartyName}` : ""}`
            : `Dr. ${otherPartyName || ""}`;

    await send({
        to: toEmail,
        subject: "Appointment cancelled - WellNest",
        text: `Your appointment with ${withWho} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        html: `
      <div style="font-family: sans-serif; font-size: 15px; color: #1a202c;">
        <p>Your appointment with <b>${withWho}</b> has been cancelled.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ""}
      </div>
    `,
    });
}