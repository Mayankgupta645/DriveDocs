const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/user');

const router = express.Router();

function getRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
        return null;
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
}

router.get('/config', (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    if (!keyId) {
        return res.status(503).json({ message: 'Razorpay is not configured on the server.' });
    }

    res.json({ keyId });
});

router.post('/create-order', async (req, res) => {
    const amount = Number(req.body.amount);
    const { userId, plan } = req.body;
    const razorpay = getRazorpay();
    const planAmounts = { starter: 19900, business: 29900 };

    if (!Number.isInteger(amount) || amount < 100 || !planAmounts[plan] || amount !== planAmounts[plan]) {
        return res.status(400).json({ message: 'Invalid payment amount or plan.' });
    }
    if (!userId) {
        return res.status(400).json({ message: 'A user account is required before payment.' });
    }
    if (!razorpay) {
        return res.status(503).json({ message: 'Razorpay is not configured on the server.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User account not found.' });

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: `drivedocs_${Date.now()}`,
            notes: { userId: String(user._id), plan }
        });

        res.status(201).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        const status = error.statusCode === 401 || error.statusCode === 403 ? 401 : 500;
        console.error('Razorpay order creation failed:', error.error?.description || error.message);
        res.status(status).json({
            message: status === 401
                ? 'Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are an active matching pair from the same Razorpay account and mode.'
                : 'Unable to create payment order.'
        });
    }
});

router.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields.' });
    }
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) {
        return res.status(503).json({ message: 'Razorpay is not configured on the server.' });
    }

    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
    const signaturesMatch = expectedSignature.length === razorpay_signature.length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!signaturesMatch) {
        return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    getRazorpay().orders.fetch(razorpay_order_id)
        .then(async (order) => {
            const plan = order.notes?.plan;
            const userId = order.notes?.userId;
            const vehicleLimit = plan === 'business' ? 15 : plan === 'starter' ? 5 : 1;
            if (!userId || !['starter', 'business'].includes(plan)) {
                return res.status(400).json({ message: 'Payment order is missing account details.' });
            }

            const user = await User.findByIdAndUpdate(userId, {
                plan,
                pendingPlan: plan,
                vehicleLimit,
                subscriptionStatus: 'active',
                subscriptionStartedAt: new Date(),
                razorpayPaymentId: razorpay_payment_id
            }, { new: true }).select('-password');
            if (!user) return res.status(404).json({ message: 'User account not found.' });

            res.status(200).json({ verified: true, message: 'Payment verified successfully.', user });
        })
        .catch((error) => {
            console.error('Unable to update paid plan:', error.error?.description || error.message);
            res.status(500).json({ message: 'Payment verified, but the account could not be updated. Please contact support.' });
        });
});

module.exports = router;