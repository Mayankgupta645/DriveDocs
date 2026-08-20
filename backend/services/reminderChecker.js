const Document = require("../models/document");
const User = require("../models/user");
const {
    sendEmailReminder,
    sendWhatsAppReminder,
    sendBothReminders
} = require("./notificationService");

// Calculate days between two dates
function getDaysBetween(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Check if reminder should be sent (15, 10, or 2 days before expiry)
async function checkAndSendReminders() {
    try {
        console.log("🔔 Starting reminder check at", new Date().toLocaleString());
        
        // Get all documents
        const documents = await Document.find().populate("userId");
        
        for (const doc of documents) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const expiryDate = new Date(doc.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            
            const daysUntilExpiry = getDaysBetween(today, expiryDate);
            
            // Check if document is already expired
            if (daysUntilExpiry < 0) {
                console.log(`Document ${doc._id} has already expired`);
                continue;
            }
            
            const user = doc.userId;
            if (!user || !user.Email || !user.PhoneNumber) {
                console.log(`Skipping document ${doc._id} - user contact info missing`);
                continue;
            }
            
            const documentInfo = {
                vehicleNumber: doc.vehicleNumber,
                documentType: doc.documentType,
                expiryDate: doc.expiryDate
            };
            
            // 15 Days Before Expiry
            if (daysUntilExpiry === 15 && !doc.reminders.days15.sent) {
                console.log(`Sending 15-day reminder for document ${doc._id}`);
                
                if (doc.notificationPreference === "email") {
                    await sendEmailReminder(user.Email, user.Username, documentInfo, 15);
                } else if (doc.notificationPreference === "whatsapp") {
                    await sendWhatsAppReminder(user.PhoneNumber, user.Username, documentInfo, 15);
                } else {
                    await sendBothReminders(user.Email, user.PhoneNumber, user.Username, documentInfo, 15);
                }
                
                doc.reminders.days15.sent = true;
                doc.reminders.days15.sentAt = new Date();
                await doc.save();
            }
            
            // 10 Days Before Expiry
            if (daysUntilExpiry === 10 && !doc.reminders.days10.sent) {
                console.log(`Sending 10-day reminder for document ${doc._id}`);
                
                if (doc.notificationPreference === "email") {
                    await sendEmailReminder(user.Email, user.Username, documentInfo, 10);
                } else if (doc.notificationPreference === "whatsapp") {
                    await sendWhatsAppReminder(user.PhoneNumber, user.Username, documentInfo, 10);
                } else {
                    await sendBothReminders(user.Email, user.PhoneNumber, user.Username, documentInfo, 10);
                }
                
                doc.reminders.days10.sent = true;
                doc.reminders.days10.sentAt = new Date();
                await doc.save();
            }
            
            // 2 Days Before Expiry
            if (daysUntilExpiry === 2 && !doc.reminders.days2.sent) {
                console.log(`Sending 2-day reminder for document ${doc._id}`);
                
                if (doc.notificationPreference === "email") {
                    await sendEmailReminder(user.Email, user.Username, documentInfo, 2);
                } else if (doc.notificationPreference === "whatsapp") {
                    await sendWhatsAppReminder(user.PhoneNumber, user.Username, documentInfo, 2);
                } else {
                    await sendBothReminders(user.Email, user.PhoneNumber, user.Username, documentInfo, 2);
                }
                
                doc.reminders.days2.sent = true;
                doc.reminders.days2.sentAt = new Date();
                await doc.save();
            }
        }
        
        console.log("✅ Reminder check completed");
    } catch (error) {
        console.error("Error in checkAndSendReminders:", error);
    }
}

module.exports = {
    checkAndSendReminders
};
