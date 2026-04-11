require("dotenv").config({ path: './config/.env' });
const express = require("express");
const cors = require("cors");
const db = require("./db/connection");
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();

db.getConnection()
    .then((connection) => {
        console.log('Database connection verified');
        connection.release();
    })
    .catch((err) => {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    });

// Middleware
app.use(cors());
app.use(express.json());

// Import CommonJS routes dynamically
const usersRouter = require("./routes/usersRoutes");
const messagesRouter = require("./routes/messagesRoutes");
const postsRouter = require("./routes/postsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const publicAdminRoutes = require("./routes/publicAdminRoutes");

app.use('/api', usersRouter);
app.use('/api', messagesRouter);
app.use('/api', postsRouter);
app.use('/api', notificationsRoutes);
app.use('/api/admin/public', publicAdminRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const onlineUsers = new Set();

io.on('connection', (socket) => {
    console.log('🔌 Socket CONNECTED:', socket.id, 'from IP:', socket.handshake.address.address);
    
    socket.on('join', (userId) => {
        console.log('🏠 JOIN REQUEST:', userId, 'current rooms before:', Array.from(socket.rooms));
        socket.join(userId.toString());
        onlineUsers.add(userId);
        console.log(`✅ User ${userId} JOINED room ${userId.toString()}, now in rooms:`, Array.from(socket.rooms));
        console.log('📊 Online users:', Array.from(onlineUsers));
        
        // Broadcast online status change
        socket.broadcast.emit('userOnline', userId);
        io.emit('onlineUsers', Array.from(onlineUsers));
    });
    
    socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        const userRoom = rooms.find(room => room !== socket.id);
        console.log('🔌 DISCONNECT:', socket.id, 'was in rooms:', rooms, 'userRoom:', userRoom);
        if (userRoom) {
            onlineUsers.delete(userRoom);
            console.log(`👋 User ${userRoom} DISCONNECTED`);
            io.emit('userOffline', userRoom);
            io.emit('onlineUsers', Array.from(onlineUsers));
        } else {
            console.log('❓ Unknown user disconnected:', socket.id);
        }
    });

    // Notification socket handlers
    socket.on('markNotificationRead', (data) => {
        io.to(data.userId.toString()).emit('notificationRead', data.notificationId);
    });
    
    socket.on('newNotification', (data) => {
        io.to(data.receiverId.toString()).emit('newNotification', data);
    });
});

global.io = io;
global.db = db;

const port = process.env.PORT || 8000;
httpServer.listen(port, () => {
    console.log(`Server with Socket.io is Running on port ${port}`);
});

