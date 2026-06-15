const nodemailer = require("nodemailer");
const twilio = require("twilio");

// Email Configuration
const emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER || "your-email@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "your-app-password"
    }
});

// Twilio Configuration (for WhatsApp)
// Create the Twilio client lazily so the server doesn't crash when env vars are missing.
function getTwilioClient() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (!sid || !token) {
        console.warn('Twilio not configured: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing. WhatsApp reminders disabled.');
        return null;
    }

    // Twilio Account SIDs should start with 'AC'
    if (!sid.startsWith('AC')) {
        console.warn('TWILIO_ACCOUNT_SID does not appear valid (should start with "AC"). WhatsApp reminders disabled.');
        return null;
    }

    try {
        return twilio(sid, token);
    } catch (err) {
        console.error('Failed to initialize Twilio client:', err);
        return null;
    }
}

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || null;

// Send Email Reminder
async function sendEmailReminder(userEmail, userName, documentInfo, daysLeft) {
    const emailContent = `
        <h2>Document Expiry Reminder</h2>
        <p>Hi ${userName},</p>
        <p>Your <strong>${documentInfo.documentType}</strong> document for vehicle <strong>${documentInfo.vehicleNumber}</strong> will expire in <strong>${daysLeft} days</strong>.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Document Details:</h3>
            <p><strong>Vehicle Number:</strong> ${documentInfo.vehicleNumber}</p>
            <p><strong>Document Type:</strong> ${documentInfo.documentType}</p>
            <p><strong>Expiry Date:</strong> ${new Date(documentInfo.expiryDate).toLocaleDateString()}</p>
            <p><strong>Days Remaining:</strong> ${daysLeft}</p>
        </div>
        
        <p>Please renew your document before it expires to avoid any legal issues.</p>
        <p>Visit your dashboard to view and manage all your documents.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated reminder from DriveDocs. Please don't reply to this email.</p>
    `;

    try {
        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER || "noreply@drivedocs.com",
            to: userEmail,
            subject: `⚠️ Alert: ${documentInfo.documentType.toUpperCase()} Expiring in ${daysLeft} Days`,
            html: emailContent
        });
        console.log(`Email sent to ${userEmail} for ${documentInfo.documentType}`);
        return true;
    } catch (error) {
        console.error(`Error sending email to ${userEmail}:`, error);
        return false;
    }
}

// Send WhatsApp Reminder
async function sendWhatsAppReminder(phoneNumber, userName, documentInfo, daysLeft) {
    const messageBody = `
Hi ${userName}, 🚗

Your ${documentInfo.documentType.toUpperCase()} for vehicle ${documentInfo.vehicleNumber} will expire in ${daysLeft} days!

📅 Expiry Date: ${new Date(documentInfo.expiryDate).toLocaleDateString()}

Please renew your document before it expires.

Visit DriveDocs to manage your documents.
    `.trim();

    const client = getTwilioClient();
    if (!client) {
        console.warn(`Skipping WhatsApp send to ${phoneNumber} — Twilio not configured.`);
        return false;
    }

    if (!TWILIO_WHATSAPP_NUMBER) {
        console.warn('TWILIO_WHATSAPP_NUMBER not configured. Cannot send WhatsApp messages.');
        return false;
    }

    try {
        await client.messages.create({
            from: TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${phoneNumber}`,
            body: messageBody
        });
        console.log(`WhatsApp sent to ${phoneNumber} for ${documentInfo.documentType}`);
        return true;
    } catch (error) {
        console.error(`Error sending WhatsApp to ${phoneNumber}:`, error);
        return false;
    }
}

// Send Both Email and WhatsApp
async function sendBothReminders(userEmail, phoneNumber, userName, documentInfo, daysLeft) {
    const emailSent = await sendEmailReminder(userEmail, userName, documentInfo, daysLeft);
    const whatsappSent = await sendWhatsAppReminder(phoneNumber, userName, documentInfo, daysLeft);
    return { emailSent, whatsappSent };
}

module.exports = {
    sendEmailReminder,
    sendWhatsAppReminder,
    sendBothReminders
};
