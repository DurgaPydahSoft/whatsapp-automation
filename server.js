require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const { client } = require('./whatsappClient');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

// Initialize WhatsApp Client with Socket
const { init } = require('./whatsappClient');
init(io);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Routes
app.use('/', routes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Socket Handler
io.on('connection', (socket) => {
    console.log('Client connected to dashboard.');
    
    // Send current status on connection
    const { isClientReady, getProfileData, getLatestQr } = require('./whatsappClient');
    if (isClientReady()) {
        socket.emit('status', 'connected');
        getProfileData().then(data => {
            if (data) socket.emit('ready', data);
        });
    } else {
        socket.emit('status', 'disconnected');
        const latestQr = getLatestQr();
        if (latestQr) {
            socket.emit('qr', latestQr);
        }
    }
});

// Start Server
const server = http.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`WhatsApp Automation Service running on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop the server.`);
    console.log(`===============================================`);
});

// Graceful Shutdown Handling
const gracefulShutdown = () => {
    console.log('\nShutting down gracefully...');
    server.close(async () => {
        console.log('HTTP server closed.');
        try {
            await client.destroy();
            console.log('WhatsApp client destroyed.');
            process.exit(0);
        } catch (error) {
            console.error('Error during WhatsApp client destruction:', error);
            process.exit(1);
        }
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
