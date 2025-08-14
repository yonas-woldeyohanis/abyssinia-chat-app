import React, { useEffect } from 'react';
import { ListGroup, OverlayTrigger, Popover, Badge, Button } from 'react-bootstrap';
import { Check, CheckAll, EmojiSmile, FileEarmarkTextFill, ImageFill } from 'react-bootstrap-icons';
import EmojiPicker from 'emoji-picker-react';
import './MessageItem.css';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Reactions = ({ reactions, currentUser, socket, messageId }) => {
  if (!reactions || reactions.length === 0) return null;
  const handleReactionClick = (emoji) => {
    const userMadeThisReaction = reactions.some((r) => r.emoji === emoji && r.user === currentUser);
    if (userMadeThisReaction) {
      socket.emit('message_reacted', { messageId, reaction: { emoji, user: currentUser } });
    }
  };
  const reactionSummary = reactions.reduce((summary, reaction) => {
    summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
    return summary;
  }, {});
  return (
    <div className="d-flex gap-1 mt-1">
      {Object.entries(reactionSummary).map(([emoji, count]) => (
        <Badge pill bg="secondary" text="white" key={emoji} className="d-flex align-items-center" onClick={() => handleReactionClick(emoji)} style={{ cursor: 'pointer' }}>
          {emoji} <span className="ms-1">{count}</span>
        </Badge>
      ))}
    </div>
  );
};

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const FileAttachment = ({ msg, isMyMessage }) => {
  const isImage = msg.type === 'image';
  const textColor = isMyMessage ? 'text-white' : 'text-dark';
  const mutedColor = isMyMessage ? 'text-white-50' : 'text-muted';

  return (
    <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer" className="text-decoration-none d-flex align-items-center p-1">
      <div className="flex-shrink-0">
        {isImage ? 
          <ImageFill size={30} className={mutedColor} /> : 
          <FileEarmarkTextFill size={30} className={mutedColor} />
        }
      </div>
      <div className="flex-grow-1 ms-3">
        <div className={`fw-bold ${textColor} message-text-content`}>{msg.fileName || msg.text}</div>
        <div className={`small ${mutedColor}`}>{formatFileSize(msg.fileSize)}</div>
      </div>
    </a>
  );
};

const MessageContent = ({ msg, isMyMessage }) => {
  if (msg.type === 'image' || msg.type === 'file') {
    return <FileAttachment msg={msg} isMyMessage={isMyMessage} />;
  }
 return <span className="me-2 text-break">{msg.text}</span>;
};

function MessageItem({ msg, currentUser, socket }) {
  useEffect(() => {
    if (!msg || !msg._id || !socket || !currentUser) return;
    const isMyMessage = msg.author === currentUser;
    const isAlreadySeen = msg.status === 'seen';
    if (!isMyMessage && !isAlreadySeen) {
      socket.emit('message_seen', msg._id);
    }
  }, [msg, currentUser, socket]);

  const onEmojiClick = (emojiObject) => {
    if (msg && msg._id && socket) {
      const reaction = { emoji: emojiObject.emoji, user: currentUser };
      socket.emit('message_reacted', { messageId: msg._id, reaction });
    }
  };

  const renderMessageStatus = () => {
    if (msg.author !== currentUser) return null;
    if (msg.status === 'seen') {
      return <CheckAll key="seen" color="skyblue" size={18} className="ms-2" />;
    }
    return <Check key="sent" size={18} className="ms-2" />;
  };

  if (msg.author === 'System') {
    return <ListGroup.Item className="border-0 text-center text-muted fst-italic py-1">{msg.text}</ListGroup.Item>;
  }

  const isMyMessage = msg.author === currentUser;
  const emojiPickerPopover = (
    <Popover id={`popover-basic-${msg._id}`}>
      <Popover.Body style={{ padding: 0 }}>
        <EmojiPicker onEmojiClick={onEmojiClick} height={350} width="100%" />
      </Popover.Body>
    </Popover>
  );

  return (
    <ListGroup.Item className="message-list-item border-0 d-flex flex-column py-1">
      <div className={`d-flex align-items-center ${isMyMessage ? 'justify-content-end' : 'justify-content-start'}`}>
        <div className={`p-2 rounded ${isMyMessage ? 'my-message-bubble' : 'other-message-bubble'}`} style={{ maxWidth: '70%' }}>
          {!isMyMessage && <div className="fw-bold small">{msg.author}</div>}
          <div className="d-flex align-items-end">
            <MessageContent msg={msg} isMyMessage={isMyMessage} />
            <div className="text-nowrap" style={{ fontSize: '0.7rem', opacity: '0.7' }}>
              {formatTimestamp(msg.timestamp)}
              {isMyMessage && renderMessageStatus()}
            </div>
          </div>
        </div>
        <OverlayTrigger trigger="click" placement="top" overlay={emojiPickerPopover} rootClose>
          <Button variant="light" size="sm" className="reaction-button border-0 ms-1">
            <EmojiSmile />
          </Button>
        </OverlayTrigger>
      </div>
      <div className={`d-flex ${isMyMessage ? 'justify-content-end' : 'justify-content-start'}`}>
         <Reactions reactions={msg.reactions} currentUser={currentUser} socket={socket} messageId={msg._id} />
      </div>
    </ListGroup.Item>
  );
}

export default MessageItem;