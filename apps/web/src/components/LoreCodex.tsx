import { useCallback, useEffect } from 'react';
import { useLoreStore, handleLoreHotkey } from '../store/loreStore';
import { useModalStack } from '../hooks/useModalStack';
import { LoreRegistry } from '@into-the-void/lore';
import { LORE_CATEGORIES, type LoreCategory } from '@into-the-void/shared-types';
import './LoreCodex.css';

const CATEGORY_LABELS: Record<LoreCategory | 'all', string> = {
  all: 'All Entries',
  world_history: 'World History',
  faction_lore: 'Faction Lore',
  ancient_tech: 'Ancient Technology',
  biome_ecology: 'Biome Ecology',
};

interface LoreCodexContentProps {
  onClose: () => void;
}

function LoreCodexContent({ onClose }: LoreCodexContentProps) {
  const {
    collectedLore, selectedCategory,
    setSelectedCategory, selectedLoreId, setSelectedLore, markAsRead, getUnreadCount,
  } = useLoreStore();

  useModalStack('lore-codex', onClose);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleFragmentClick = useCallback((loreId: string, isRead: boolean) => {
    setSelectedLore(loreId);
    if (!isRead) markAsRead(loreId);
  }, [setSelectedLore, markAsRead]);

  const filteredLore = collectedLore.filter((entry) => {
    if (selectedCategory === 'all') return true;
    const fragment = LoreRegistry.get(entry.loreId);
    return fragment?.category === selectedCategory;
  });

  const selectedFragment = selectedLoreId ? LoreRegistry.get(selectedLoreId) : null;

  return (
    <div className="lore-codex-overlay" onClick={handleBackdropClick}>
      <div className="lore-codex-modal">
        <div className="lore-codex-header">
          <h2>Codex</h2>
          <span className="lore-unread-badge">{getUnreadCount()} unread</span>
          <button className="lore-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="lore-codex-content">
          <div className="lore-category-tabs">
            {(['all', ...LORE_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                className={`lore-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="lore-split-view">
            <div className="lore-fragment-list">
              {filteredLore.length === 0 ? (
                <div className="lore-empty">No lore fragments collected yet.</div>
              ) : (
                filteredLore.map((entry) => {
                  const fragment = LoreRegistry.get(entry.loreId);
                  if (!fragment) return null;
                  return (
                    <div
                      key={entry.loreId}
                      className={`lore-fragment-item ${entry.isRead ? 'read' : 'unread'} ${selectedLoreId === entry.loreId ? 'selected' : ''}`}
                      onClick={() => handleFragmentClick(entry.loreId, entry.isRead)}
                    >
                      <span className="lore-fragment-title">{fragment.title}</span>
                      {!entry.isRead && <span className="lore-new-badge">NEW</span>}
                    </div>
                  );
                })
              )}
            </div>
            <div className="lore-fragment-reader">
              {selectedFragment ? (
                <>
                  <h3>{selectedFragment.title}</h3>
                  <span className="lore-category-tag">{CATEGORY_LABELS[selectedFragment.category]}</span>
                  <div className="lore-fragment-content">
                    {selectedFragment.content.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
                  </div>
                </>
              ) : (
                <div className="lore-reader-placeholder">Select a lore fragment to read.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoreCodex() {
  const { isCodexOpen, toggleCodex } = useLoreStore();

  useEffect(() => {
    window.addEventListener('keydown', handleLoreHotkey);
    return () => window.removeEventListener('keydown', handleLoreHotkey);
  }, []);

  if (!isCodexOpen) return null;

  return <LoreCodexContent onClose={toggleCodex} />;
}
