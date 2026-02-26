import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useAudioStore } from '../../store/audioStore';
import { useUiSettingsStore } from '../../store/uiSettingsStore';
import { useModalStack } from '../../hooks/useModalStack';
import { gameSocket } from '../../network/socket';
import './GameMenu.css';

interface GameMenuProps {
  onClose: () => void;
}

type Tab = 'settings' | 'about';

type AudioChannel = 'master' | 'music' | 'effects' | 'ambient';

export function GameMenu({ onClose }: GameMenuProps) {
  const navigate = useNavigate();
  useModalStack('game-menu', onClose);
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [confirming, setConfirming] = useState(false);

  const { master, music, effects, ambient, setMaster, setMusic, setEffects, setAmbient } =
    useAudioStore();
  const { showSecondaryBar, setShowSecondaryBar } = useUiSettingsStore();

  // Track pre-mute values per channel
  const savedValues = useRef<Partial<Record<AudioChannel, number>>>({});

  function isMuted(channel: AudioChannel): boolean {
    const value = { master, music, effects, ambient }[channel];
    return value === 0 && savedValues.current[channel] !== undefined;
  }

  function toggleMute(channel: AudioChannel) {
    const setters: Record<AudioChannel, (v: number) => void> = {
      master: setMaster,
      music: setMusic,
      effects: setEffects,
      ambient: setAmbient,
    };
    const current = { master, music, effects, ambient }[channel];
    const setter = setters[channel];

    if (current === 0 && savedValues.current[channel] !== undefined) {
      // Unmute: restore saved value
      setter(savedValues.current[channel]!);
      delete savedValues.current[channel];
    } else {
      // Mute: save current and set to 0
      savedValues.current[channel] = current > 0 ? current : 0.7;
      setter(0);
    }
  }

  function handleLeaveConfirm() {
    gameSocket.disconnect();
    navigate('/character-select');
  }

  const sliders: { channel: AudioChannel; label: string; value: number; setter: (v: number) => void }[] = [
    { channel: 'master', label: 'Master', value: master, setter: setMaster },
    { channel: 'music', label: 'Music', value: music, setter: setMusic },
    { channel: 'effects', label: 'Effects', value: effects, setter: setEffects },
    { channel: 'ambient', label: 'Ambient', value: ambient, setter: setAmbient },
  ];

  const content = (
    <div className="game-menu-backdrop" onClick={onClose}>
      <div className="game-menu-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="game-menu-header">
          <h2 className="game-menu-title">Menu</h2>
          <button className="game-menu-close" onClick={onClose} aria-label="Close menu">
            &#x2715;
          </button>
        </div>

        {/* Tabs */}
        <div className="game-menu-tabs">
          <button
            className={`game-menu-tab${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`game-menu-tab${activeTab === 'about' ? ' active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>

        {/* Tab Content */}
        <div className="game-menu-content">
          {activeTab === 'settings' && (
            <>
              {/* Audio Section */}
              <section className="game-menu-section">
                <h3 className="game-menu-section-title">Audio</h3>
                {sliders.map(({ channel, label, value, setter }) => (
                  <div key={channel} className="game-menu-slider-row">
                    <label className="game-menu-slider-label">{label}</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="game-menu-slider"
                    />
                    <button
                      className={`game-menu-mute-btn${isMuted(channel) ? ' muted' : ''}`}
                      onClick={() => toggleMute(channel)}
                      aria-label={isMuted(channel) ? `Unmute ${label}` : `Mute ${label}`}
                    >
                      {isMuted(channel) ? (
                        // Muted speaker icon
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        // Speaker icon
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </section>

              {/* Interface Section */}
              <section className="game-menu-section">
                <h3 className="game-menu-section-title">Interface</h3>
                <div className="game-menu-toggle-row">
                  <label className="game-menu-toggle-label" htmlFor="secondary-bar-toggle">
                    Secondary Action Bar
                  </label>
                  <label className="game-menu-toggle-switch">
                    <input
                      id="secondary-bar-toggle"
                      type="checkbox"
                      checked={showSecondaryBar}
                      onChange={(e) => setShowSecondaryBar(e.target.checked)}
                    />
                    <span className="game-menu-toggle-slider" />
                  </label>
                </div>
              </section>
            </>
          )}

          {activeTab === 'about' && (
            <section className="game-menu-section game-menu-about">
              <h3 className="game-menu-about-title">Into the Void</h3>
              <p className="game-menu-about-version">v1.21</p>
              <p className="game-menu-about-desc">A multiplayer 2D sci-fi survival MMO</p>
              <div className="game-menu-about-factions">
                <p className="game-menu-about-factions-title">Factions</p>
                <ul>
                  <li>Verdant Dynamics</li>
                  <li>Helix Extraction</li>
                  <li>Nexus Frontiers</li>
                  <li>Unaffiliated</li>
                </ul>
              </div>
              <p className="game-menu-about-credits">
                Explore zones, engage in combat, and survive in a procedurally generated universe.
              </p>
            </section>
          )}
        </div>

        {/* Leave Game — always visible */}
        <div className="game-menu-footer">
          {confirming ? (
            <div className="game-menu-confirm">
              <span className="game-menu-confirm-text">Are you sure you want to leave?</span>
              <div className="game-menu-confirm-actions">
                <button className="game-menu-btn-cancel" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
                <button className="game-menu-btn-leave-confirm" onClick={handleLeaveConfirm}>
                  Leave
                </button>
              </div>
            </div>
          ) : (
            <button className="game-menu-btn-leave" onClick={() => setConfirming(true)}>
              Leave Game
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
