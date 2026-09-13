import { Resend } from "resend";

let resendClient = null;

function getClient() {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

async function send({ to, subject, text, html }) {
    const from = process.env.MAIL_FROM || "WellNest <onboarding@resend.dev>";
    const { error } = await getClient().emails.send({ from, to, subject, text, html });
    if (error) {
        throw new Error(error.message || "Failed to send email via Resend");
    }
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