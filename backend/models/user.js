const mongoose =  require("mongoose");
const userSchema = new mongoose.Schema({
    Username:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,

    },
    PhoneNumber:{
        type: String,
        required: true,
        unique: true,
    }, 
    Email:{
        type: String,
        required: true,
        unique: true,
    },
    emailVerified: {
        type: Boolean,
        default: true
    },
    verificationTokenHash: String,
    verificationTokenExpiresAt: Date,
    welcomeEmailSentAt: Date,
    plan: {
        type: String,
        enum: ["free", "starter", "business"],
        default: "free"
    },
    pendingPlan: {
        type: String,
        enum: ["free", "starter", "business"],
        default: "free"
    },
    trialStartedAt: Date,
    trialEndsAt: Date,
    subscriptionStatus: {
        type: String,
        enum: ["trial", "active", "expired"],
        default: "trial"
    },
    vehicleLimit: {
        type: Number,
        default: 1
    },
    subscriptionStartedAt: Date,
    subscriptionExpiresAt: Date,
    razorpayPaymentId: String
    
},{timestamps:true});
const User = mongoose.model("User",userSchema);
module.exports = User;