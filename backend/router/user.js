const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/register',async(req,res)=>{
    const {Username,password,PhoneNumber,Email} = req.body;
    const selectedPlan = ["free", "starter", "business"].includes(req.body.plan)
        ? req.body.plan
        : "free";
    try {
        const user = new User({
            Username,
            password,
            PhoneNumber,
            Email,
            plan: "free",
            pendingPlan: selectedPlan,
            trialStartedAt: undefined,
            trialEndsAt: undefined,
            subscriptionStatus: "active",
            vehicleLimit: 1
        });
        await user.save();
        res.status(201).json({
            message: 'User created successfully',
            userId: user._id,
            plan: selectedPlan,
            trialEndsAt: null
        });
        console.log('user Created successfully');
    } catch (error) {
        console.error('Unable to register user:', error);
        res.status(400).json({message: error.message});
    }
});

router.post('/login',async(req,res)=>{
    const{Email,password} = req.body;
    const user = await User.findOne({Email,password});
    if(!user) return res.status(400).json({message:"Invalid Email or Password"});
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
        accessAllowed: true
    });
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


        