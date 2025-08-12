// models/message.js

const mongoose = require('mongoose');

// Define the Schema (the blueprint) for a chat message
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
    status: {
    type: String,
    
    default: 'seen' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Create the Mongoose Model from the Schema
const Message = mongoose.model('Message', messageSchema);

// Export the model so it can be used in other parts of our application
module.exports = Message;