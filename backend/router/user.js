const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/register',async(req,res)=>{
    const {Username,password,PhoneNumber,Email} = req.body;
    const selectedPlan = ["free", "starter", "business"].includes(req.body.plan)
        ? req.body.plan
        : "free";
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const paidPlan = selectedPlan !== "free";

    try {
        const user = new User({
            Username,
            password,
            PhoneNumber,
            Email,
            plan: selectedPlan,
            trialStartedAt: paidPlan ? undefined : now,
            trialEndsAt: paidPlan ? undefined : trialEndsAt,
            subscriptionStatus: paidPlan ? "active" : "trial",
            vehicleLimit: selectedPlan === "business" ? 15 : selectedPlan === "starter" ? 5 : 1
        });
        await user.save();
        res.status(201).json({
            message: 'User created successfully',
            plan: selectedPlan,
            trialEndsAt: paidPlan ? null : trialEndsAt
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
    if (user.plan === "free" && !user.trialEndsAt) {
        user.trialStartedAt = new Date();
        user.trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        user.subscriptionStatus = "trial";
        await user.save();
    }
    const trialActive = user.plan === "free" && user.trialEndsAt && user.trialEndsAt > new Date();
    const accessAllowed = user.plan !== "free" || trialActive;
    const subscriptionStatus = user.plan === "free"
        ? (trialActive ? "trial" : "expired")
        : "active";

    res.status(200).json({
        message: "Login Successful",
        userId: user._id,
        plan: user.plan,
        vehicleLimit: user.vehicleLimit,
        trialEndsAt: user.trialEndsAt || null,
        subscriptionStatus,
        accessAllowed
    });
});

router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ user });
    } catch (error) {
        res.status(400).json({ message: 'Unable to load profile' });
    }
});



module.exports = router;


        