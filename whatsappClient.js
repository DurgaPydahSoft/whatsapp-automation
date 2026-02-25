const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const storage = require('./storage');

let client;
let isReady = false;
let io = null;
let lastQr = null;

function initializeClient() {
    console.log('INITIALIZING CLIENT: Creating new instance...');
    lastQr = null;
    
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            handleSIGINT: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions'
            ],
        }
    });

    // Event: QR Code generation
    client.on('qr', (qr) => {
        console.log('QR RECEIVED: New QR code generated.');
        lastQr = qr;
        qrcode.generate(qr, { small: true }); // Display in terminal for verification
        
        if (io) {
            io.emit('qr', qr);
        }
    });

    // Event: Authenticated
    client.on('authenticated', () => {
        console.log('AUTHENTICATED: Session is now active.');
        if (io) io.emit('authenticated', true);
    });

    // Event: Authentication Failure
    client.on('auth_failure', msg => {
        console.error('AUTHENTICATION FAILURE:', msg);
        if (io) io.emit('auth_failure', msg);
    });

    // Event: Ready
    client.on('ready', async () => {
        console.log('CLIENT READY: WhatsApp client is ready.');
        isReady = true;

        // Fetch Profile Info
        try {
            const info = client.info;
            const contact = await client.getContactById(info.wid._serialized);
            const profilePicUrl = await contact.getProfilePicUrl();
            
            const profileData = {
                name: info.pushname || contact.name || contact.pushname,
                number: info.wid.user,
                profilePic: profilePicUrl
            };

            if (io) io.emit('ready', profileData);

            // Sync Existing Chats (Optimized for Speed)
            setTimeout(async () => {
                try {
                    console.log('SYNC: Starting fast parallel sync...');
                    if (!client) return;

                    const chats = await client.getChats().catch(e => {
                        console.error('SYNC ERROR: Could not fetch initial chats:', e.message);
                        return [];
                    });

                    // Sync the last 10 chats in parallel
                    const syncTasks = chats.slice(0, 10).map(async (chat) => {
                        if (!chat.lastMessage) return;

                        try {
                            const contact = await chat.getContact();
                            const profilePicUrl = await contact.getProfilePicUrl().catch(() => '');
                            
                            let displayName = chat.name || contact.name || contact.pushname || chat.id.user;
                            if (!chat.isGroup && contact.pushname) displayName = contact.pushname;
                            if (contact.name) displayName = contact.name;

                            storage.upsertContact(
                                chat.id._serialized,
                                displayName,
                                profilePicUrl,
                                chat.lastMessage.body || '[Media]',
                                new Date(chat.lastMessage.timestamp * 1000).toISOString()
                            );
                        } catch (contactError) {
                            // Silent fallback for individual failing contacts
                            storage.upsertContact(
                                chat.id._serialized, 
                                chat.name || chat.id.user, 
                                '', 
                                chat.lastMessage.body || '[Media]', 
                                new Date(chat.lastMessage.timestamp * 1000).toISOString()
                            );
                        }
                    });

                    await Promise.allSettled(syncTasks);
                    
                    console.log('SYNC: Fast sync completed.');
                    if (io) io.emit('sync_completed', true);
                } catch (syncError) {
                    console.error('SYNC ERROR: Unexpected failure during parallel sync:', syncError);
                }
            }, 1000); 
        } catch (error) {
            console.error('Error in ready event:', error);
            if (io) io.emit('ready', true);
        }
    });

    // Event: Incoming Message
    client.on('message', async (msg) => {
        console.log(`MESSAGE RECEIVED FROM ${msg.from}: ${msg.body}`);
        
        let displayName = '';
        let profilePic = '';
        let mediaData = null;
        let mimetype = null;

        try {
            const contact = await msg.getContact();
            const chat = await msg.getChat();
            
            displayName = chat.name || contact.name || contact.pushname || msg.from.split('@')[0];
            if (!chat.isGroup && contact.pushname) {
                displayName = contact.pushname;
            }
            if (contact.name) displayName = contact.name;

            profilePic = await contact.getProfilePicUrl().catch(() => '');
            
            storage.upsertContact(msg.from, displayName, profilePic);

            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media) {
                    mediaData = media.data;
                    mimetype = media.mimetype;
                }
            }
        } catch (e) {
            console.error('Error fetching sender/media info:', e);
            displayName = msg.from.split('@')[0];
        }

        const messageData = {
            id: msg.id.id,
            from: msg.from,
            body: msg.body,
            isOutgoing: false,
            type: msg.type,
            hasMedia: msg.hasMedia,
            mediaData: mediaData,
            mimetype: mimetype,
            timestamp: new Date().toISOString(),
            name: displayName,
            profilePic: profilePic
        };

        storage.saveMessage(msg.from, messageData);

        if (io) {
            io.emit('incoming_message', messageData);
        }
    });

    // Event: Message Acknowledgment (Ticks)
    client.on('message_ack', (msg, ack) => {
        const chatId = msg.to;
        const msgId = msg.id.id;
        
        storage.updateMessageAck(chatId, msgId, ack);
        
        if (io) {
            io.emit('message_ack', { chatId, msgId, ack });
        }
    });

    // Event: Disconnected
    client.on('disconnected', async (reason) => {
        console.log('CLIENT DISCONNECTED:', reason);
        isReady = false;
        if (io) io.emit('disconnected', reason);
        
        try {
            await client.destroy();
            console.log('RE-INITIALIZING after disconnection...');
            initializeClient();
        } catch (e) {
            console.error('Error re-initializing after disconnection:', e);
        }
    });

    client.initialize();
}

// Helper: Format number to WhatsApp format
const formatNumber = (number) => {
    let formatted = number.replace(/\D/g, '');
    if (!formatted.endsWith('@c.us')) {
        formatted = `${formatted}@c.us`;
    }
    return formatted;
};

module.exports = {
    init: (socketIo) => {
        io = socketIo;
        if (!client) initializeClient();
        return client;
    },
    get client() { return client; },
    formatNumber,
    isClientReady: () => isReady,
    getLatestQr: () => lastQr,
    logout: async () => {
        try {
            console.log('LOGOUT REQUESTED: Logging out...');
            await client.logout();
            isReady = false;
            if (io) io.emit('status', 'disconnected');
            
            console.log('DESTROYING CLIENT...');
            await client.destroy();
            
            console.log('LOGOUT SUCCESSFUL. Re-initializing for next user...');
            initializeClient();

            return { success: true };
        } catch (error) {
            console.error('LOGOUT ERROR:', error);
            return { success: false, error: error.message };
        }
    },
    getProfileData: async () => {
        if (!isReady || !client || !client.info) return null;
        try {
            const contact = await client.getContactById(client.info.wid._serialized);
            const profilePicUrl = await contact.getProfilePicUrl().catch(() => '');
            return {
                name: client.info.pushname || contact.name || contact.pushname || 'Connected',
                number: client.info.wid.user,
                profilePic: profilePicUrl
            };
        } catch (e) {
            return {
                name: client.info.pushname || 'Connected',
                number: client.info.wid.user,
                profilePic: ''
            };
        }
    }
};
