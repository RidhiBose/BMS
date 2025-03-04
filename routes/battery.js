const express = require('express');
const Battery = require('../models/Battery');
const router = express.Router();

// Get Latest Battery Status
router.get('/status', async (req, res) => {
    try {
        const latestData = await Battery.findOne().sort({ timestamp: -1 });
        res.json(latestData || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve battery status' });
    }
});

module.exports = router;