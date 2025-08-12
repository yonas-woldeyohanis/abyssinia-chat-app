// front/src/components/MessageItem.js (Corrected Hybrid Version)

import React, { useEffect } from 'react';
import { ListGroup } from 'react-bootstrap';
import { Check, CheckAll } from 'react-bootstrap-icons';

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// We now need the 'socket' prop again to send the 'seen' event
function MessageItem({ msg, currentUser, socket }) {

  // THIS useEffect IS NOW CRITICAL. It tells the server when a message is viewed.
  useEffect(() => {
    // Ensure all data is available before running
    if (!msg || !msg._id || !socket || !currentUser) return;

    const isMyMessage = msg.author === currentUser;
    const isAlreadySeen = msg.status === 'seen';

    // If this is a message from someone else, and it's not already 'seen',
    // then tell the server we have now seen it.
    if (!isMyMessage && !isAlreadySeen) {
      socket.emit('message_seen', msg._id);
    }
    // We only want this effect to run when the message content itself changes.
  }, [msg, currentUser, socket]);

  const renderMessageStatus = () => {
    if (msg.author !== currentUser) return null;
    if (msg.status === 'seen') {
      return <CheckAll key="seen" color="skyblue" size={18} className="ms-2" />;
    }
    return <Check key="sent" size={18} className="ms-2" />;
  };

  if (msg.author === 'System') {
    return (
      <ListGroup.Item className="border-0 text-center text-muted fst-italic py-1">
        {msg.text}
      </ListGroup.Item>
    );
  }

  const isMyMessage = msg.author === currentUser;

  return (
    <ListGroup.Item className="border-0 d-flex flex-column py-1">
      <div className={`d-flex ${isMyMessage ? 'justify-content-end' : 'justify-content-start'}`}>
        <div 
          className={`p-2 rounded ${isMyMessage ? 'bg-primary text-white' : 'bg-light text-dark'}`}
          style={{ maxWidth: '70%' }}
        >
          {!isMyMessage && <div className="fw-bold small">{msg.author}</div>}
          <div className="d-flex align-items-end">
            <span className="me-2">{msg.text}</span>
            <div className="text-nowrap" style={{ fontSize: '0.7rem', opacity: '0.7' }}>
              {formatTimestamp(msg.timestamp)}
              {isMyMessage && renderMessageStatus()}
            </div>
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
}

export default MessageItem;