// chat-server/index.js 

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const mongoose = require('mongoose');

const Message = require('./models/message.js');


const getUsersInRoom = async (room) => {
  
  const socketsInRoom = await io.in(room).fetchSockets();
  
  const users = socketsInRoom.map(socket => socket.data.username);
  return users;
};

const io = new Server(server, {
  cors: {
    origin: "https://abyssinia-chat-app.vercel.app/", 

    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

const MONGO_URI = process.env.MONGO_URI;


mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

  



io.on('connection', (socket) => {
  console.log(`A user connected with ID: ${socket.id}`);

  
  

socket.on('join_room', async (data) => {
  const { username, room } = data;
  if (username && room) {
    socket.join(room);
    
    socket.data.username = username;
    socket.data.room = room;

    console.log(`User ${username} (${socket.id}) joined room: ${room}`);

    
    try {
      const chatHistory = await Message.find({ room: room }).sort({ timestamp: 'asc' });
      socket.emit('chat_history', chatHistory);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }

 
    const users = await getUsersInRoom(room);
    io.to(room).emit('room_users', users);

   
    const systemMessage = {
      author: 'System',
      text: `${username} has joined the chat.`,
      timestamp: new Date().toISOString()
    };
    socket.broadcast.to(room).emit('chat message', systemMessage);
  }
});


   socket.on('chat message', async (data) => {
    try {
      const roomSockets = io.sockets.adapter.rooms.get(data.room);
      const numUsersInRoom = roomSockets ? roomSockets.size : 0;

      
      const status = numUsersInRoom > 1 ? 'seen' : 'sent';

      const newMessage = new Message({
        room: data.room,
        author: data.author,
        text: data.text,
        status: status 
      });

      const savedMessage = await newMessage.save();
      io.to(data.room).emit('chat message', savedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
   
  socket.on('typing_start', (data) => {
    
    socket.broadcast.to(data.room).emit('typing_start', data.username);
  });


  
  socket.on('typing_stop', (data) => {
   
    socket.broadcast.to(data.room).emit('typing_stop', data.username);
  });
 
  socket.on('message_seen', async (messageId) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId, 
        { status: 'seen' },
        { new: true } 
      );

      if (updatedMessage) {
        
        io.to(updatedMessage.room).emit('message_status_updated', updatedMessage);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  });


  
socket.on('disconnect', async () => { 
  const username = socket.data.username;
  const room = socket.data.room;

  if (username && room) {
    console.log(`User ${username} disconnected from room ${room}`);

   
    const users = await getUsersInRoom(room);
    io.to(room).emit('room_users', users);

    
    const systemMessage = {
      author: 'System',
      text: `${username} has left the chat.`,
      timestamp: new Date().toISOString()
    };
    io.to(room).emit('chat message', systemMessage);
  } else {
    console.log(`An anonymous user (${socket.id}) disconnected without joining a room.`);
  }
});
});

server.listen(PORT, () => {
  console.log(`Server is running and listening on http://localhost:${PORT}`);
});