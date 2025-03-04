const Battery = require('../models/Battery');
const { Server } = require('socket.io');

const generateBatteryData = async (io) => {
    setInterval(async () => {
        const charge = Math.floor(Math.random() * 100);
        const voltage = (Math.random() * 50 + 300).toFixed(2);
        const temperature = Math.floor(Math.random() * 50);
        let faults = [];
        if (charge < 10) faults.push('Low Charge');
        if (temperature > 40) faults.push('Overheating');

        const newBatteryData = new Battery({ charge, voltage, temperature, faults });
        await newBatteryData.save();
        io.emit('battery_update', newBatteryData);
    }, 5000);
};

module.exports = generateBatteryData;