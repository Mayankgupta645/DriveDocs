const express = require('express');

const router = express.Router();

function cleanRegistrationNumber(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

router.get('/lookup', async (req, res) => {
    const registrationNumber = cleanRegistrationNumber(req.query.registrationNumber);
    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{3,4}$/.test(registrationNumber)) {
        return res.status(400).json({ message: 'Enter a valid vehicle registration number.' });
    }

    const providerUrl = process.env.VEHICLE_LOOKUP_API_URL?.trim();
    const providerToken = process.env.VEHICLE_LOOKUP_API_TOKEN?.trim();
    if (!providerUrl || !providerToken) {
        return res.status(503).json({
            code: 'VEHICLE_LOOKUP_NOT_CONFIGURED',
            message: 'Vehicle lookup is not configured. Enter the vehicle details manually or contact the administrator.'
        });
    }

    try {
        const response = await fetch(providerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${providerToken}`
            },
            body: JSON.stringify({ registrationNumber })
        });
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status === 401 || response.status === 403 ? 502 : 500)
                .json({ message: 'The vehicle-data provider could not complete this lookup.' });
        }

        res.json({
            vehicle: {
                registrationNumber,
                make: data.make || data.manufacturer || '',
                model: data.model || '',
                fuelType: data.fuelType || data.fuel || '',
                registrationDate: data.registrationDate || data.regDate || '',
                insuranceExpiry: data.insuranceExpiry || '',
                pucExpiry: data.pucExpiry || ''
            }
        });
    } catch (error) {
        console.error('Vehicle lookup failed:', error.message);
        res.status(502).json({ message: 'Vehicle lookup is temporarily unavailable.' });
    }
});

module.exports = router;