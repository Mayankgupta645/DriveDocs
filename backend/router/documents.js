const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Document = require("../models/document");
const User = require("../models/user");

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            const userDirectory = path.join(__dirname, "..", "uploads", String(req.body.userId || "unknown"));
            fs.mkdirSync(userDirectory, { recursive: true });
            callback(null, userDirectory);
        },
        filename: (req, file, callback) => {
            const extension = path.extname(file.originalname).toLowerCase();
            callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
        callback(null, allowedTypes.includes(file.mimetype));
    }
});

// Upload/Save Document
router.post("/upload", upload.single("document_file"), async (req, res) => {
    try {
        const {
            userId,
            vehicleNumber,
            documentType,
            expiryDate,
            notificationPreference
        } = req.body;

        const missingFields = [];
        if (!userId) missingFields.push("userId");
        if (!vehicleNumber) missingFields.push("vehicleNumber");
        if (!documentType) missingFields.push("documentType");
        if (!expiryDate) missingFields.push("expiryDate");
        if (!req.file) missingFields.push("document file");

        if (missingFields.length) {
            return res.status(400).json({
                message: `Please provide: ${missingFields.join(", ")}.`
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const currentVehicles = await Document.distinct("vehicleNumber", { userId });
        const normalizedVehicleNumber = vehicleNumber.toUpperCase().trim();
        const alreadyExists = currentVehicles.some(
            currentVehicle => currentVehicle.toUpperCase().trim() === normalizedVehicleNumber
        );
        const vehicleLimit = user.vehicleLimit || 1;

        if (!alreadyExists && currentVehicles.length >= vehicleLimit) {
            fs.unlink(req.file.path, () => {});
            return res.status(403).json({
                code: "VEHICLE_LIMIT_REACHED",
                message: `Your ${user.plan} plan supports up to ${vehicleLimit} vehicle${vehicleLimit === 1 ? "" : "s"}. Upgrade your plan to add another vehicle.`,
                vehicleLimit,
                currentVehicleCount: currentVehicles.length,
                upgradeUrl: "/index.html#plans"
            });
        }

        // Create new document
        const document = new Document({
            userId,
            vehicleNumber,
            documentType,
            expiryDate,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            filePath: req.file.path,
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
router.get("/:documentId/file", async (req, res) => {
    try {
        const document = await Document.findById(req.params.documentId);

        if (!document || !document.filePath) {
            return res.status(404).json({ message: "The uploaded file was not found" });
        }

        if (!fs.existsSync(document.filePath)) {
            return res.status(404).json({ message: "The uploaded file is no longer available" });
        }

        res.type(document.fileType || path.extname(document.filePath));
        res.sendFile(path.resolve(document.filePath));
    } catch (error) {
        res.status(400).json({ message: "Unable to open this document" });
    }
});

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

        if (document.filePath) {
            fs.unlink(document.filePath, () => {});
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
