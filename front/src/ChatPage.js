import React, { useState, useRef } from 'react';
import { Navbar, Container, Button, Offcanvas, Form, InputGroup } from 'react-bootstrap';
import UserList from './components/UserList';
import MessageItem from './components/MessageItem';
import { PeopleFill, Paperclip } from 'react-bootstrap-icons';

function ChatPage({ username, room, socket, users, messages, typingUsers, handleSendMessage, handleInputChange, handleFileUpload, messagesEndRef }) {
  const [showUsers, setShowUsers] = useState(false);
  const fileInputRef = useRef(null);

  const handleClose = () => setShowUsers(false);
  const handleShow = () => setShowUsers(true);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="d-flex flex-column h-100 card shadow-sm">
      <Navbar bg="light" expand="lg" className="border-bottom chat-navbar">
        <Container fluid>
          <Button variant="outline-secondary" onClick={handleShow}>
            <PeopleFill size={20} />
            <span className="ms-2">Users ({users.length})</span>
          </Button>
          <Navbar.Brand className="mx-auto fw-bold">Room: {room}</Navbar.Brand>
        </Container>
      </Navbar>

      <Offcanvas show={showUsers} onHide={handleClose}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Users in Room</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <UserList users={users} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="p-3 flex-grow-1" style={{ overflowY: 'auto' }}>
        {messages.map((msg) => (
          <MessageItem 
            key={msg._id} 
            msg={msg} 
            currentUser={username} 
            socket={socket} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="bg-light border-top p-3">
        <div style={{ height: '24px' }} className="text-muted fst-italic mb-1">
          {typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}
        </div>
        <Form onSubmit={handleSendMessage}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Type a message..."
              onChange={handleInputChange}
              autoComplete="off"
            />
            <Button variant="outline-secondary" onClick={handleUploadClick}>
              <Paperclip size={20} />
            </Button>
            <Button variant="primary" type="submit">Send</Button>
            <Form.Control 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
            />
          </InputGroup>
        </Form>
      </div>
    </div>
  );
}

export default ChatPage;