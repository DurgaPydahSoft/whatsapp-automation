const express = require('express');
const router = express.Router();
const { MessageMedia } = require('whatsapp-web.js');
const { client, formatNumber, isClientReady, logout } = require('./whatsappClient');
const storage = require('./storage');

// POST /logout - Disconnect current session
router.post('/logout', async (req, res) => {
    try {
        const result = await logout();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /status - Check connection status
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: isClientReady() ? 'connected' : 'disconnected',
        message: isClientReady() ? 'WhatsApp client is ready.' : 'WhatsApp client is not ready. Please check terminal for QR code or logs.'
    });
});

// GET /chats - Get all chat sessions
router.get('/chats', (req, res) => {
    const chats = storage.getAllChats();
    res.json({ success: true, chats });
});

// GET /chat/:number - Get history for a specific number
router.get('/chat/:number', (req, res) => {
    const number = req.params.number;
    const chatId = formatNumber(number);
    const messages = storage.getMessages(chatId);
    res.json({ success: true, messages });
});

// POST /send-message - Send a single message (with optional media)
router.post('/send-message', async (req, res) => {
    const { number, message, media } = req.body;

    if (!number || (!message && !media)) {
        return res.status(400).json({ success: false, error: 'Number and message/media are required.' });
    }

    if (!isClientReady()) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready.' });
    }

    try {
        const chatId = formatNumber(number);
        let sentMsg;
        
        if (media) {
            const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename);
            sentMsg = await client.sendMessage(chatId, messageMedia, { caption: message });
        } else {
            sentMsg = await client.sendMessage(chatId, message);
        }
        
        // Persist sent message with ID and initial ack
        storage.saveMessage(chatId, {
            id: sentMsg.id.id,
            from: 'me',
            body: message || '[Media]',
            isOutgoing: true,
            hasMedia: !!media,
            mediaData: media ? media.data : null,
            mimetype: media ? media.mimetype : null,
            ack: sentMsg.ack
        });

        console.log(`Message sent to ${number}`);
        res.json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message.' });
    }
});

// POST /send-bulk - Send messages to multiple numbers with delay (with optional media)
router.post('/send-bulk', async (req, res) => {
    const { numbers, message, media } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0 || (!message && !media)) {
        return res.status(400).json({ success: false, error: 'An array of numbers and a message/media are required.' });
    }

    if (!isClientReady()) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready.' });
    }

    res.json({ success: true, message: 'Bulk sending started. Check server logs for progress.' });

    // Processing in background to avoid timeout
    for (const number of numbers) {
        try {
            const chatId = formatNumber(number);
            
            if (media) {
                const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename);
                await client.sendMessage(chatId, messageMedia, { caption: message });
            } else {
                await client.sendMessage(chatId, message);
            }
            
            // Persist sent message
            storage.saveMessage(chatId, {
                from: 'me',
                body: message || '[Media]',
                isOutgoing: true,
                hasMedia: !!media
            });

            console.log(`Bulk message sent to ${number}`);
            
            // Random delay between 3-5 seconds as per requirements
            const delay = Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
            await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
            console.error(`Failed to send bulk message to ${number}:`, error);
        }
    }
});

module.exports = router;
