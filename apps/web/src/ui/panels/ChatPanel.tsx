import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import './ChatPanel.css';

export const ChatPanel: React.FC = () => {
  const { chatMessages, toggleChat } = useGameStore();
  const [message, setMessage] = useState('');
  const { position, isDragging, handleMouseDown } = useDraggablePanel();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    gameSocket.emit('chat:send', {
      message: message.trim(),
      channel: 'zone',
    });
    setMessage('');
  };

  return (
    <div
      className="chat-panel ui-panel"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="chat-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Chat</span>
        <button className="close-btn" onClick={toggleChat}>
          &times;
        </button>
      </div>
      <div className="chat-messages">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`chat-message channel-${msg.channel}`}>
            <span className="chat-sender">{msg.senderName}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};
