# Chat Website System

A real-time messaging web application built with modern technologies, featuring secure authentication and optimized performance.

## 🚀 Demo

**Live Demo**: [https://messaging-web-client.vercel.app](https://messaging-web-client.vercel.app)
**Frontend Source**: [https://github.com/GiangTechiee/MessagingWebClient.git](https://github.com/GiangTechiee/MessagingWebClient.git)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## 📖 Overview

This chat website system is built using a client-server architecture with real-time messaging capabilities. The project demonstrates full-stack development skills with modern Node.js frameworks and database integration.

## ✨ Features

- 🔐 **Secure Authentication** - User registration and login with JWT tokens
- 💬 **Real-time Messaging** - Instant chat using Socket.io
- 📱 **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- ⚡ **High Performance** - Redis caching for optimized messaging
- 🛡️ **API Security** - Protected routes and data validation
- 💾 **Persistent Storage** - PostgreSQL database with proper schema design

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **NestJS** - Progressive Node.js framework
- **Socket.io** - Real-time bidirectional event-based communication
- **PostgreSQL** - Relational database
- **Redis** - In-memory data structure store for caching

### Frontend
- **Next.js** - React framework for production
- **React** - JavaScript library for building user interfaces
- **Tailwind CSS** - Utility-first CSS framework

## 🔧 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL
- Redis
- npm or yarn

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/GiangTechiee/MessagingWebServer.git
cd MessagingWebServer

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Update .env with your database and Redis configurations

# Run database migrations
npm run migration:run

# Start the development server
npm run start:dev
```

### Frontend Setup
```bash
# Clone the frontend repository 
git clone [https://github.com/GiangTechiee/MessagingWebClient.git]
cd messaging-web-client

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Update with your API endpoints

# Start the development server
npm run dev
```

## 🎯 Usage

1. **Register/Login**: Create a new account or login with existing credentials
2. **Join Rooms**: Create or join chat rooms
3. **Real-time Chat**: Send and receive messages instantly
4. **User Management**: View online users and chat history

## 📚 API Documentation

### Authentication Endpoints
```
POST /auth/register - Register new user
POST /auth/login    - User login
POST /auth/logout   - User logout
```

### Chat Endpoints
```
GET    /conversations          - Get all conversations
POST   /conversations          - Create new conversation
GET    /conversations/:id      - Get conversation details
GET    /messages/conversation/conversationId - Get conversation messages
POST   /messages        - Send message
PATCH  /messages        - Update message
```

### WebSocket Events
```
connection          - User connects to socket
join_room          - Join specific room
leave_room         - Leave specific room
send_message       - Send message to room
receive_message    - Receive message from room
user_typing        - User typing indicator
disconnect         - User disconnects
```

## 📁 Project Structure

```
messaging-web-server/
├── src/
│   ├── auth/           # Authentication module
│   ├── chat/           # Chat functionality
│   ├── users/          # User management
│   ├── database/       # Database configuration
│   ├── common/         # Shared utilities
│   └── main.ts         # Application entry point
├── test/               # Test files
├── migrations/         # Database migrations
└── README.md
```

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Trần Trường Giang**
- Email: giangtt8726@gmail.com
- GitHub: [@GiangTechiee](https://github.com/GiangTechiee)

---

⭐ Star this repository if you found it helpful!
