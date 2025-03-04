// Import Dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

// Initialize App
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(cors());

// Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
// })
// .then(() => console.log('✅ MongoDB Connected'))
// .catch(err => {
//     console.error('❌ MongoDB Connection Error:', err);
//     process.exit(1); // Exit process if connection fails
// });
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bms';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define User Schema BEFORE Using It
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Battery Schema & Model
const BatterySchema = new mongoose.Schema({
    charge: { type: Number, required: true },
    voltage: { type: Number, required: true },
    temperature: { type: Number, required: true },
    faults: { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now }
});
const Battery = mongoose.model('Battery', BatterySchema);

// Authentication Middleware
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const authMiddleware = (req, res, next) => {
//     const token = req.header('Authorization');
//     if (!token) return res.status(401).send('Access Denied');
//     try {
//         const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
//         req.user = verified;
//         next();
//     } catch (err) {
//         res.status(400).send('Invalid Token');
//     }
// };
const authMiddleware = require('./middleware/authMiddleware');
app.use('/battery/status', authMiddleware, require('./routes/battery'));


// Register Route
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).send('User Registered');
    } catch (error) {
        res.status(400).send('Error Registering User');
    }
});

// Login Route
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send('Invalid credentials');
        }
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(400).send('Login Error');
    }
});

// Battery Status Route
app.get('/battery/status', authMiddleware, async (req, res) => {
    const latestData = await Battery.findOne().sort({ timestamp: -1 });
    res.json(latestData || { message: 'No data available' });
});

// Battery History Route
app.get('/battery/history', authMiddleware, async (req, res) => {
    const history = await Battery.find().sort({ timestamp: -1 }).limit(50);
    res.json(history);
});

// Simulated Data Generator
setInterval(async () => {
    try {
        const charge = Math.floor(Math.random() * 100);
        const voltage = (Math.random() * 50 + 300).toFixed(2);
        const temperature = Math.floor(Math.random() * 50);
        let faults = [];
        if (charge < 10) faults.push('Low Charge');
        if (temperature > 40) faults.push('Overheating');
        const newBatteryData = new Battery({ charge, voltage, temperature, faults });
        await newBatteryData.save();
        io.emit('battery_update', newBatteryData);
    } catch (error) {
        console.error('Error generating battery data:', error);
    }
}, 5000);

// WebSocket for Real-time Updates
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));
});

// Start Server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
