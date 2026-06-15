# DriveDocs Backend - Reminder System Setup

## 🚀 Features

The backend now includes an automated reminder system that sends notifications via **Email** and **WhatsApp** for upcoming document expirations.

### Reminder Schedule:
- **15 days before expiry** - First reminder
- **10 days before expiry** - Second reminder  
- **2 days before expiry** - Final urgent reminder

---

## 📋 Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Gmail Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

---

## 🔧 Configuration Guide

### Gmail Setup (for Email Reminders)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer" (or your device)
   - Copy the generated 16-character password
3. Use this password as `EMAIL_PASSWORD` in `.env`

### Twilio Setup (for WhatsApp Reminders)

1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your credentials:
   - Account SID
   - Auth Token
   - WhatsApp-enabled phone number
3. Add these to `.env`

---

## 📱 API Endpoints

### Upload Document
**POST** `/api/documents/upload`

```json
{
  "userId": "user-id",
  "vehicleNumber": "ABC-1234",
  "documentType": "insurance",
  "expiryDate": "2026-07-15",
  "fileName": "insurance.pdf",
  "notificationPreference": "both"
}
```

### Get User Documents
**GET** `/api/documents/user/:userId`

### Get Expiring Documents (30 days)
**GET** `/api/documents/expiring/:userId`

### Delete Document
**DELETE** `/api/documents/:documentId`

### Update Notification Preference
**PATCH** `/api/documents/:documentId/notification-preference`

```json
{
  "notificationPreference": "email"
}
```

---

## ⏰ How It Works

1. **Scheduled Tasks**: Runs automatically at:
   - 8:00 AM daily (primary check)
   - Every 12 hours (backup check)

2. **Reminder Logic**:
   - Checks all documents in the database
   - Calculates days until expiry
   - Sends reminders on exact dates (15, 10, 2 days before)
   - Tracks which reminders have been sent to avoid duplicates

3. **Notification Methods**:
   - **Email**: Formatted HTML email with document details
   - **WhatsApp**: Text message with key information
   - **Both**: Sends via both channels if preferred

---

## 📧 Email Template

The email reminders include:
- User greeting
- Document type and vehicle number
- Days remaining until expiry
- Expiry date
- Link to DriveDocs dashboard

---

## 📱 WhatsApp Template

Sample message:
```
Hi John, 🚗

Your INSURANCE for vehicle ABC-1234 will expire in 15 days!

📅 Expiry Date: Jun 15, 2026

Please renew your document before it expires.

Visit DriveDocs to manage your documents.
```

---

## 🧪 Testing

### Manual Reminder Check
Run the reminder checker manually:

```javascript
// In backend/server.js or a test file
const { checkAndSendReminders } = require("./services/reminderChecker");
checkAndSendReminders();
```

### Test Email Sending
```javascript
const { sendEmailReminder } = require("./services/notificationService");

await sendEmailReminder(
  "user@example.com",
  "John",
  {
    vehicleNumber: "ABC-1234",
    documentType: "insurance",
    expiryDate: new Date()
  },
  15
);
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use App Passwords** - Don't use your main Gmail password
3. **Rotate API keys** - Regularly update Twilio credentials
4. **Validate User Input** - All endpoints validate data
5. **HTTPS Only** - Use HTTPS in production

---

## 📝 Database Schema

### Document Model
```
{
  userId: ObjectId (reference to User),
  vehicleNumber: String,
  documentType: String (enum: rc, insurance, puc, permit, driver_license),
  expiryDate: Date,
  fileName: String,
  fileType: String,
  uploadedAt: Date,
  notificationPreference: String (email, whatsapp, both),
  reminders: {
    days15: { sent: Boolean, sentAt: Date },
    days10: { sent: Boolean, sentAt: Date },
    days2: { sent: Boolean, sentAt: Date }
  }
}
```

---

## ❌ Troubleshooting

### Reminders Not Sending
1. Check `.env` file is properly configured
2. Verify Twilio/Gmail credentials are correct
3. Check server logs: `node server.js`
4. Ensure MongoDB is running

### Email Bouncing
- Verify Gmail App Password is correct
- Check if sender email is in `EMAIL_USER`

### WhatsApp Not Working
- Verify Twilio account has WhatsApp enabled
- Check phone number format (with country code)
- Ensure Twilio numbers are registered

---

## 🚀 Deployment

Before deploying to production:

1. Update `.env` with production credentials
2. Use production email service (SendGrid, AWS SES, etc.)
3. Set `NODE_ENV=production`
4. Use process manager (PM2, Docker, etc.)
5. Enable HTTPS
6. Set up monitoring and logging

---

## 📞 Support

For issues or questions:
- Check MongoDB connection
- Review server logs
- Verify API credentials
- Test with manual reminder checks
