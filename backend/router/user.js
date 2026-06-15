const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/register',async(req,res)=>{
    const {Username,password,PhoneNumber,Email} = req.body;
    try {
        const user = new User({Username,password,PhoneNumber,Email});
        await user.save();
        res.status(201).json({message: 'User created successfully'});
        console.log('user Created successfully');
    } catch (error) {
        res.status(400).json({message: error.message});
    }
});

router.post('/login',async(req,res)=>{
    const{Email,password} = req.body;
    const user = await User.findOne({Email,password});
    if(!user) return res.status(400).json({message:"Invalid Email or Password"});
    res.status(200).json({message:"Login Successful"});
});



module.exports = router;


        