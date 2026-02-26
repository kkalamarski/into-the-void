import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, CHAT_CHANNELS, CHANNEL_CONFIG, formatChatTimestamp } from '../../store/chatStore';
import { useGameStore } from '../../store/gameStore';
import './ChatPanel.css';

export const ChatPanel: React.FC = () => {
  const { messages, activeChannel, unreadCounts, whisperTarget, switchChannel, setWhisperTarget, sendMessage } = useChatStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive on active channel
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[activeChannel]]);

  const handleInputFocus = () => {
    const worldScene = useGameStore.getState().game?.getWorldScene();
    worldScene?.setKeyboardEnabled(false);
  };

  const handleInputBlur = () => {
    const worldScene = useGameStore.getState().game?.getWorldScene();
    worldScene?.setKeyboardEnabled(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const activeMessages = messages[activeChannel];

  return (
    <div className="chat-panel">
      {/* Channel tabs */}
      <div className="chat-tabs">
        {CHAT_CHANNELS.map((ch) => (
          <button
            key={ch}
            className={`chat-tab ${ch === activeChannel ? 'chat-tab--active' : ''}`}
            style={{
              borderBottomColor: ch === activeChannel ? CHANNEL_CONFIG[ch].color : 'transparent',
            }}
            onClick={() => switchChannel(ch)}
          >
            {CHANNEL_CONFIG[ch].label}
            {unreadCounts[ch] > 0 && (
              <span className="chat-tab-badge">{unreadCounts[ch] > 99 ? '99+' : unreadCounts[ch]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Whisper target input (only shown on whisper tab) */}
      {activeChannel === 'whisper' && (
        <div className="chat-whisper-target">
          <label>To:</label>
          <input
            type="text"
            value={whisperTarget}
            onChange={(e) => setWhisperTarget(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Player name..."
            className="chat-whisper-input"
          />
        </div>
      )}

      {/* Message list */}
      <div className="chat-messages">
        {activeMessages.map((msg) => (
          <div key={msg.id} className={`chat-message channel-${msg.channel}`}>
            <span className="chat-timestamp">{formatChatTimestamp(msg.timestamp)}</span>
            <span className="chat-sender">{msg.senderName}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={`Message (${CHANNEL_CONFIG[activeChannel].label})...`}
          maxLength={280}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};
