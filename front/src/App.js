import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import ChatPage from './ChatPage';

import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

function App() {
  const [hasJoined, setHasJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [otherUser, setOtherUser] = useState('');
  
  
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  
  useEffect(() => {
    socket.on('chat_history', (history) => setMessages(history));
    socket.on('chat message', (msg) => setMessages((prev) => [...prev, msg]));
    socket.on('room_users', (users) => setUsersInRoom(users));
    socket.on('typing_start', (user) => setTypingUsers((prev) => [...new Set([...prev, user])]));
    socket.on('typing_stop', (user) => setTypingUsers((prev) => prev.filter((u) => u !== user)));
    socket.on('message_updated', (updatedMessage) => {
      setMessages((prevMessages) => 
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
    });

    return () => {
      socket.off('chat_history');
      socket.off('chat message');
      socket.off('room_users');
      socket.off('typing_start');
      socket.off('typing_stop');
      socket.off('message_updated');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


 
  const handleJoinChat = (e) => {
    e.preventDefault();
    setError(''); 

    
    if (username.trim().toLowerCase() === otherUser.trim().toLowerCase()) {
      setError('Your name and the other user\'s name cannot be the same.');
      return; 
    }

    
    if (username.trim().length < 2 || otherUser.trim().length < 2) {
      setError('Both names must be at least 2 characters long.');
      return; 
    }

    
    const generatedRoomID = [username, otherUser].sort().join('-');
    setRoom(generatedRoomID);
    socket.emit('join_room', { username, room: generatedRoomID });
    setHasJoined(true);
  };


  const handleSendMessage = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const messageInput = form.elements[0];
    if (messageInput.value.trim() && username) {
      const msgObject = { room, author: username, text: messageInput.value };
      socket.emit('chat message', msgObject);
      messageInput.value = '';
    }
  };

  const handleInputChange = (e) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_start', { room, username });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { room, username });
    }, 2000);
  };

  return (
    <Container fluid className="vh-100 d-flex flex-column p-0">
      {hasJoined ? (
        <ChatPage
          socket={socket}
          username={username}
          room={room}
          users={usersInRoom}
          messages={messages}
          typingUsers={typingUsers}
          handleSendMessage={handleSendMessage}
          handleInputChange={handleInputChange}
          messagesEndRef={messagesEndRef}
        />
      ) : (
        <Row className="justify-content-center align-items-center flex-grow-1">
          <Col md={4}>
            <Card>
              <Card.Body>
                <Card.Title as="h2" className="text-center mb-4">Start a Conversation</Card.Title>
                <Form onSubmit={handleJoinChat}>
                  <Form.Group className="mb-3">
                    <Form.Label>Your Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter your name..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Chat with (Their Name)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter their name..."
                      value={otherUser}
                      onChange={(e) => setOtherUser(e.target.value)}
                      required
                    />
                  </Form.Group>
                  
               
                  {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

                  <div className="d-grid mt-3">
                    <Button variant="primary" type="submit">Start Chat</Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  ); 
}

export default App;