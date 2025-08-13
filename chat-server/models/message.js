// models/message.js

const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
  room: { 
    type: String, 
    required: true 
  },
  author: { 
    type: String, 
    required: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    default: 'text' 
  },
  fileUrl: {
    type: String,
    default: ''
  },
    status: {
    type: String,
    
    default: 'seen' 
  },
  reactions: [
    {
      emoji: { type: String, required: true },
      user: { type: String, required: true }
    }
  ],
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});


const Message = mongoose.model('Message', messageSchema);


module.exports = Message;