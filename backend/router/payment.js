const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const router = express.Router();

function getRazorpay() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

router.get('/config', (req, res) => {
    if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(503).json({ message: 'Razorpay is not configured on the server.' });
    }

    res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

router.post('/create-order', async (req, res) => {
    const amount = Number(req.body.amount);
    const razorpay = getRazorpay();

    if (!Number.isInteger(amount) || amount < 100) {
        return res.status(400).json({ message: 'Amount must be an integer of at least 100 paise.' });
    }
    if (!razorpay) {
        return res.status(503).json({ message: 'Razorpay is not configured on the server.' });
    }

    try {
        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: `drivedocs_${Date.now()}`
        });

        res.status(201).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Razorpay order creation failed:', error);
        const status = error.statusCode === 401 || error.statusCode === 403 ? 401 : 500;
        res.status(status).json({ message: status === 401 ? 'Razorpay authentication failed.' : 'Unable to create payment order.' });
    }
});

router.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields.' });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: 'Razorpay is not configured on the server.' });
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
    const signaturesMatch = expectedSignature.length === razorpay_signature.length &&
        crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!signaturesMatch) {
        return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    res.status(200).json({ verified: true, message: 'Payment verified successfully.' });
});

module.exports = router;