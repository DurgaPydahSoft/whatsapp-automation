const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, 'messages.json');

// Initialize storage file if it doesn't exist
if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({}, null, 2));
}

// Helper to safely read and parse JSON
const readData = () => {
    try {
        if (!fs.existsSync(STORAGE_FILE)) return {};
        const content = fs.readFileSync(STORAGE_FILE, 'utf8');
        if (!content || !content.trim()) return {};
        return JSON.parse(content);
    } catch (error) {
        console.error('STORAGE ERROR: Failed to parse messages.json. Using empty state.', error.message);
        return {};
    }
};

const storage = {
    // Save a message
    saveMessage: (chatId, message) => {
        try {
            const data = readData();
            if (!data[chatId]) {
                data[chatId] = { contact: {}, messages: [] };
            }
            // Ensure structure is correct (backward compatibility)
            if (Array.isArray(data[chatId])) {
                data[chatId] = { contact: {}, messages: data[chatId] };
            }
            
            data[chatId].messages.push({
                id: message.id || Date.now().toString(),
                from: message.from,
                body: message.body,
                isOutgoing: message.isOutgoing,
                timestamp: new Date().toISOString(),
                ack: message.ack || 0, // 0: sent, 1: delivered, 2: read
                mediaData: message.mediaData || null,
                mimetype: message.mimetype || null
            });
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving message to storage:', error);
        }
    },

    // Update message acknowledgment status
    updateMessageAck: (chatId, msgId, ack) => {
        try {
            const data = readData();
            if (data[chatId] && !Array.isArray(data[chatId])) {
                const msg = data[chatId].messages.find(m => m.id === msgId);
                if (msg) {
                    msg.ack = ack;
                    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
                    return true;
                }
            }
        } catch (error) {
            console.error('Error updating ack in storage:', error);
        }
        return false;
    },

    // Upsert a contact summary (for syncing existing chats)
    upsertContact: (chatId, name = '', profilePic = '', lastMessage = '', lastTime = new Date().toISOString()) => {
        try {
            const data = readData();
            if (!data[chatId] || Array.isArray(data[chatId])) {
                data[chatId] = { 
                    contact: { name, profilePic }, 
                    messages: [{
                        from: 'system',
                        body: lastMessage,
                        isOutgoing: false,
                        timestamp: lastTime,
                        isSync: true
                    }] 
                };
            } else {
                // Update existing contact info
                if (name) data[chatId].contact.name = name;
                if (profilePic) data[chatId].contact.profilePic = profilePic;
            }
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error upserting contact:', error);
        }
    },

    // Get messages for a contact
    getMessages: (chatId) => {
        try {
            const data = readData();
            const chat = data[chatId];
            if (!chat) return [];
            return Array.isArray(chat) ? chat : chat.messages;
        } catch (error) {
            console.error('Error reading messages from storage:', error);
            return [];
        }
    },

    // Get all chat summaries
    getAllChats: () => {
        try {
            const data = readData();
            return Object.keys(data).map(chatId => {
                const entry = data[chatId];
                const messages = Array.isArray(entry) ? entry : entry.messages;
                const contact = Array.isArray(entry) ? {} : entry.contact;
                const lastMessage = messages[messages.length - 1];
                return {
                    id: chatId,
                    name: contact.name || chatId.split('@')[0],
                    profilePic: contact.profilePic || '',
                    lastMessage: lastMessage ? lastMessage.body : '',
                    lastTime: lastMessage ? lastMessage.timestamp : null
                };
            }).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
        } catch (error) {
            console.error('Error reading chats from storage:', error);
            return [];
        }
    }
};

module.exports = storage;
