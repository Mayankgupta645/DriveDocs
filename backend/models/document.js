const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    vehicleNumber: {
        type: String,
        required: true
    },
    documentType: {
        type: String,
        enum: ["rc", "insurance", "puc", "permit", "driver_license"],
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileType: String,
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    reminders: {
        days15: {
            sent: { type: Boolean, default: false },
            sentAt: Date
        },
        days10: {
            sent: { type: Boolean, default: false },
            sentAt: Date
        },
        days2: {
            sent: { type: Boolean, default: false },
            sentAt: Date
        }
    },
    notificationPreference: {
        type: String,
        enum: ["email", "whatsapp", "both"],
        default: "both"
    }
}, { timestamps: true });

const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
