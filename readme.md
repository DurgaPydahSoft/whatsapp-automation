I want to build a WhatsApp automation service using Node.js and the whatsapp-web.js library.

Project Requirements:

1. Tech Stack:

- Node.js (latest LTS)
- Express.js
- whatsapp-web.js
- qrcode-terminal
- dotenv
- nodemon (for development)

2. Core Features:

- Initialize WhatsApp client
- Generate and display QR code in terminal for first-time login
- Persist session locally so QR is not required every time
- Send message API endpoint
- Send bulk messages API endpoint
- Check connection status endpoint
- Proper error handling
- Logging system
- Graceful shutdown handling

3. API Endpoints Required:

POST /send-message
Body:
{
  "number": "919XXXXXXXXX",
  "message": "Hello from Node WhatsApp"
}

POST /send-bulk
Body:
{
  "numbers": ["919XXXXXXXXX", "918XXXXXXXXX"],
  "message": "Bulk message test"
}

GET /status

4. Functional Requirements:

- Automatically format number to WhatsApp format (add @c.us)
- Validate numbers before sending
- Handle client not ready state
- Prevent crash if WhatsApp disconnects
- Reconnect automatically if session drops
- Use async/await properly
- Modular folder structure

5. Folder Structure:
   |-- server.js
   |-- whatsappClient.js
   |-- routes.js
   |-- .env
   |-- package.json
6. Additional Requirements:

- Use LocalAuth for session persistence
- Add event listeners:
  - ready
  - qr
  - authenticated
  - auth_failure
  - disconnected
- Add console logs for each event
- Add rate limiting for bulk messages (delay 3-5 seconds between messages)
- Add proper try-catch blocks

7. Provide:

- Full package.json
- Complete working code
- Installation steps
- Run commands
- Explanation of how it works

The final solution must be production-ready and cleanly structured.
