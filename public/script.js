const socket = io();

// UI Elements
const statusBadge = document.getElementById('status-badge');
const qrCanvas = document.getElementById('qr-canvas');
const qrMessage = document.getElementById('qr-message');
const qrContainer = document.getElementById('qr-container');
const qrOverlay = document.getElementById('qr-overlay');
const profileInfo = document.getElementById('profile-info');
const profilePic = document.getElementById('profile-pic');
const profileName = document.getElementById('profile-name');
const logoutBtn = document.getElementById('logout-btn');

const contactList = document.getElementById('contact-list');
const contactSearch = document.getElementById('contact-search');
const newChatBtn = document.getElementById('new-chat-btn');
const chatWindow = document.getElementById('chat-window');
const noChatView = document.getElementById('no-chat-selected');
const activeChatName = document.getElementById('active-chat-name');
const messageHistory = document.getElementById('message-history');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatImage = document.getElementById('chat-image');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const cancelPreview = document.getElementById('cancel-preview');

const bulkModal = document.getElementById('bulk-modal');
const bulkBtn = document.getElementById('bulk-toggle-btn');
const closeModal = document.querySelector('.close-modal');
const bulkForm = document.getElementById('bulk-form');

const logsContainer = document.getElementById('logs');
const toggleLogs = document.getElementById('logs-overlay');

let activeChatId = null;
let allChats = [];

// Initialization
async function initChat() {
    console.log('INIT: Starting chat app');
    console.log('QRCode library loaded:', typeof QRCode !== 'undefined');
    loadContacts();
    setupEventListeners();
}

// Fetch and render contacts from storage
async function loadContacts() {
    try {
        const response = await fetch('/chats');
        const data = await response.json();
        if (data.success) {
            allChats = data.chats;
            renderContactList(allChats);
        }
    } catch (error) {
        addLog('Error loading contacts: ' + error.message, 'error');
    }
}

function renderContactList(chats) {
    if (chats.length === 0) {
        contactList.innerHTML = '<div class="empty-list">No recent chats</div>';
        return;
    }

    const searchTerm = contactSearch.value.toLowerCase();
    const filtered = chats.filter(chat => {
        const number = chat.id.split('@')[0];
        const name = (chat.name || '').toLowerCase();
        return number.includes(searchTerm) || name.includes(searchTerm);
    });

    if (filtered.length === 0) {
        contactList.innerHTML = '<div class="empty-list">No matches found</div>';
        return;
    }

    contactList.innerHTML = filtered.map(chat => {
        const number = chat.id.split('@')[0];
        const name = chat.name || number;
        const lastMsg = chat.lastMessage || 'No messages yet';
        const avatar = chat.profilePic ? `<img src="${chat.profilePic}" alt="">` : number.slice(-2);
        const time = chat.lastTime ? new Date(chat.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        return `
            <div class="contact-item ${activeChatId === chat.id ? 'active' : ''}" onclick="selectChat('${chat.id}')">
                <div class="contact-avatar">${avatar}</div>
                <div class="contact-info">
                    <div class="contact-top">
                        <span class="contact-name">${name}</span>
                        <span class="contact-time">${time}</span>
                    </div>
                    <div class="contact-msg" title="${lastMsg}">${lastMsg}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Select a chat and load history
async function selectChat(chatId) {
    activeChatId = chatId;
    
    // Find contact info from current list
    const chat = allChats.find(c => c.id === chatId);
    const name = chat ? chat.name : chatId.split('@')[0];
    
    // Update UI
    noChatView.style.display = 'none';
    chatWindow.style.display = 'flex';
    activeChatName.textContent = name;
    
    // Highlight in list
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    renderContactList(allChats);

    // Load History
    try {
        const response = await fetch(`/chat/${chatId.split('@')[0]}`);
        const data = await response.json();
        if (data.success) {
            renderMessages(data.messages);
        }
    } catch (error) {
        addLog('Error loading messages: ' + error.message, 'error');
    }
}

function renderMessages(messages) {
    messageHistory.innerHTML = messages.map(msg => renderSingleMessage(msg)).join('');
    scrollToBottom();
}

function renderSingleMessage(msg) {
    const className = msg.isOutgoing ? 'outgoing' : 'incoming';
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let statusIcon = '';
    if (msg.isOutgoing) {
        if (msg.ack === 1) statusIcon = '<span class="msg-status delivered">✓✓</span>';
        else if (msg.ack >= 2) statusIcon = '<span class="msg-status read">✓✓</span>';
        else statusIcon = '<span class="msg-status sent">✓</span>';
    }

    let mediaHtml = '';
    if (msg.mediaData) {
        mediaHtml = `<img src="data:${msg.mimetype};base64,${msg.mediaData}" class="msg-image" alt="Media">`;
    }

    return `
        <div class="message ${className}" data-id="${msg.id}">
            ${mediaHtml}
            <div class="msg-content">${msg.body}</div>
            <div class="msg-meta">
                <span class="msg-time">${time}</span>
                ${statusIcon}
            </div>
        </div>
    `;
}

function addMessageToView(msg) {
    messageHistory.insertAdjacentHTML('beforeend', renderSingleMessage(msg));
    scrollToBottom();
}

function scrollToBottom() {
    messageHistory.scrollTop = messageHistory.scrollHeight;
}

// Socket Events
socket.on('status', (status) => updateStatus(status));

socket.on('qr', (qrCode) => {
    console.log('FRONTEND: Received QR code string');
    qrOverlay.style.display = 'flex';
    qrCanvas.style.display = 'block';
    qrMessage.textContent = 'Scan the QR code to connect';
    
    try {
        QRCode.toCanvas(qrCanvas, qrCode, { width: 240, margin: 2 }, (error) => {
            if (error) {
                console.error('QR Rendering Error:', error);
                qrMessage.textContent = 'Error rendering QR code';
                addLog('QR Rendering Error: ' + error.message, 'error');
            } else {
                console.log('QR Rendering Success');
            }
        });
    } catch (err) {
        console.error('QRCode.toCanvas Exception:', err);
    }
    
    addLog('QR Code received. Please scan.');
});

socket.on('ready', (data) => {
    updateStatus('connected');
    qrOverlay.style.display = 'none';
    profileInfo.style.display = 'flex';
    if (data && data.name) {
        profilePic.src = data.profilePic || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FhYSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MzLjE0IDAgNiAyLjg2IDYgNnMtMi44NiA2LTYtNi02LTIuODYtNi02IDIuODYtNiA2LTZ6bTAgMTNjLTMuMzYgMC02LjU0LTEuNzgtOC00LjU1LjA0LTIuOTcgMzg3LjY3LTYgOC02czcuOTYgMy4wMyA4IDZjLTEuNDYgMi43Ny00LjY0IDQuNTUtOCA0LjU1eiIvPjwvc3ZnPg==';
        profileName.textContent = data.name;
    }
    loadContacts();
});

socket.on('sync_completed', () => {
    addLog('Background sync completed.');
    loadContacts();
});

socket.on('message_ack', (data) => {
    console.log('Real-time ACK:', data);
    if (activeChatId === data.chatId) {
        const messageEl = document.querySelector(`.message.outgoing[data-id="${data.msgId}"]`);
        if (messageEl) {
            const statusContainer = messageEl.querySelector('.msg-meta');
            let statusIcon = '<span class="msg-status sent">✓</span>';
            if (data.ack === 1) statusIcon = '<span class="msg-status delivered">✓✓</span>';
            else if (data.ack >= 2) statusIcon = '<span class="msg-status read">✓✓</span>';
            
            const existingStatus = statusContainer.querySelector('.msg-status');
            if (existingStatus) existingStatus.outerHTML = statusIcon;
            else statusContainer.insertAdjacentHTML('beforeend', statusIcon);
        }
    }
});

socket.on('incoming_message', (msg) => {
    addLog(`New message from ${msg.from}`);
    if (activeChatId === msg.from) {
        addMessageToView(msg);
    }
    loadContacts();
});

socket.on('disconnected', () => {
    updateStatus('disconnected');
    qrOverlay.style.display = 'flex';
    qrCanvas.style.display = 'none';
    qrMessage.textContent = 'WhatsApp Disconnected';
    profileInfo.style.display = 'none';
});

// Helper: File to Base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            data: reader.result.split(',')[1],
            mimetype: file.type,
            filename: file.name
        });
        reader.onerror = error => reject(error);
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Logout
    logoutBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to log out of this WhatsApp account?')) return;
        
        try {
            const response = await fetch('/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                // Fully clear UI state
                activeChatId = null;
                allChats = [];
                renderContactList([]); // This clears the sidebar
                chatWindow.style.display = 'none';
                noChatView.style.display = 'flex';
                profileInfo.style.display = 'none';
                
                qrOverlay.style.display = 'flex';
                qrCanvas.style.display = 'none'; // Hide old QR
                qrMessage.textContent = 'Preparing new session...';
                
                addLog('Logged out from WhatsApp account.', 'info');
            } else {
                alert('Logout failed: ' + data.error);
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout error: ' + error.message);
        }
    });

    // Image Preview
    chatImage.addEventListener('change', () => {
        const file = chatImage.files[0];
        if (file) {
            chatInput.placeholder = "Add a caption...";
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                previewContainer.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    });

    cancelPreview.addEventListener('click', () => {
        chatImage.value = '';
        previewContainer.style.display = 'none';
        imagePreview.src = '';
        chatInput.placeholder = "Type a message";
    });

    // Search
    contactSearch.addEventListener('input', () => {
        renderContactList(allChats);
    });

    // New Chat
    newChatBtn.addEventListener('click', () => {
        const number = prompt('Enter WhatsApp number with country code (e.g., 919010462357):');
        if (number) {
            const chatId = number.includes('@') ? number : `${number.replace(/\D/g, '')}@c.us`;
            selectChat(chatId);
        }
    });

    // Chat Form
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeChatId) return;

        const number = activeChatId.split('@')[0];
        const message = chatInput.value;
        const imageFile = chatImage.files[0];

        if (!message && !imageFile) return;

        try {
            let media = null;
            let previewData = null;
            if (imageFile) {
                media = await fileToBase64(imageFile);
                previewData = media.data; // Keep for optimistic UI
            }

            // Optimistic Update
            addMessageToView({ 
                id: 'temp-' + Date.now(),
                body: message || (imageFile ? '' : '[Media]'), 
                isOutgoing: true, 
                timestamp: new Date().toISOString(),
                mediaData: previewData,
                mimetype: imageFile ? imageFile.type : null,
                ack: 0
            });

            // Clear inputs and preview immediately
            chatInput.value = '';
            chatImage.value = '';
            previewContainer.style.display = 'none';
            imagePreview.src = '';
            chatInput.placeholder = "Type a message";

            const response = await fetch('/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number, message, media })
            });

            const data = await response.json();
            if (!data.success) {
                addLog('Send failed: ' + data.error, 'error');
            }
        } catch (error) {
            addLog('Send failed: ' + error.message, 'error');
        }
    });

    // Bulk Modal
    bulkBtn.onclick = () => bulkModal.style.display = 'flex';
    closeModal.onclick = () => bulkModal.style.display = 'none';
    window.onclick = (event) => { if (event.target == bulkModal) bulkModal.style.display = 'none'; };

    // Bulk Form
    bulkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const numbers = document.getElementById('numbers').value.split(',').map(n => n.trim()).filter(n => n);
        const message = document.getElementById('bulk-message').value;
        const imageFile = document.getElementById('bulk-image').files[0];

        try {
            let media = null;
            if (imageFile) media = await fileToBase64(imageFile);

            const response = await fetch('/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numbers, message, media })
            });
            const data = await response.json();
            if (data.success) {
                addLog('Bulk sending started...');
                bulkModal.style.display = 'none';
                bulkForm.reset();
                loadContacts();
            }
        } catch (error) {
            addLog('Bulk failed: ' + error.message, 'error');
        }
    });

    // Toggle Logs
    toggleLogs.onclick = () => {
        const logs = document.getElementById('logs');
        const arrow = document.getElementById('toggle-logs');
        if (logs.style.display === 'none') {
            logs.style.display = 'block';
            arrow.textContent = '▲';
        } else {
            logs.style.display = 'none';
            arrow.textContent = '▼';
        }
    };
}

// Helpers
function updateStatus(status) {
    console.log('Status Update:', status);
    statusBadge.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
    statusBadge.className = `badge ${status}`;
    
    if (status === 'disconnected') {
        qrOverlay.style.display = 'flex';
        qrCanvas.style.display = 'none'; // Will be shown when QR event hits
        profileInfo.style.display = 'none';
        noChatView.style.display = 'flex';
        chatWindow.style.display = 'none';
    } else {
        qrOverlay.style.display = 'none';
        profileInfo.style.display = 'flex';
    }
}

function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.prepend(entry);
}

// Start
initChat();
