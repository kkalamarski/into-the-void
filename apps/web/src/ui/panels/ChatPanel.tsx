import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, CHAT_CHANNELS, CHANNEL_CONFIG, formatChatTimestamp } from '../../store/chatStore';
import type { ChatMessage } from '@into-the-void/shared-types';
import { useModerationStore } from '../../store/moderationStore';
import { useGameStore } from '../../store/gameStore';
import './ChatPanel.css';

export const ChatPanel: React.FC = () => {
  const { messages, activeChannel, unreadCounts, whisperTarget, switchChannel, setWhisperTarget, sendMessage } = useChatStore();
  const { mutedIds, blockedIds, addMute, removeMute, addBlock, removeBlock } = useModerationStore();
  const currentPlayerId = useGameStore((s) => s.player?.id);
  const [inputValue, setInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    senderId: string;
    senderName: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive on active channel
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[activeChannel]]);

  // Dismiss context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  const handleSenderContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    // Don't show context menu for system messages or own messages
    if (msg.channel === 'system' || msg.senderId === currentPlayerId) return;

    // Position relative to chat panel
    const panelRect = (e.currentTarget as HTMLElement).closest('.chat-panel')?.getBoundingClientRect();
    const x = panelRect ? e.clientX - panelRect.left : e.clientX;
    const y = panelRect ? e.clientY - panelRect.top : e.clientY;

    setContextMenu({ x, y, senderId: msg.senderId, senderName: msg.senderName });
  };

  const handleMuteToggle = async () => {
    if (!contextMenu) return;
    if (mutedIds.has(contextMenu.senderId)) {
      await removeMute(contextMenu.senderId);
    } else {
      await addMute(contextMenu.senderId);
    }
    setContextMenu(null);
  };

  const handleBlockToggle = async () => {
    if (!contextMenu) return;
    if (blockedIds.has(contextMenu.senderId)) {
      await removeBlock(contextMenu.senderId);
    } else {
      await addBlock(contextMenu.senderId);
    }
    setContextMenu(null);
  };

  const handleWhisperTo = () => {
    if (!contextMenu) return;
    setWhisperTarget(contextMenu.senderName);
    switchChannel('whisper');
    setContextMenu(null);
  };

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
            <span
              className="chat-sender"
              onContextMenu={(e) => handleSenderContextMenu(e, msg)}
              style={{ cursor: msg.channel !== 'system' && msg.senderId !== currentPlayerId ? 'context-menu' : 'default' }}
            >
              {msg.senderName}:
            </span>
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

      {/* Right-click context menu for sender names */}
      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleWhisperTo}>Whisper</button>
          <button onClick={handleMuteToggle}>
            {mutedIds.has(contextMenu.senderId) ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={handleBlockToggle}>
            {blockedIds.has(contextMenu.senderId) ? 'Unblock' : 'Block'}
          </button>
        </div>
      )}
    </div>
  );
};
