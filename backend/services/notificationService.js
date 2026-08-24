const nodemailer = require("nodemailer");
const twilio = require("twilio");

const emailUser = (process.env.EMAIL_USER || "your-email@gmail.com").trim();
const emailPassword = (process.env.EMAIL_PASSWORD || "your-app-password").replace(/\s/g, '');

// Email Configuration
const emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: emailUser,
        pass: emailPassword
    }
});

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5500").replace(/\/$/, "");

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function emailLayout(title, content) {
    return `
        <div style="margin:0;background:#f4f8f8;padding:32px 16px;font-family:Arial,sans-serif;color:#183043">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #dce7e8">
                <div style="padding:22px 28px;background:#062033;color:#ffffff">
                    <strong style="font-size:20px">DriveDocs</strong>
                </div>
                <div style="padding:30px 28px">
                    <h1 style="margin:0 0 18px;color:#062033;font-size:25px">${title}</h1>
                    ${content}
                </div>
                <div style="padding:18px 28px;border-top:1px solid #dce7e8;color:#71808c;font-size:12px">
                    DriveDocs &middot; Keep every vehicle document ready.
                </div>
            </div>
        </div>`;
}

async function sendVerificationEmail(userEmail, userName, token) {
    const safeName = escapeHtml(userName);
    const html = emailLayout("Verify your email address", `
        <p>Hi ${safeName},</p>
        <p>Welcome to DriveDocs. Please verify your email address to activate your account and start managing your vehicle documents.</p>
        <div style="margin:28px 0;padding:18px;background:#eaf8f5;text-align:center">
            <p style="margin:0 0 8px;color:#07594f;font-size:12px;font-weight:bold;text-transform:uppercase">Your verification code</p>
            <strong style="font-size:32px;letter-spacing:6px;color:#062033">${escapeHtml(token)}</strong>
        </div>
        <p style="font-size:13px;color:#71808c">Enter this code on the DriveDocs verification screen. It expires in 24 hours. If you did not create a DriveDocs account, you can safely ignore this email.</p>`);

    try {
        await emailTransporter.sendMail({
            from: emailUser,
            to: userEmail,
            subject: "Verify your DriveDocs email address",
            html
        });
        return true;
    } catch (error) {
        console.error(`Error sending verification email to ${userEmail}:`, error);
        return false;
    }
}

async function sendWelcomeEmail(userEmail, userName) {
    const dashboardUrl = `${frontendUrl}/dashboard.html`;
    const html = emailLayout("Welcome to DriveDocs", `
        <p>Hi ${escapeHtml(userName)},</p>
        <p>Your email is verified and your DriveDocs account is ready.</p>
        <p>You can now:</p>
        <ul style="padding-left:20px;line-height:1.8">
            <li>Upload your vehicle documents</li>
            <li>Track expiry dates in one place</li>
            <li>Receive email reminders before documents expire</li>
        </ul>
        <p style="margin:28px 0"><a href="${dashboardUrl}" style="display:inline-block;padding:13px 20px;background:#0c756d;color:#ffffff;text-decoration:none;font-weight:bold">Open my dashboard</a></p>`);

    try {
        await emailTransporter.sendMail({
            from: emailUser,
            to: userEmail,
            subject: "Welcome to DriveDocs",
            html
        });
        return true;
    } catch (error) {
        console.error(`Error sending welcome email to ${userEmail}:`, error);
        return false;
    }
}

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
            from: emailUser,
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
    sendVerificationEmail,
    sendWelcomeEmail,
    sendEmailReminder,
    sendWhatsAppReminder,
    sendBothReminders
};
