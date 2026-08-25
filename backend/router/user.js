const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/notificationService');

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function createVerificationToken() {
    const token = crypto.randomInt(100000, 1000000).toString();
    return {
        token,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
    };
}

router.post('/register',async(req,res)=>{
    const {Username,password,PhoneNumber,Email} = req.body;
    const selectedPlan = ["free", "starter", "business"].includes(req.body.plan)
        ? req.body.plan
        : "free";
    try {
        const hashpassword = await bcrypt.hash(password, 10);
        const verification = createVerificationToken();
        const user = new User({
            Username,
            password : hashpassword,
            PhoneNumber,
            Email,
            emailVerified: false,
            verificationTokenHash: verification.tokenHash,
            verificationTokenExpiresAt: verification.expiresAt,
            plan: "free",
            pendingPlan: selectedPlan,
            trialStartedAt: undefined,
            trialEndsAt: undefined,
            subscriptionStatus: "active",
            vehicleLimit: 1
        });
        await user.save();
        res.status(201).json({
            message: 'Account created. Check your email to verify your account.',
            userId: user._id,
            plan: selectedPlan,
            trialEndsAt: null,
            emailSent: true
        });
        sendVerificationEmail(Email, Username, verification.token)
            .then((emailSent) => {
                if (!emailSent) {
                    console.warn(`Verification email could not be sent to ${Email}.`);
                }
            })
            .catch((error) => {
                console.error(`Unexpected verification email error for ${Email}:`, error);
            });
        console.log('user Created successfully');
    } catch (error) {
        console.error('Unable to register user:', error);
        res.status(400).json({message: error.message});
    }
});

router.post('/login',async(req,res)=>{
    const{Email,password} = req.body;
    const user = await User.findOne({Email});
    if(!user) return res.status(400).json({message:"Invalid Email or Password"});
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({message:"Invalid Email or Password"});
    if (!user.emailVerified) {
        return res.status(403).json({
            message: "Please verify your email before logging in.",
            emailVerificationRequired: true
        });
    }
    if (user.plan !== "free" && user.subscriptionExpiresAt && user.subscriptionExpiresAt <= new Date()) {
        user.plan = "free";
        user.vehicleLimit = 1;
        user.subscriptionStatus = "expired";
        await user.save();
    }
    if (user.plan === "free" && user.subscriptionStatus === "trial" && user.trialEndsAt) {
        user.trialStartedAt = undefined;
        user.trialEndsAt = undefined;
        user.subscriptionStatus = "active";
        await user.save();
    }
    res.status(200).json({
        message: "Login Successful",
        userId: user._id,
        plan: user.plan,
        vehicleLimit: user.vehicleLimit,
        trialEndsAt: user.trialEndsAt || null,
        subscriptionStatus: user.subscriptionStatus || "active",
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        emailVerified: user.emailVerified !== false,
        accessAllowed: true
    });
});

router.post('/verify-email', async (req, res) => {
    const { code } = req.body;
    if (!/^\d{6}$/.test(code || '')) {
        return res.status(400).json({ message: 'Enter the six-digit verification code from your email.' });
    }

    const tokenHash = crypto.createHash('sha256').update(code).digest('hex');
    const user = await User.findOne({
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
        return res.status(400).json({ message: 'This verification code is invalid or has expired. Request a new one.' });
    }

    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    res.status(200).json({
        message: 'Email verified successfully. Opening your dashboard.',
        userId: user._id,
        email: user.Email,
        plan: user.plan,
        vehicleLimit: user.vehicleLimit,
        emailVerified: true,
        accessAllowed: true
    });

    if (!user.welcomeEmailSentAt) {
        sendWelcomeEmail(user.Email, user.Username)
            .then(async (welcomeSent) => {
                if (welcomeSent) {
                    user.welcomeEmailSentAt = new Date();
                    await user.save();
                }
            })
            .catch((error) => console.error(`Unexpected welcome email error for ${user.Email}:`, error));
    }
});

router.post('/resend-verification', async (req, res) => {
    const { Email } = req.body;
    const user = await User.findOne({ Email });

    if (user && !user.emailVerified) {
        const verification = createVerificationToken();
        user.verificationTokenHash = verification.tokenHash;
        user.verificationTokenExpiresAt = verification.expiresAt;
        await user.save();
        await sendVerificationEmail(user.Email, user.Username, verification.token);
    }

    res.status(200).json({ message: 'If an unverified account exists for that email, a new verification code has been sent.' });
});

router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.plan !== "free" && user.subscriptionExpiresAt && user.subscriptionExpiresAt <= new Date()) {
            user.plan = "free";
            user.vehicleLimit = 1;
            user.subscriptionStatus = "expired";
            await user.save();
        }
        user.password = undefined;
        res.status(200).json({ user });
    } catch (error) {
        res.status(400).json({ message: 'Unable to load profile' });
    }
});



module.exports = router;


        