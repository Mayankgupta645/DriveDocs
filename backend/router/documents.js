const express = require("express");
const router = express.Router();
const Document = require("../models/document");
const User = require("../models/user");

// Upload/Save Document
router.post("/upload", async (req, res) => {
    try {
        const {
            userId,
            vehicleNumber,
            documentType,
            expiryDate,
            fileName,
            fileType,
            notificationPreference
        } = req.body;

        // Validate required fields
        if (!userId || !vehicleNumber || !documentType || !expiryDate) {
            return res.status(400).json({
                message: "Missing required fields: userId, vehicleNumber, documentType, expiryDate"
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Create new document
        const document = new Document({
            userId,
            vehicleNumber,
            documentType,
            expiryDate,
            fileName,
            fileType,
            notificationPreference: notificationPreference || "both"
        });

        await document.save();

        res.status(201).json({
            message: "Document uploaded successfully",
            document
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all documents for a user
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const documents = await Document.find({ userId }).populate("userId");

        res.status(200).json({
            message: "Documents retrieved successfully",
            documents
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get a specific document
router.get("/:documentId", async (req, res) => {
    try {
        const { documentId } = req.params;

        const document = await Document.findById(documentId).populate("userId");

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.status(200).json({
            message: "Document retrieved successfully",
            document
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a document
router.delete("/:documentId", async (req, res) => {
    try {
        const { documentId } = req.params;

        const document = await Document.findByIdAndDelete(documentId);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.status(200).json({
            message: "Document deleted successfully"
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update notification preference
router.patch("/:documentId/notification-preference", async (req, res) => {
    try {
        const { documentId } = req.params;
        const { notificationPreference } = req.body;

        if (!["email", "whatsapp", "both"].includes(notificationPreference)) {
            return res.status(400).json({
                message: "Invalid notification preference. Must be 'email', 'whatsapp', or 'both'"
            });
        }

        const document = await Document.findByIdAndUpdate(
            documentId,
            { notificationPreference },
            { new: true }
        );

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.status(200).json({
            message: "Notification preference updated successfully",
            document
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get documents expiring soon (for dashboard)
router.get("/expiring/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const documents = await Document.find({
            userId,
            expiryDate: {
                $gte: today,
                $lte: thirtyDaysFromNow
            }
        }).populate("userId");

        res.status(200).json({
            message: "Expiring documents retrieved successfully",
            documents
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
