const express = require('express');
const Battery = require('../models/Battery');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Protected Route: Get Latest Battery Status
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const latestData = await Battery.findOne().sort({ timestamp: -1 });
        res.json(latestData || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve battery status' });
    }
});

module.exports = router;
