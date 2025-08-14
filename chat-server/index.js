const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const Message = require('./models/message.js');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://abyssinia-chat-app.vercel.app",
  new RegExp(/^https?:\/\/abyssinia-chat-app-.*\.vercel\.app$/)
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const io = new Server(server, {
  cors: corsOptions
});

const getUsersInRoom = async (room) => {
  const socketsInRoom = await io.in(room).fetchSockets();
  return socketsInRoom.map(socket => socket.data.username);
};

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI).then(() => console.log('Successfully connected to MongoDB')).catch(err => console.error('Could not connect to MongoDB', err));


app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  if (req.file.size > 10 * 1024 * 1024) return res.status(413).send('File too large (max 10MB)');

  try {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
      folder: "chat_uploads"
    });
    
    const newMessage = new Message({
      room: req.body.room,
      author: req.body.author,
      text: result.secure_url,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 'file',
      fileUrl: result.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'sent'
    });

    await newMessage.save();
    io.to(req.body.room).emit('chat message', newMessage);
    res.status(200).send('File uploaded');
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Upload failed');
  }
});

io.on('connection', (socket) => {
  console.log(`A user connected with ID: ${socket.id}`);
  socket.on('join_room', async (data) => {
    const { username, room } = data;
    if (username && room) {
      socket.join(room);
      socket.data.username = username;
      socket.data.room = room;
      console.log(`User ${username} joined room: ${room}`);
      try {
        const chatHistory = await Message.find({ room }).sort({ timestamp: 'asc' });
        socket.emit('chat_history', chatHistory);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
      const users = await getUsersInRoom(room);
      io.to(room).emit('room_users', users);
      const systemMessage = { author: 'System', text: `${username} has joined the chat.`, timestamp: new Date().toISOString() };
      socket.broadcast.to(room).emit('chat message', systemMessage);
    }
  });

  socket.on('chat message', async (data) => {
    try {
      const roomSockets = io.sockets.adapter.rooms.get(data.room);
      const numUsersInRoom = roomSockets ? roomSockets.size : 0;
      const status = numUsersInRoom > 1 ? 'seen' : 'sent';
      const newMessage = new Message({ room: data.room, author: data.author, text: data.text, type: data.type || 'text', status });
      const savedMessage = await newMessage.save();
      io.to(data.room).emit('chat message', savedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('message_seen', async (messageId) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(messageId, { status: 'seen' }, { new: true });
      if (updatedMessage) {
        io.to(updatedMessage.room).emit('message_updated', updatedMessage);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  });

  socket.on('message_reacted', async (data) => {
    try {
      const { messageId, reaction } = data;
      const message = await Message.findById(messageId);
      if (message) {
        const userPreviousReactionIndex = message.reactions.findIndex((r) => r.user === reaction.user);
        if (userPreviousReactionIndex > -1) {
          if (message.reactions[userPreviousReactionIndex].emoji === reaction.emoji) {
            message.reactions.splice(userPreviousReactionIndex, 1);
          } else {
            message.reactions[userPreviousReactionIndex].emoji = reaction.emoji;
          }
        } else {
          message.reactions.push(reaction);
        }
        const updatedMessage = await message.save();
        io.to(updatedMessage.room).emit('message_updated', updatedMessage);
      }
    } catch (error) {
      console.error('Error handling message reaction:', error);
    }
  });

  socket.on('typing_start', (data) => {
    socket.broadcast.to(data.room).emit('typing_start', data.username);
  });
  
  socket.on('typing_stop', (data) => {
    socket.broadcast.to(data.room).emit('typing_stop', data.username);
  });
  
  socket.on('disconnect', async () => {
    const { username, room } = socket.data;
    if (username && room) {
      console.log(`User ${username} disconnected from room ${room}`);
      const users = await getUsersInRoom(room);
      io.to(room).emit('room_users', users);
      const systemMessage = { author: 'System', text: `${username} has left the chat.`, timestamp: new Date().toISOString() };
      io.to(room).emit('chat message', systemMessage);
    } else {
      console.log(`An anonymous user (${socket.id}) disconnected`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running and listening on port: ${PORT}`);
});